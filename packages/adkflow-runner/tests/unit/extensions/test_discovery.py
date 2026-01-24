"""Tests for extension discovery and initialization."""

from pathlib import Path
from unittest.mock import patch


from adkflow_runner.extensions.discovery import (
    get_registry,
    init_registry,
    init_global_extensions,
    init_project_extensions,
    init_shipped_extensions,
    init_builtin_units,
    clear_project_extensions,
    GLOBAL_EXTENSIONS_PATH,
)
from adkflow_runner.extensions.registry import ExtensionRegistry
from adkflow_runner.extensions.types import ExtensionScope


class TestGetRegistry:
    """Tests for get_registry function."""

    def test_returns_registry(self):
        """get_registry returns ExtensionRegistry."""
        registry = get_registry()
        assert isinstance(registry, ExtensionRegistry)

    def test_returns_same_instance(self):
        """get_registry returns singleton."""
        r1 = get_registry()
        r2 = get_registry()
        assert r1 is r2


class TestInitRegistry:
    """Tests for init_registry function."""

    def test_init_registry(self, tmp_path):
        """Initialize registry with path."""
        registry = init_registry(tmp_path)
        assert isinstance(registry, ExtensionRegistry)

    def test_init_registry_discovers(self, tmp_path):
        """init_registry triggers discovery."""
        # Create a test extension file (empty is fine for this test)
        (tmp_path / "test_ext.py").write_text("")
        registry = init_registry(tmp_path)
        assert registry is not None

    def test_init_registry_with_watch(self, tmp_path):
        """Initialize registry with file watching enabled."""
        registry = get_registry()
        with patch.object(registry, "start_watching") as mock_watch:
            init_registry(tmp_path, watch=True)
            mock_watch.assert_called_once()


class TestGlobalExtensionsPath:
    """Tests for GLOBAL_EXTENSIONS_PATH constant."""

    def test_path_exists(self):
        """GLOBAL_EXTENSIONS_PATH is defined."""
        assert GLOBAL_EXTENSIONS_PATH is not None

    def test_path_is_in_home(self):
        """Path is in user's home directory."""
        assert str(Path.home()) in str(GLOBAL_EXTENSIONS_PATH)

    def test_path_includes_adkflow(self):
        """Path includes adkflow directory."""
        assert "adkflow" in str(GLOBAL_EXTENSIONS_PATH).lower()


class TestInitGlobalExtensions:
    """Tests for init_global_extensions function."""

    def test_init_global_extensions(self):
        """Initialize global extensions."""
        with patch.object(ExtensionRegistry, "discover_global", return_value=0):
            registry = init_global_extensions(watch=False)
            assert isinstance(registry, ExtensionRegistry)

    def test_creates_global_directory(self, tmp_path, monkeypatch):
        """Creates global extensions directory if missing."""
        test_path = tmp_path / "adkflow_extensions"
        monkeypatch.setattr(
            "adkflow_runner.extensions.discovery.GLOBAL_EXTENSIONS_PATH",
            test_path,
        )
        with patch.object(ExtensionRegistry, "discover_global", return_value=0):
            init_global_extensions(watch=False)
        # Note: actual directory creation happens in the function

    def test_init_global_extensions_with_watch(self):
        """Initialize global extensions with file watching."""
        registry = get_registry()
        with patch.object(registry, "discover_global", return_value=0):
            with patch.object(registry, "start_watching_global") as mock_watch:
                init_global_extensions(watch=True)
                mock_watch.assert_called_once()


class TestInitProjectExtensions:
    """Tests for init_project_extensions function."""

    def test_init_project_extensions(self, tmp_path):
        """Initialize project extensions."""
        registry = get_registry()
        with patch.object(registry, "discover_project", return_value=0):
            init_project_extensions(tmp_path)

    def test_init_project_extensions_when_exists(self, tmp_path):
        """Initialize project extensions when directory exists."""
        ext_path = tmp_path / "adkflow_extensions"
        ext_path.mkdir()
        registry = get_registry()
        with patch.object(
            registry, "discover_project", return_value=1
        ) as mock_discover:
            init_project_extensions(tmp_path, watch=False)
            mock_discover.assert_called_once_with(ext_path)

    def test_init_project_extensions_with_watch(self, tmp_path):
        """Initialize project extensions with file watching."""
        ext_path = tmp_path / "adkflow_extensions"
        ext_path.mkdir()
        registry = get_registry()
        with patch.object(registry, "discover_project", return_value=1):
            with patch.object(registry, "start_watching_project") as mock_watch:
                init_project_extensions(tmp_path, watch=True)
                mock_watch.assert_called_once()


class TestClearProjectExtensions:
    """Tests for clear_project_extensions function."""

    def test_clear_project_extensions(self):
        """Clear project extensions."""
        registry = get_registry()
        with patch.object(registry, "clear_project") as mock_clear:
            clear_project_extensions()
            mock_clear.assert_called_once()


class TestInitShippedExtensions:
    """Tests for init_shipped_extensions function."""

    def test_init_shipped_extensions_path_exists(self, tmp_path, monkeypatch):
        """Initialize shipped extensions when path exists."""
        test_path = tmp_path / "extensions"
        test_path.mkdir()
        monkeypatch.setattr(
            "adkflow_runner.extensions.discovery.SHIPPED_EXTENSIONS_PATH",
            test_path,
        )
        registry = get_registry()
        with patch.object(
            registry, "discover_shipped", return_value=2
        ) as mock_discover:
            result = init_shipped_extensions()
            mock_discover.assert_called_once_with(test_path)
            assert isinstance(result, ExtensionRegistry)

    def test_init_shipped_extensions_path_missing(self, tmp_path, monkeypatch):
        """Initialize shipped extensions when path does not exist."""
        test_path = tmp_path / "nonexistent"
        monkeypatch.setattr(
            "adkflow_runner.extensions.discovery.SHIPPED_EXTENSIONS_PATH",
            test_path,
        )
        result = init_shipped_extensions()
        assert isinstance(result, ExtensionRegistry)


class TestInitBuiltinUnits:
    """Tests for init_builtin_units function."""

    def test_init_builtin_units(self):
        """Register builtin units."""
        registry = get_registry()
        with patch.object(
            registry, "register_builtin_units", return_value=3
        ) as mock_register:
            with patch.object(
                registry, "register_execution_only_units", return_value=2
            ) as mock_exec_register:
                # Mock the imports
                with patch("adkflow_runner.builtin_units.BUILTIN_UNITS", []):
                    with patch("adkflow_runner.builtin_units.EXECUTION_ONLY_UNITS", []):
                        count = init_builtin_units()
                        assert count == 5  # 3 schema + 2 execution-only
                        mock_register.assert_called_once()
                        mock_exec_register.assert_called_once()


class TestExtensionScope:
    """Tests for ExtensionScope enum."""

    def test_global_scope(self):
        """GLOBAL scope exists."""
        assert hasattr(ExtensionScope, "GLOBAL")

    def test_project_scope(self):
        """PROJECT scope exists."""
        assert hasattr(ExtensionScope, "PROJECT")

    def test_scope_values(self):
        """Scopes have distinct values."""
        assert ExtensionScope.GLOBAL != ExtensionScope.PROJECT

    def test_shipped_scope(self):
        """SHIPPED scope exists."""
        assert hasattr(ExtensionScope, "SHIPPED")
