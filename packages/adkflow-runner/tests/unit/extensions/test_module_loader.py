"""Tests for module_loader.py - extension package loading utilities."""

import sys
import threading
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from adkflow_runner.extensions.flow_unit import FlowUnit, UISchema
from adkflow_runner.extensions.module_loader import (
    load_extension_package,
    load_module_legacy,
)
from adkflow_runner.extensions.types import ExtensionScope


class MockFlowUnit(FlowUnit):
    """Mock FlowUnit for testing."""

    UNIT_ID = "mock_unit"
    UI_LABEL = "Mock Unit"
    MENU_LOCATION = "Test/Mock"

    @classmethod
    def execute(cls, **kwargs: Any) -> Any:
        return {}

    @classmethod
    def setup_interface(cls) -> UISchema:
        return UISchema()


@pytest.fixture
def mock_registrar() -> MagicMock:
    """Create a mock registrar that tracks registrations."""
    registrar = MagicMock()
    registrar.register_unit.return_value = True
    return registrar


@pytest.fixture
def mock_hooks_registry() -> MagicMock:
    """Create a mock hooks registry."""
    return MagicMock()


@pytest.fixture
def state_dicts() -> dict[str, Any]:
    """Create empty state dictionaries for testing."""
    return {
        "file_mtimes": {},
        "source_files": {},
        "scopes": {},
        "units": {},
        "schemas": {},
    }


@pytest.fixture
def lock() -> threading.Lock:
    """Create a threading lock for tests."""
    return threading.Lock()


