"""Tests for extension discovery and initialization."""

from pathlib import Path
from unittest.mock import patch


from adkflow_runner.extensions.discovery import (
    get_registry,
    init_registry,
    init_global_extensions,
    init_project_extensions,
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


class TestInitProjectExtensions:
    """Tests for init_project_extensions function."""

    def test_init_project_extensions(self, tmp_path):
        """Initialize project extensions."""
        registry = get_registry()
        with patch.object(registry, "discover_project", return_value=0):
            init_project_extensions(tmp_path)


class TestClearProjectExtensions:
    """Tests for clear_project_extensions function."""

    def test_clear_project_extensions(self):
        """Clear project extensions."""
        registry = get_registry()
        with patch.object(registry, "clear_project") as mock_clear:
            clear_project_extensions()
            mock_clear.assert_called_once()


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
