"""Extension discovery and registry for custom FlowUnit nodes."""

import importlib.util
import sys
import threading
import time
from enum import Enum
from pathlib import Path
from typing import Any

from adkflow_runner.extensions.flow_unit import (
    FlowUnit,
    UISchema,
    CollapsedDisplay,
    HandleLayout,
    AdditionalHandle,
)


class ExtensionScope(Enum):
    """Scope of an extension - where it was loaded from."""

    GLOBAL = "global"  # From ~/.adkflow/adkflow_extensions/ - available everywhere
    PROJECT = "project"  # From {project}/adkflow_extensions/ - project-specific


class ExtensionRegistry:
    """Discovers and manages FlowUnit extensions from multiple locations.

    This registry scans directories for Python files containing FlowUnit
    subclasses and maintains a registry of available custom nodes.

    Features:
    - Dual-location support: global (~/.adkflow/) and project-level
    - Automatic discovery of FlowUnit classes
    - Hot-reload support via file watching for both locations
    - JSON schema generation for frontend
    - Scope tracking with project-level precedence
    """

    def __init__(self):
        self._units: dict[str, type[FlowUnit]] = {}
        self._schemas: dict[str, dict[str, Any]] = {}
        self._source_files: dict[str, Path] = {}
        self._scopes: dict[str, ExtensionScope] = {}  # Track scope per unit

        # Dual-path support
        self._global_path: Path | None = None
        self._project_path: Path | None = None

        # File watching - separate for each location
        self._global_watch_thread: threading.Thread | None = None
        self._project_watch_thread: threading.Thread | None = None
        self._stop_global_watching: threading.Event = threading.Event()
        self._stop_project_watching: threading.Event = threading.Event()

        self._file_mtimes: dict[str, float] = {}
        self._lock = threading.RLock()

        # Legacy single-path support (for backwards compatibility)
        self._extensions_path: Path | None = None
        self._watch_thread: threading.Thread | None = None
        self._stop_watching: threading.Event = threading.Event()

    def discover(self, extensions_path: Path) -> int:
        """Scan directory for FlowUnit classes (legacy single-path).

        Args:
            extensions_path: Directory to scan for Python files

        Returns:
            Number of units discovered
        """
        self._extensions_path = extensions_path
        return self._discover_from_path(extensions_path, ExtensionScope.PROJECT)

    def discover_global(self, global_path: Path) -> int:
        """Discover extensions from global ~/.adkflow/adkflow_extensions/.

        Global extensions are available across all projects.

        Args:
            global_path: Path to global extensions directory

        Returns:
            Number of units discovered
        """
        self._global_path = global_path
        return self._discover_from_path(global_path, ExtensionScope.GLOBAL)

    def discover_project(self, project_path: Path) -> int:
        """Discover extensions from project adkflow_extensions/.

        Project extensions take precedence over global extensions
        with the same UNIT_ID.

        Args:
            project_path: Path to project extensions directory

        Returns:
            Number of units discovered
        """
        self._project_path = project_path
        return self._discover_from_path(project_path, ExtensionScope.PROJECT)

    def _discover_from_path(self, extensions_path: Path, scope: ExtensionScope) -> int:
        """Scan directory for extension packages.

        Each extension is a subdirectory containing __init__.py.
        FlowUnit classes are discovered from the package's namespace.

        Args:
            extensions_path: Directory to scan for extension packages
            scope: The scope to assign to discovered units

        Returns:
            Number of units discovered
        """
        if not extensions_path.exists():
            return 0

        count = 0
        for subdir in extensions_path.iterdir():
            # Skip non-directories
            if not subdir.is_dir():
                continue
            # Skip hidden/private directories
            if subdir.name.startswith(("_", ".")):
                continue
            # Must have __init__.py to be a package
            init_file = subdir / "__init__.py"
            if not init_file.exists():
                continue

            loaded = self._load_extension_package(subdir, scope)
            count += loaded

        return count

    def _load_extension_package(self, package_dir: Path, scope: ExtensionScope) -> int:
        """Load an extension package and register its FlowUnits.

        Each extension package is a directory containing __init__.py.
        FlowUnit classes exported by the package are discovered and registered.

        Args:
            package_dir: Directory containing __init__.py
            scope: The scope to assign to units from this package

        Returns:
            Number of units registered from this package
        """
        package_name = (
            f"adkflow_ext_{package_dir.name}_{hash(str(package_dir)) & 0xFFFFFF:06x}"
        )

        with self._lock:
            # Unregister existing units from this package
            if package_name in sys.modules:
                units_to_remove = [
                    uid
                    for uid, path in self._source_files.items()
                    if path == package_dir
                    or (
                        hasattr(path, "is_relative_to")
                        and path.is_relative_to(package_dir)
                    )
                ]
                for uid in units_to_remove:
                    self._units.pop(uid, None)
                    self._schemas.pop(uid, None)
                    self._source_files.pop(uid, None)
                    self._scopes.pop(uid, None)

                # Remove package and submodules from sys.modules
                modules_to_remove = [
                    name
                    for name in list(sys.modules.keys())
                    if name == package_name or name.startswith(f"{package_name}.")
                ]
                for name in modules_to_remove:
                    del sys.modules[name]

            try:
                # Add parent to path so internal imports work
                parent_path = str(package_dir.parent)
                if parent_path not in sys.path:
                    sys.path.insert(0, parent_path)

                # Import the package
                spec = importlib.util.spec_from_file_location(
                    package_name,
                    package_dir / "__init__.py",
                    submodule_search_locations=[str(package_dir)],
                )
                if spec is None or spec.loader is None:
                    return 0

                module = importlib.util.module_from_spec(spec)
                sys.modules[package_name] = module
                spec.loader.exec_module(module)

            except Exception as e:
                print(
                    f"[ExtensionRegistry] Failed to load package {package_dir.name}: {e}"
                )
                return 0

            # Find FlowUnit subclasses in the module's namespace
            count = 0
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if (
                    isinstance(attr, type)
                    and issubclass(attr, FlowUnit)
                    and attr is not FlowUnit
                    and hasattr(attr, "UNIT_ID")
                    and hasattr(attr, "UI_LABEL")
                    and hasattr(attr, "MENU_LOCATION")
                ):
                    if self._register_unit(attr, package_dir, scope):
                        count += 1

            # Track package mtime (use latest mtime from any .py file)
            latest_mtime = 0.0
            for py_file in package_dir.rglob("*.py"):
                mtime = py_file.stat().st_mtime
                if mtime > latest_mtime:
                    latest_mtime = mtime
            self._file_mtimes[str(package_dir)] = latest_mtime

            return count

    def _load_module(
        self, file_path: Path, scope: ExtensionScope = ExtensionScope.PROJECT
    ) -> int:
        """Load a Python module and register FlowUnits (legacy - kept for compatibility).

        Args:
            file_path: Path to Python file
            scope: The scope to assign to units from this file

        Returns:
            Number of units registered from this file
        """
        module_name = (
            f"adkflow_ext_{file_path.stem}_{hash(str(file_path)) & 0xFFFFFF:06x}"
        )

        with self._lock:
            # Remove old module if reloading
            if module_name in sys.modules:
                # Unregister units from this file
                units_to_remove = [
                    uid for uid, path in self._source_files.items() if path == file_path
                ]
                for uid in units_to_remove:
                    self._units.pop(uid, None)
                    self._schemas.pop(uid, None)
                    self._source_files.pop(uid, None)
                    self._scopes.pop(uid, None)
                del sys.modules[module_name]

            try:
                spec = importlib.util.spec_from_file_location(module_name, file_path)
                if spec is None or spec.loader is None:
                    return 0

                module = importlib.util.module_from_spec(spec)
                sys.modules[module_name] = module
                spec.loader.exec_module(module)
            except Exception as e:
                print(f"[ExtensionRegistry] Failed to load {file_path}: {e}")
                return 0

            # Find FlowUnit subclasses
            count = 0
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if (
                    isinstance(attr, type)
                    and issubclass(attr, FlowUnit)
                    and attr is not FlowUnit
                    and hasattr(attr, "UNIT_ID")
                    and hasattr(attr, "UI_LABEL")
                    and hasattr(attr, "MENU_LOCATION")
                ):
                    if self._register_unit(attr, file_path, scope):
                        count += 1

            # Track file mtime for hot-reload
            self._file_mtimes[str(file_path)] = file_path.stat().st_mtime

            return count

    def _register_unit(
        self, unit_cls: type[FlowUnit], file_path: Path, scope: ExtensionScope
    ) -> bool:
        """Register a FlowUnit and generate its schema.

        Project-level units take precedence over global units with the
        same UNIT_ID.

        Args:
            unit_cls: The FlowUnit class to register
            file_path: Path to the source file
            scope: The scope of this unit (global or project)

        Returns:
            True if the unit was registered, False if skipped due to precedence
        """
        unit_id = unit_cls.UNIT_ID

        # Check precedence: project overrides global, but not vice versa
        existing_scope = self._scopes.get(unit_id)
        if existing_scope == ExtensionScope.PROJECT and scope == ExtensionScope.GLOBAL:
            print(
                f"[ExtensionRegistry] Skipping global '{unit_id}' - project version takes precedence"
            )
            return False

        self._units[unit_id] = unit_cls
        self._source_files[unit_id] = file_path
        self._scopes[unit_id] = scope

        # Generate JSON schema for frontend
        try:
            ui_schema = unit_cls.setup_interface()
            self._schemas[unit_id] = self._generate_schema(
                unit_cls, ui_schema, file_path, scope
            )
        except Exception as e:
            print(f"[ExtensionRegistry] Failed to generate schema for {unit_id}: {e}")
            return False

        return True

    def _generate_schema(
        self,
        unit_cls: type[FlowUnit],
        ui_schema: UISchema,
        file_path: Path,
        scope: ExtensionScope,
    ) -> dict[str, Any]:
        """Generate JSON schema from FlowUnit class."""

        def port_to_dict(port):
            return {
                "id": port.id,
                "label": port.label,
                "source_type": port.source_type,
                "data_type": port.data_type,
                "accepted_sources": port.accepted_sources,
                "accepted_types": port.accepted_types,
                "required": port.required,
                "multiple": port.multiple,
                "tab": port.tab,
                "section": port.section,
                "handle_color": port.handle_color,
                "connection_only": port.connection_only,
                "widget": port.widget.value
                if port.widget and hasattr(port.widget, "value")
                else port.widget,
                "default": port.default,
                "placeholder": port.placeholder,
                "options": port.options,
                "lazy": port.lazy,
            }

        def field_to_dict(field):
            return {
                "id": field.id,
                "label": field.label,
                "widget": field.widget.value
                if hasattr(field.widget, "value")
                else str(field.widget),
                "default": field.default,
                "options": field.options,
                "min_value": field.min_value,
                "max_value": field.max_value,
                "step": field.step,
                "placeholder": field.placeholder,
                "help_text": field.help_text,
                "show_if": field.show_if,
                "tab": field.tab,
                "section": field.section,
            }

        def collapsed_display_to_dict(cd: CollapsedDisplay | None):
            if cd is None:
                return None
            return {
                "summary_fields": cd.summary_fields,
                "format": cd.format,
                "show_connections": cd.show_connections,
            }

        def handle_layout_to_dict(hl: HandleLayout | None):
            if hl is None:
                return None
            additional = None
            if hl.additional_handles:
                additional = [
                    {
                        "id": h.id,
                        "type": h.type,
                        "position": h.position,
                        "label": h.label,
                    }
                    for h in hl.additional_handles
                ]
            return {
                "input_position": hl.input_position,
                "output_position": hl.output_position,
                "additional_handles": additional,
            }

        return {
            "unit_id": unit_cls.UNIT_ID,
            "label": unit_cls.UI_LABEL,
            "menu_location": unit_cls.MENU_LOCATION,
            "description": getattr(unit_cls, "DESCRIPTION", ""),
            "version": getattr(unit_cls, "VERSION", "1.0.0"),
            "scope": scope.value,  # Include scope in schema
            "source_file": str(file_path),
            # Execution control properties
            "output_node": getattr(unit_cls, "OUTPUT_NODE", False),
            "always_execute": getattr(unit_cls, "ALWAYS_EXECUTE", False),
            "ui": {
                "inputs": [port_to_dict(p) for p in ui_schema.inputs],
                "outputs": [port_to_dict(p) for p in ui_schema.outputs],
                "fields": [field_to_dict(f) for f in ui_schema.fields],
                "color": ui_schema.color,
                "icon": ui_schema.icon,
                "expandable": ui_schema.expandable,
                "default_width": ui_schema.default_width,
                "default_height": ui_schema.default_height,
                # Layout configuration
                "layout": ui_schema.layout.value
                if hasattr(ui_schema.layout, "value")
                else ui_schema.layout,
                "theme_key": ui_schema.theme_key,
                "collapsed_display": collapsed_display_to_dict(ui_schema.collapsed_display),
                "handle_layout": handle_layout_to_dict(ui_schema.handle_layout),
            },
        }

    def start_watching(self, poll_interval: float = 1.0) -> None:
        """Start hot-reload file watcher (legacy single-path).

        Args:
            poll_interval: Seconds between file change checks
        """
        if self._watch_thread is not None:
            return

        if not self._extensions_path:
            return

        self._stop_watching.clear()
        self._watch_thread = threading.Thread(
            target=self._watch_loop,
            args=(
                poll_interval,
                self._extensions_path,
                self._stop_watching,
                ExtensionScope.PROJECT,
            ),
            daemon=True,
        )
        self._watch_thread.start()

    def start_watching_global(self, poll_interval: float = 1.0) -> None:
        """Start file watcher for global extensions.

        Args:
            poll_interval: Seconds between file change checks
        """
        if self._global_watch_thread is not None:
            return

        if not self._global_path:
            return

        self._stop_global_watching.clear()
        self._global_watch_thread = threading.Thread(
            target=self._watch_loop,
            args=(
                poll_interval,
                self._global_path,
                self._stop_global_watching,
                ExtensionScope.GLOBAL,
            ),
            daemon=True,
        )
        self._global_watch_thread.start()

    def start_watching_project(self, poll_interval: float = 1.0) -> None:
        """Start file watcher for project extensions.

        Args:
            poll_interval: Seconds between file change checks
        """
        if self._project_watch_thread is not None:
            return

        if not self._project_path:
            return

        self._stop_project_watching.clear()
        self._project_watch_thread = threading.Thread(
            target=self._watch_loop,
            args=(
                poll_interval,
                self._project_path,
                self._stop_project_watching,
                ExtensionScope.PROJECT,
            ),
            daemon=True,
        )
        self._project_watch_thread.start()

    def _watch_loop(
        self,
        poll_interval: float,
        watch_path: Path,
        stop_event: threading.Event,
        scope: ExtensionScope,
    ) -> None:
        """Background thread for watching file changes."""
        while not stop_event.is_set():
            try:
                self._check_for_changes_in_path(watch_path, scope)
            except Exception as e:
                print(f"[ExtensionRegistry] Watch error for {scope.value}: {e}")
            time.sleep(poll_interval)

    def _check_for_changes(self) -> None:
        """Check for file changes (legacy single-path)."""
        if self._extensions_path:
            self._check_for_changes_in_path(
                self._extensions_path, ExtensionScope.PROJECT
            )

    def _check_for_changes_in_path(
        self, extensions_path: Path, scope: ExtensionScope
    ) -> None:
        """Check for package changes and reload as needed."""
        if not extensions_path.exists():
            return

        for subdir in extensions_path.iterdir():
            # Skip non-directories
            if not subdir.is_dir():
                continue
            # Skip hidden/private directories
            if subdir.name.startswith(("_", ".")):
                continue
            # Must have __init__.py to be a package
            init_file = subdir / "__init__.py"
            if not init_file.exists():
                continue

            package_key = str(subdir)

            # Check any .py file in the package for changes
            latest_mtime = 0.0
            for py_file in subdir.rglob("*.py"):
                try:
                    mtime = py_file.stat().st_mtime
                    if mtime > latest_mtime:
                        latest_mtime = mtime
                except OSError:
                    continue

            if package_key not in self._file_mtimes:
                # New package
                print(f"[ExtensionRegistry] New {scope.value} extension: {subdir.name}")
                self._load_extension_package(subdir, scope)
            elif self._file_mtimes[package_key] < latest_mtime:
                # Modified package (any file changed)
                print(f"[ExtensionRegistry] Reloading {scope.value}: {subdir.name}")
                self._load_extension_package(subdir, scope)
                self._file_mtimes[package_key] = latest_mtime

    def stop_watching(self) -> None:
        """Stop all file watchers."""
        self._stop_watching.set()
        self._stop_global_watching.set()
        self._stop_project_watching.set()

        if self._watch_thread:
            self._watch_thread.join(timeout=2.0)
            self._watch_thread = None
        if self._global_watch_thread:
            self._global_watch_thread.join(timeout=2.0)
            self._global_watch_thread = None
        if self._project_watch_thread:
            self._project_watch_thread.join(timeout=2.0)
            self._project_watch_thread = None

    def stop_watching_global(self) -> None:
        """Stop global file watcher."""
        self._stop_global_watching.set()
        if self._global_watch_thread:
            self._global_watch_thread.join(timeout=2.0)
            self._global_watch_thread = None

    def stop_watching_project(self) -> None:
        """Stop project file watcher."""
        self._stop_project_watching.set()
        if self._project_watch_thread:
            self._project_watch_thread.join(timeout=2.0)
            self._project_watch_thread = None

    def get_unit(self, unit_id: str) -> type[FlowUnit] | None:
        """Get FlowUnit class by ID."""
        with self._lock:
            return self._units.get(unit_id)

    def get_schema(self, unit_id: str) -> dict[str, Any] | None:
        """Get JSON schema for a unit by ID."""
        with self._lock:
            return self._schemas.get(unit_id)

    def get_all_schemas(self) -> list[dict[str, Any]]:
        """Get all registered unit schemas."""
        with self._lock:
            return list(self._schemas.values())

    def get_scope(self, unit_id: str) -> ExtensionScope | None:
        """Get the scope of a unit by ID."""
        with self._lock:
            return self._scopes.get(unit_id)

    def get_menu_tree(self) -> dict[str, Any]:
        """Build hierarchical menu structure from menu_location paths."""
        with self._lock:
            tree: dict[str, Any] = {}
            for schema in self._schemas.values():
                parts = schema["menu_location"].split("/")
                current = tree
                for part in parts[:-1]:
                    if part not in current:
                        current[part] = {}
                    current = current[part]
                # Leaf node contains list of unit_ids
                leaf = parts[-1]
                if leaf not in current:
                    current[leaf] = []
                current[leaf].append(schema["unit_id"])
            return tree

    def reload_all(self) -> int:
        """Force reload all extensions from both locations.

        Returns:
            Number of units loaded
        """
        with self._lock:
            self._units.clear()
            self._schemas.clear()
            self._source_files.clear()
            self._scopes.clear()
            self._file_mtimes.clear()

            count = 0
            # Reload global first (project takes precedence if same unit_id)
            if self._global_path:
                count += self._discover_from_path(
                    self._global_path, ExtensionScope.GLOBAL
                )
            # Then reload project
            if self._project_path:
                count += self._discover_from_path(
                    self._project_path, ExtensionScope.PROJECT
                )
            # Legacy single-path fallback
            elif self._extensions_path:
                count += self._discover_from_path(
                    self._extensions_path, ExtensionScope.PROJECT
                )
            return count

    def reload_global(self) -> int:
        """Reload only global extensions.

        Returns:
            Number of global units loaded
        """
        if not self._global_path:
            return 0

        with self._lock:
            # Remove global units
            global_units = [
                uid
                for uid, scope in self._scopes.items()
                if scope == ExtensionScope.GLOBAL
            ]
            for uid in global_units:
                self._units.pop(uid, None)
                self._schemas.pop(uid, None)
                self._source_files.pop(uid, None)
                self._scopes.pop(uid, None)

            # Clear mtimes for global files
            global_file_keys = [
                key
                for key in self._file_mtimes.keys()
                if key.startswith(str(self._global_path))
            ]
            for key in global_file_keys:
                self._file_mtimes.pop(key, None)

            return self._discover_from_path(self._global_path, ExtensionScope.GLOBAL)

    def reload_project(self) -> int:
        """Reload only project extensions.

        Returns:
            Number of project units loaded
        """
        if not self._project_path:
            return 0

        with self._lock:
            # Remove project units
            project_units = [
                uid
                for uid, scope in self._scopes.items()
                if scope == ExtensionScope.PROJECT
            ]
            for uid in project_units:
                self._units.pop(uid, None)
                self._schemas.pop(uid, None)
                self._source_files.pop(uid, None)
                self._scopes.pop(uid, None)

            # Clear mtimes for project files
            project_file_keys = [
                key
                for key in self._file_mtimes.keys()
                if key.startswith(str(self._project_path))
            ]
            for key in project_file_keys:
                self._file_mtimes.pop(key, None)

            return self._discover_from_path(self._project_path, ExtensionScope.PROJECT)

    def clear_project(self) -> None:
        """Clear all project-level extensions.

        Use this when switching projects to remove project-specific nodes
        before loading a new project's extensions.
        """
        with self._lock:
            # Stop project watcher
            self.stop_watching_project()

            # Remove project units
            project_units = [
                uid
                for uid, scope in self._scopes.items()
                if scope == ExtensionScope.PROJECT
            ]
            for uid in project_units:
                self._units.pop(uid, None)
                self._schemas.pop(uid, None)
                self._source_files.pop(uid, None)
                self._scopes.pop(uid, None)

            # Clear mtimes for project files
            if self._project_path:
                project_file_keys = [
                    key
                    for key in self._file_mtimes.keys()
                    if key.startswith(str(self._project_path))
                ]
                for key in project_file_keys:
                    self._file_mtimes.pop(key, None)

            self._project_path = None