class TestLoadExtensionPackage:
    """Tests for load_extension_package function."""

    def test_returns_zero_when_no_init_file(
        self,
        tmp_path: Path,
        mock_registrar: MagicMock,
        mock_hooks_registry: MagicMock,
        state_dicts: dict[str, Any],
        lock: threading.Lock,
    ) -> None:
        """Should return 0 when package directory has no __init__.py."""
        package_dir = tmp_path / "no_init_pkg"
        package_dir.mkdir()

        result = load_extension_package(
            package_dir,
            ExtensionScope.PROJECT,
            mock_registrar,
            mock_hooks_registry,
            **state_dicts,
            lock=lock,
        )

        assert result == 0
        mock_registrar.register_unit.assert_not_called()

    def test_loads_valid_package_with_flow_unit(
        self,
        tmp_path: Path,
        mock_registrar: MagicMock,
        mock_hooks_registry: MagicMock,
        state_dicts: dict[str, Any],
        lock: threading.Lock,
    ) -> None:
        """Should register FlowUnit from valid package."""
        package_dir = tmp_path / "valid_pkg"
        package_dir.mkdir()

        init_content = """
from adkflow_runner.extensions.flow_unit import FlowUnit
from typing import Any

class TestUnit(FlowUnit):
    UNIT_ID = "test_unit"
    UI_LABEL = "Test Unit"
    MENU_LOCATION = "Test/Unit"

    @classmethod
    def execute(cls, **kwargs: Any) -> Any:
        return {}

    @classmethod
    def setup_interface(cls) -> dict[str, Any]:
        return {}
"""
        (package_dir / "__init__.py").write_text(init_content)

        result = load_extension_package(
            package_dir,
            ExtensionScope.PROJECT,
            mock_registrar,
            mock_hooks_registry,
            **state_dicts,
            lock=lock,
        )

        assert result == 1
        mock_registrar.register_unit.assert_called_once()

    def test_handles_syntax_error_gracefully(
        self,
        tmp_path: Path,
        mock_registrar: MagicMock,
        mock_hooks_registry: MagicMock,
        state_dicts: dict[str, Any],
        lock: threading.Lock,
    ) -> None:
        """Should return 0 and print error on syntax error."""
        package_dir = tmp_path / "syntax_error_pkg"
        package_dir.mkdir()
        (package_dir / "__init__.py").write_text("def broken(")

        with patch("builtins.print") as mock_print:
            result = load_extension_package(
                package_dir,
                ExtensionScope.PROJECT,
                mock_registrar,
                mock_hooks_registry,
                **state_dicts,
                lock=lock,
            )

        assert result == 0
        mock_print.assert_called()
        assert "Failed to load package" in str(mock_print.call_args)

    def test_tracks_file_mtime(
        self,
        tmp_path: Path,
        mock_registrar: MagicMock,
        mock_hooks_registry: MagicMock,
        state_dicts: dict[str, Any],
        lock: threading.Lock,
    ) -> None:
        """Should track modification time of package files."""
        package_dir = tmp_path / "mtime_pkg"
        package_dir.mkdir()
        (package_dir / "__init__.py").write_text("# empty")

        load_extension_package(
            package_dir,
            ExtensionScope.PROJECT,
            mock_registrar,
            mock_hooks_registry,
            **state_dicts,
            lock=lock,
        )

        assert str(package_dir) in state_dicts["file_mtimes"]
        assert state_dicts["file_mtimes"][str(package_dir)] > 0

    def test_unregisters_existing_units_on_reload(
        self,
        tmp_path: Path,
        mock_registrar: MagicMock,
        mock_hooks_registry: MagicMock,
        lock: threading.Lock,
    ) -> None:
        """Should unregister existing units when reloading package."""
        package_dir = tmp_path / "reload_pkg"
        package_dir.mkdir()
        (package_dir / "__init__.py").write_text("# empty")

        # Pre-populate state with existing unit
        state_dicts = {
            "file_mtimes": {},
            "source_files": {"old_unit": package_dir},
            "scopes": {"old_unit": ExtensionScope.PROJECT},
            "units": {"old_unit": MockFlowUnit},
            "schemas": {"old_unit": {}},
        }

        # Simulate module already loaded
        package_name = (
            f"adkflow_ext_{package_dir.name}_{hash(str(package_dir)) & 0xFFFFFF:06x}"
        )
        sys.modules[package_name] = MagicMock()

        try:
            load_extension_package(
                package_dir,
                ExtensionScope.PROJECT,
                mock_registrar,
                mock_hooks_registry,
                **state_dicts,
                lock=lock,
            )

            # Old unit should be removed
            assert "old_unit" not in state_dicts["units"]
            assert "old_unit" not in state_dicts["schemas"]
        finally:
            # Cleanup
            sys.modules.pop(package_name, None)

    def test_discovers_hooks_from_module(
        self,
        tmp_path: Path,
        mock_registrar: MagicMock,
        mock_hooks_registry: MagicMock,
        state_dicts: dict[str, Any],
        lock: threading.Lock,
    ) -> None:
        """Should discover and register hooks from extension module."""
        package_dir = tmp_path / "hooks_pkg"
        package_dir.mkdir()
        (package_dir / "__init__.py").write_text("# empty")

        with patch(
            "adkflow_runner.extensions.module_loader.discover_hooks_from_module"
        ) as mock_discover:
            mock_discover.return_value = 2

            with patch("builtins.print") as mock_print:
                load_extension_package(
                    package_dir,
                    ExtensionScope.PROJECT,
                    mock_registrar,
                    mock_hooks_registry,
                    **state_dicts,
                    lock=lock,
                )

            mock_discover.assert_called_once()
            # Should print hooks count
            assert any(
                "Registered 2 hooks" in str(call) for call in mock_print.call_args_list
            )


