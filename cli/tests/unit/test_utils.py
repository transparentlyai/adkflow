"""Tests for CLI utility functions."""

from pathlib import Path
from unittest.mock import MagicMock, patch


class TestPrintMsg:
    """Tests for print_msg function."""

    def test_print_msg_with_rich_and_style(self):
        """Test print_msg with Rich available and style provided."""
        with patch("cli.utils.HAS_RICH", True):
            mock_console = MagicMock()
            with patch("cli.utils.console", mock_console):
                from cli.utils import print_msg

                print_msg("Test message", "green")

                mock_console.print.assert_called_once_with(
                    "[green]Test message[/green]"
                )

    def test_print_msg_with_rich_no_style(self):
        """Test print_msg with Rich available but no style."""
        with patch("cli.utils.HAS_RICH", True):
            mock_console = MagicMock()
            with patch("cli.utils.console", mock_console):
                from cli.utils import print_msg

                print_msg("Test message")

                mock_console.print.assert_called_once_with("Test message")

    def test_print_msg_without_rich(self, capsys):
        """Test print_msg falls back to print when Rich unavailable."""
        with patch("cli.utils.HAS_RICH", False):
            with patch("cli.utils.console", None):
                from cli.utils import print_msg

                print_msg("Fallback message", "blue")

                captured = capsys.readouterr()
                assert "Fallback message" in captured.out


class TestPrintPanel:
    """Tests for print_panel function."""

    def test_print_panel_with_rich(self):
        """Test print_panel with Rich available."""
        with patch("cli.utils.HAS_RICH", True):
            mock_console = MagicMock()
            mock_panel_cls = MagicMock()
            mock_panel_cls.fit.return_value = "mocked_panel"
            with patch("cli.utils.console", mock_console):
                with patch("cli.utils.Panel", mock_panel_cls):
                    from cli.utils import print_panel

                    print_panel("Panel message", "bold green")

                    mock_panel_cls.fit.assert_called_once_with(
                        "Panel message", style="bold green"
                    )
                    mock_console.print.assert_called_once_with("mocked_panel")

    def test_print_panel_default_style(self):
        """Test print_panel with default style."""
        with patch("cli.utils.HAS_RICH", True):
            mock_console = MagicMock()
            mock_panel_cls = MagicMock()
            with patch("cli.utils.console", mock_console):
                with patch("cli.utils.Panel", mock_panel_cls):
                    from cli.utils import print_panel

                    print_panel("Panel message")

                    mock_panel_cls.fit.assert_called_once_with(
                        "Panel message", style="bold blue"
                    )

    def test_print_panel_without_rich(self, capsys):
        """Test print_panel falls back to simple output when Rich unavailable."""
        with patch("cli.utils.HAS_RICH", False):
            with patch("cli.utils.console", None):
                with patch("cli.utils.Panel", None):
                    from cli.utils import print_panel

                    print_panel("Fallback panel")

                    captured = capsys.readouterr()
                    assert "Fallback panel" in captured.out
                    assert "=" in captured.out  # Check for border characters


class TestGetProjectRoot:
    """Tests for get_project_root function."""

    def test_get_project_root_from_project_directory(self, tmp_path: Path):
        """Test finding project root when in project directory."""
        (tmp_path / "backend").mkdir()
        (tmp_path / "frontend").mkdir()

        with patch("cli.utils.Path.cwd", return_value=tmp_path):
            from cli.utils import get_project_root

            result = get_project_root()
            assert result == tmp_path

    def test_get_project_root_from_cli_subdirectory(self, tmp_path: Path):
        """Test finding project root when in cli subdirectory."""
        (tmp_path / "backend").mkdir()
        (tmp_path / "frontend").mkdir()
        cli_dir = tmp_path / "cli"
        cli_dir.mkdir()

        with patch("cli.utils.Path.cwd", return_value=cli_dir):
            from cli.utils import get_project_root

            result = get_project_root()
            assert result == tmp_path

    def test_get_project_root_from_nested_directory(self, tmp_path: Path):
        """Test finding project root when in nested subdirectory."""
        (tmp_path / "backend").mkdir()
        (tmp_path / "frontend").mkdir()
        nested = tmp_path / "some" / "nested" / "dir"
        nested.mkdir(parents=True)

        with patch("cli.utils.Path.cwd", return_value=nested):
            from cli.utils import get_project_root

            result = get_project_root()
            assert result == tmp_path

    def test_get_project_root_not_in_project(self, tmp_path: Path):
        """Test get_project_root returns cwd when not in project."""
        with patch("cli.utils.Path.cwd", return_value=tmp_path):
            from cli.utils import get_project_root

            result = get_project_root()
            assert result == tmp_path


class TestLoadEnv:
    """Tests for load_env function."""

    def test_load_env_with_existing_file(self, tmp_path: Path):
        """Test load_env loads .env file when it exists."""
        (tmp_path / "backend").mkdir()
        (tmp_path / "frontend").mkdir()
        env_file = tmp_path / ".env"
        env_file.write_text("TEST_VAR=test_value\n")

        with patch("cli.utils.Path.cwd", return_value=tmp_path):
            with patch("cli.utils.load_dotenv") as mock_load:
                from cli.utils import load_env

                load_env()

                mock_load.assert_called_once_with(env_file)

    def test_load_env_without_env_file(self, tmp_path: Path):
        """Test load_env handles missing .env file gracefully."""
        (tmp_path / "backend").mkdir()
        (tmp_path / "frontend").mkdir()

        with patch("cli.utils.Path.cwd", return_value=tmp_path):
            with patch("cli.utils.load_dotenv") as mock_load:
                from cli.utils import load_env

                load_env()

                mock_load.assert_not_called()


class TestHasRich:
    """Tests for Rich availability detection."""

    def test_has_rich_when_available(self):
        """Test HAS_RICH is True when rich is installed."""
        from cli.utils import HAS_RICH

        # In our test environment, rich should be available
        assert HAS_RICH is True

    def test_console_available(self):
        """Test console is not None when rich is available."""
        from cli.utils import console

        assert console is not None