# Global registry instance
_registry: ExtensionRegistry | None = None
_registry_lock = threading.Lock()

# Default global extensions path
GLOBAL_EXTENSIONS_PATH = Path.home() / ".adkflow" / "adkflow_extensions"


def get_registry() -> ExtensionRegistry:
    """Get or create the global extension registry."""
    global _registry
    with _registry_lock:
        if _registry is None:
            _registry = ExtensionRegistry()
        return _registry


def init_registry(extensions_path: Path, watch: bool = False) -> ExtensionRegistry:
    """Initialize the global registry with a path (legacy single-path).

    Args:
        extensions_path: Directory containing extension Python files
        watch: Whether to enable hot-reload file watching

    Returns:
        The initialized registry
    """
    registry = get_registry()
    registry.discover(extensions_path)
    if watch:
        registry.start_watching()
    return registry


def init_global_extensions(watch: bool = True) -> ExtensionRegistry:
    """Initialize global extensions at server startup.

    Global extensions are loaded from ~/.adkflow/adkflow_extensions/
    and are available across all projects.

    Args:
        watch: Whether to enable hot-reload file watching

    Returns:
        The initialized registry
    """
    registry = get_registry()

    # Ensure global extensions directory exists
    GLOBAL_EXTENSIONS_PATH.mkdir(parents=True, exist_ok=True)

    count = registry.discover_global(GLOBAL_EXTENSIONS_PATH)
    print(
        f"[ExtensionRegistry] Loaded {count} global extension(s) from {GLOBAL_EXTENSIONS_PATH}"
    )

    if watch:
        registry.start_watching_global()

    return registry


def init_project_extensions(
    project_path: Path, watch: bool = True
) -> ExtensionRegistry:
    """Initialize project-level extensions when a project is opened.

    Project extensions are loaded from {project_path}/adkflow_extensions/
    and take precedence over global extensions with the same UNIT_ID.

    Args:
        project_path: Path to the project directory
        watch: Whether to enable hot-reload file watching

    Returns:
        The initialized registry
    """
    registry = get_registry()

    extensions_path = project_path / "adkflow_extensions"
    if extensions_path.exists():
        count = registry.discover_project(extensions_path)
        print(
            f"[ExtensionRegistry] Loaded {count} project extension(s) from {extensions_path}"
        )

        if watch:
            registry.start_watching_project()

    return registry


def clear_project_extensions() -> None:
    """Clear project-level extensions when switching projects."""
    registry = get_registry()
    registry.clear_project()
    print("[ExtensionRegistry] Cleared project extensions")