class TestLoadModuleLegacy:
    """Tests for load_module_legacy function."""

    def test_returns_zero_for_invalid_file(
        self,
        tmp_path: Path,
        mock_registrar: MagicMock,
        state_dicts: dict[str, Any],
        lock: threading.Lock,
    ) -> None:
        """Should return 0 for non-existent file."""
        file_path = tmp_path / "nonexistent.py"

        result = load_module_legacy(
            file_path,
            ExtensionScope.PROJECT,
            mock_registrar,
            **state_dicts,
            lock=lock,
        )

        assert result == 0

    def test_loads_valid_module_with_flow_unit(
        self,
        tmp_path: Path,
        mock_registrar: MagicMock,
        state_dicts: dict[str, Any],
        lock: threading.Lock,
    ) -> None:
        """Should register FlowUnit from valid module file."""
        file_path = tmp_path / "valid_module.py"
        file_path.write_text("""
from adkflow_runner.extensions.flow_unit import FlowUnit
from typing import Any

class LegacyUnit(FlowUnit):
    UNIT_ID = "legacy_unit"
    UI_LABEL = "Legacy Unit"
    MENU_LOCATION = "Test/Legacy"

    @classmethod
    def execute(cls, **kwargs: Any) -> Any:
        return {}

    @classmethod
    def setup_interface(cls) -> dict[str, Any]:
        return {}
""")

        result = load_module_legacy(
            file_path,
            ExtensionScope.PROJECT,
            mock_registrar,
            **state_dicts,
            lock=lock,
        )

        assert result == 1
        mock_registrar.register_unit.assert_called_once()

    def test_handles_import_error(
        self,
        tmp_path: Path,
        mock_registrar: MagicMock,
        state_dicts: dict[str, Any],
        lock: threading.Lock,
    ) -> None:
        """Should return 0 on import error."""
        file_path = tmp_path / "import_error.py"
        file_path.write_text("import nonexistent_module_xyz")

        with patch("builtins.print"):
            result = load_module_legacy(
                file_path,
                ExtensionScope.PROJECT,
                mock_registrar,
                **state_dicts,
                lock=lock,
            )

        assert result == 0

    def test_tracks_file_mtime(
        self,
        tmp_path: Path,
        mock_registrar: MagicMock,
        state_dicts: dict[str, Any],
        lock: threading.Lock,
    ) -> None:
        """Should track file modification time."""
        file_path = tmp_path / "mtime_module.py"
        file_path.write_text("# empty")

        load_module_legacy(
            file_path,
            ExtensionScope.PROJECT,
            mock_registrar,
            **state_dicts,
            lock=lock,
        )

        assert str(file_path) in state_dicts["file_mtimes"]

    def test_unregisters_on_reload(
        self,
        tmp_path: Path,
        mock_registrar: MagicMock,
        lock: threading.Lock,
    ) -> None:
        """Should unregister existing units when reloading."""
        file_path = tmp_path / "reload_module.py"
        file_path.write_text("# empty")

        state_dicts = {
            "file_mtimes": {},
            "source_files": {"old_legacy": file_path},
            "scopes": {"old_legacy": ExtensionScope.PROJECT},
            "units": {"old_legacy": MockFlowUnit},
            "schemas": {"old_legacy": {}},
        }

        module_name = (
            f"adkflow_ext_{file_path.stem}_{hash(str(file_path)) & 0xFFFFFF:06x}"
        )
        sys.modules[module_name] = MagicMock()

        try:
            load_module_legacy(
                file_path,
                ExtensionScope.PROJECT,
                mock_registrar,
                **state_dicts,
                lock=lock,
            )

            assert "old_legacy" not in state_dicts["units"]
        finally:
            sys.modules.pop(module_name, None)

    def test_skips_flow_unit_base_class(
        self,
        tmp_path: Path,
        mock_registrar: MagicMock,
        state_dicts: dict[str, Any],
        lock: threading.Lock,
    ) -> None:
        """Should not register FlowUnit base class itself."""
        file_path = tmp_path / "base_class.py"
        file_path.write_text("""
from adkflow_runner.extensions.flow_unit import FlowUnit
# Re-export FlowUnit but no subclass
__all__ = ["FlowUnit"]
""")

        result = load_module_legacy(
            file_path,
            ExtensionScope.PROJECT,
            mock_registrar,
            **state_dicts,
            lock=lock,
        )

        assert result == 0
        mock_registrar.register_unit.assert_not_called()

    def test_skips_incomplete_flow_unit(
        self,
        tmp_path: Path,
        mock_registrar: MagicMock,
        state_dicts: dict[str, Any],
        lock: threading.Lock,
    ) -> None:
        """Should skip FlowUnit subclass missing required attributes."""
        file_path = tmp_path / "incomplete.py"
        file_path.write_text("""
from adkflow_runner.extensions.flow_unit import FlowUnit
from typing import Any

class IncompleteUnit(FlowUnit):
    UNIT_ID = "incomplete"
    # Missing UI_LABEL and MENU_LOCATION

    @classmethod
    def execute(cls, **kwargs: Any) -> Any:
        return {}
""")

        result = load_module_legacy(
            file_path,
            ExtensionScope.PROJECT,
            mock_registrar,
            **state_dicts,
            lock=lock,
        )

        assert result == 0
        mock_registrar.register_unit.assert_not_called()
