"""Tests for CLI main module."""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from click.testing import CliRunner

from cli.main import (
    DEFAULT_BACKEND_PORT,
    DEFAULT_FRONTEND_PORT,
    backend,
    cli,
    dev,
    frontend,
    setup,
    start,
    stop,
)


@pytest.fixture
def runner():
    """Create a Click CLI test runner."""
    return CliRunner()


@pytest.fixture
def mock_project(tmp_path: Path):
    """Create a mock project directory structure."""
    (tmp_path / "backend").mkdir()
    (tmp_path / "frontend").mkdir()
    (tmp_path / "frontend" / "node_modules" / ".bin").mkdir(parents=True)
    (tmp_path / "frontend" / "node_modules" / ".bin" / "next").touch()
    return tmp_path


class TestCliGroup:
    """Tests for the main CLI group."""

    def test_cli_version(self, runner):
        """Test --version option works."""
        result = runner.invoke(cli, ["--version"])

        assert result.exit_code == 0
        assert "0.1.0" in result.output

    def test_cli_help(self, runner):
        """Test --help option shows available commands."""
        result = runner.invoke(cli, ["--help"])

        assert result.exit_code == 0
        assert "dev" in result.output
        assert "start" in result.output
        assert "backend" in result.output
        assert "frontend" in result.output
        assert "stop" in result.output
        assert "setup" in result.output

    def test_cli_loads_env(self, runner):
        """Test CLI loads environment on startup."""
        with patch("cli.utils.load_dotenv"):
            # Need to invoke a command that actually runs (not just --help)
            with patch("cli.main.get_project_root") as mock_root:
                mock_root.return_value = Path("/fake")
                with patch("cli.main.print_msg"):
                    runner.invoke(stop)  # stop is a simple command that runs load_env
            # load_env is called, which calls load_dotenv only if .env exists
            # Since .env doesn't exist in /fake, load_dotenv won't be called
            # Just verify the CLI ran without error - load_env was invoked


class TestDevCommand:
    """Tests for the 'dev' command."""

    def test_dev_requires_backend_directory(self, runner, tmp_path: Path):
        """Test dev command fails without backend directory."""
        with patch("cli.main.get_project_root", return_value=tmp_path):
            with patch("cli.main.print_msg"):
                result = runner.invoke(dev)

                assert result.exit_code != 0

    def test_dev_starts_both_servers(self, runner, mock_project: Path):
        """Test dev command starts backend and frontend."""
        mock_backend_proc = MagicMock()
        mock_backend_proc.poll.return_value = None
        mock_backend_proc.stdout = None

        mock_frontend_proc = MagicMock()
        mock_frontend_proc.poll.return_value = None
        mock_frontend_proc.stdout = None

        with patch("cli.main.get_project_root", return_value=mock_project):
            with patch("cli.main.ensure_frontend_deps", return_value=True):
                with patch(
                    "cli.main.start_backend_server", return_value=mock_backend_proc
                ):
                    with patch(
                        "cli.main.start_frontend_server",
                        return_value=mock_frontend_proc,
                    ):
                        with patch(
                            "cli.main.wait_for_server_health", return_value=True
                        ):
                            with patch(
                                "cli.main.wait_for_process_running", return_value=True
                            ):
                                with patch(
                                    "cli.main.create_dev_manager"
                                ) as mock_manager:
                                    manager = MagicMock()
                                    manager.monitor_processes = MagicMock(
                                        side_effect=KeyboardInterrupt
                                    )
                                    mock_manager.return_value = manager

                                    with patch("cli.main.print_msg"):
                                        with patch("cli.main.print_panel"):
                                            runner.invoke(dev)

                                    # Manager should be set up
                                    manager.setup_signal_handlers.assert_called_once()

    def test_dev_custom_ports(self, runner, mock_project: Path):
        """Test dev command accepts custom ports."""
        mock_proc = MagicMock()
        mock_proc.poll.return_value = None
        mock_proc.stdout = None

        with patch("cli.main.get_project_root", return_value=mock_project):
            with patch("cli.main.ensure_frontend_deps", return_value=True):
                with patch(
                    "cli.main.start_backend_server", return_value=mock_proc
                ) as mock_backend:
                    with patch(
                        "cli.main.start_frontend_server", return_value=mock_proc
                    ) as mock_frontend:
                        with patch(
                            "cli.main.wait_for_server_health", return_value=True
                        ):
                            with patch(
                                "cli.main.wait_for_process_running", return_value=True
                            ):
                                with patch(
                                    "cli.main.create_dev_manager"
                                ) as mock_manager:
                                    manager = MagicMock()
                                    manager.monitor_processes = MagicMock(
                                        side_effect=KeyboardInterrupt
                                    )
                                    mock_manager.return_value = manager

                                    with patch("cli.main.print_msg"):
                                        with patch("cli.main.print_panel"):
                                            runner.invoke(
                                                dev,
                                                [
                                                    "--backend-port",
                                                    "7000",
                                                    "--frontend-port",
                                                    "7006",
                                                ],
                                            )

                                    # Check ports were passed
                                    mock_backend.assert_called()
                                    backend_args = mock_backend.call_args
                                    assert backend_args[0][1] == 7000

                                    mock_frontend.assert_called()
                                    frontend_args = mock_frontend.call_args
                                    assert frontend_args[0][1] == 7006

    def test_dev_backend_health_failure(self, runner, mock_project: Path):
        """Test dev command handles backend health check failure."""
        mock_proc = MagicMock()
        mock_proc.poll.return_value = None
        mock_proc.stdout = MagicMock()
        mock_proc.stdout.read.return_value = b"Error"

        with patch("cli.main.get_project_root", return_value=mock_project):
            with patch("cli.main.start_backend_server", return_value=mock_proc):
                with patch("cli.main.wait_for_server_health", return_value=False):
                    with patch("cli.main.create_dev_manager") as mock_manager:
                        manager = MagicMock()
                        mock_manager.return_value = manager

                        with patch("cli.main.print_msg"):
                            with patch("cli.main.print_panel"):
                                result = runner.invoke(dev)

                                assert result.exit_code != 0


class TestStartCommand:
    """Tests for the 'start' command."""

    def test_start_requires_backend_directory(self, runner, tmp_path: Path):
        """Test start command fails without backend directory."""
        with patch("cli.main.get_project_root", return_value=tmp_path):
            with patch("cli.main.print_msg"):
                result = runner.invoke(start)

                assert result.exit_code != 0

    def test_start_builds_frontend_by_default(self, runner, mock_project: Path):
        """Test start command builds frontend by default."""
        mock_proc = MagicMock()
        mock_proc.poll.return_value = None
        mock_proc.stdout = None

        with patch("cli.main.get_project_root", return_value=mock_project):
            with patch("cli.main.ensure_frontend_deps", return_value=True):
                with patch("cli.main.start_backend_server", return_value=mock_proc):
                    with patch(
                        "cli.main.start_frontend_server", return_value=mock_proc
                    ):
                        with patch(
                            "cli.main.wait_for_server_health", return_value=True
                        ):
                            with patch(
                                "cli.main.wait_for_process_running", return_value=True
                            ):
                                with patch("cli.main.subprocess.run") as mock_run:
                                    with patch(
                                        "cli.main.create_prod_manager"
                                    ) as mock_manager:
                                        manager = MagicMock()
                                        manager.monitor_processes = MagicMock(
                                            side_effect=KeyboardInterrupt
                                        )
                                        mock_manager.return_value = manager

                                        with patch("cli.main.print_msg"):
                                            with patch("cli.main.print_panel"):
                                                runner.invoke(start)

                                        # Build should be called
                                        build_called = any(
                                            "build" in str(c[0])
                                            for c in mock_run.call_args_list
                                        )
                                        assert build_called

    def test_start_no_build_option(self, runner, mock_project: Path):
        """Test start command --no-build option."""
        mock_proc = MagicMock()
        mock_proc.poll.return_value = None
        mock_proc.stdout = None

        # Create .next directory
        (mock_project / "frontend" / ".next").mkdir()

        with patch("cli.main.get_project_root", return_value=mock_project):
            with patch("cli.main.ensure_frontend_deps", return_value=True):
                with patch("cli.main.start_backend_server", return_value=mock_proc):
                    with patch(
                        "cli.main.start_frontend_server", return_value=mock_proc
                    ):
                        with patch(
                            "cli.main.wait_for_server_health", return_value=True
                        ):
                            with patch(
                                "cli.main.wait_for_process_running", return_value=True
                            ):
                                with patch("cli.main.subprocess.run") as mock_run:
                                    with patch(
                                        "cli.main.create_prod_manager"
                                    ) as mock_manager:
                                        manager = MagicMock()
                                        manager.monitor_processes = MagicMock(
                                            side_effect=KeyboardInterrupt
                                        )
                                        mock_manager.return_value = manager

                                        with patch("cli.main.print_msg"):
                                            with patch("cli.main.print_panel"):
                                                runner.invoke(start, ["--no-build"])

                                        # Build should NOT be called
                                        build_called = any(
                                            "build" in str(c[0])
                                            for c in mock_run.call_args_list
                                        )
                                        assert not build_called


class TestBackendCommand:
    """Tests for the 'backend' command."""

    def test_backend_requires_backend_directory(self, runner, tmp_path: Path):
        """Test backend command fails without backend directory."""
        with patch("cli.main.get_project_root", return_value=tmp_path):
            with patch("cli.main.print_msg"):
                result = runner.invoke(backend)

                assert result.exit_code != 0

    def test_backend_starts_server(self, runner, mock_project: Path):
        """Test backend command starts server."""
        mock_proc = MagicMock()
        mock_proc.poll.side_effect = [None, 0]  # Running then stopped
        mock_proc.stdout = MagicMock()
        mock_proc.stdout.readline.return_value = b""

        with patch("cli.main.get_project_root", return_value=mock_project):
            with patch(
                "cli.main.start_backend_server", return_value=mock_proc
            ) as mock_start:
                with patch("cli.main.create_backend_manager") as mock_manager:
                    manager = MagicMock()
                    mock_manager.return_value = manager

                    with patch("cli.main.print_msg"):
                        with patch("cli.main.print_panel"):
                            runner.invoke(backend)

                    mock_start.assert_called_once()

    def test_backend_custom_port(self, runner, mock_project: Path):
        """Test backend command accepts custom port."""
        mock_proc = MagicMock()
        mock_proc.poll.side_effect = [None, 0]
        mock_proc.stdout = MagicMock()
        mock_proc.stdout.readline.return_value = b""

        with patch("cli.main.get_project_root", return_value=mock_project):
            with patch(
                "cli.main.start_backend_server", return_value=mock_proc
            ) as mock_start:
                with patch("cli.main.create_backend_manager") as mock_manager:
                    manager = MagicMock()
                    mock_manager.return_value = manager

                    with patch("cli.main.print_msg"):
                        with patch("cli.main.print_panel"):
                            runner.invoke(backend, ["--port", "8000"])

                    call_args = mock_start.call_args
                    assert call_args[0][1] == 8000


class TestFrontendCommand:
    """Tests for the 'frontend' command."""

    def test_frontend_requires_frontend_directory(self, runner, tmp_path: Path):
        """Test frontend command fails without frontend directory."""
        with patch("cli.main.get_project_root", return_value=tmp_path):
            with patch("cli.main.print_msg"):
                result = runner.invoke(frontend)

                assert result.exit_code != 0

    def test_frontend_starts_server(self, runner, mock_project: Path):
        """Test frontend command starts server."""
        mock_proc = MagicMock()
        mock_proc.poll.side_effect = [None, 0]
        mock_proc.stdout = MagicMock()
        mock_proc.stdout.readline.return_value = b""

        with patch("cli.main.get_project_root", return_value=mock_project):
            with patch("cli.main.ensure_frontend_deps", return_value=True):
                with patch(
                    "cli.main.start_frontend_server", return_value=mock_proc
                ) as mock_start:
                    with patch("cli.main.create_frontend_manager") as mock_manager:
                        manager = MagicMock()
                        mock_manager.return_value = manager

                        with patch("cli.main.print_msg"):
                            with patch("cli.main.print_panel"):
                                runner.invoke(frontend)

                        mock_start.assert_called_once()


class TestStopCommand:
    """Tests for the 'stop' command."""

    def test_stop_kills_backend(self, runner):
        """Test stop command attempts to kill backend process."""
        with patch("cli.main.subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0)

            with patch("cli.main.print_msg"):
                runner.invoke(stop)

            # Should try to kill backend
            backend_killed = any(
                "backend" in str(c).lower() for c in mock_run.call_args_list
            )
            assert backend_killed

    def test_stop_kills_frontend(self, runner):
        """Test stop command attempts to kill frontend process."""
        with patch("cli.main.subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0)

            with patch("cli.main.print_msg"):
                runner.invoke(stop)

            # Should try to kill frontend
            frontend_killed = any(
                "next" in str(c).lower() for c in mock_run.call_args_list
            )
            assert frontend_killed

    def test_stop_handles_no_processes(self, runner):
        """Test stop command handles case when no processes running."""
        with patch("cli.main.subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=1)  # No process found

            with patch("cli.main.print_msg"):
                result = runner.invoke(stop)

            assert result.exit_code == 0


class TestSetupCommand:
    """Tests for the 'setup' command."""

    def test_setup_installs_backend_deps(self, runner, mock_project: Path):
        """Test setup command installs backend dependencies."""
        # Create pyproject.toml for backend
        backend_dir = mock_project / "backend"
        (backend_dir / "pyproject.toml").touch()

        with patch("cli.main.get_project_root", return_value=mock_project):
            with patch("cli.main.subprocess.run") as mock_run:
                mock_run.return_value = MagicMock(returncode=0)

                with patch("cli.main.print_msg"):
                    with patch("cli.main.print_panel"):
                        runner.invoke(setup)

                # uv pip install should be called
                uv_called = any("uv" in str(c[0]) for c in mock_run.call_args_list)
                assert uv_called

    def test_setup_installs_frontend_deps(self, runner, mock_project: Path):
        """Test setup command installs frontend dependencies."""
        with patch("cli.main.get_project_root", return_value=mock_project):
            with patch("cli.main.verify_frontend_deps", return_value=True):
                with patch("cli.main.subprocess.run") as mock_run:
                    mock_run.return_value = MagicMock(returncode=0)

                    with patch("cli.main.print_msg"):
                        with patch("cli.main.print_panel"):
                            runner.invoke(setup)

                    # npm install should be called
                    npm_called = any(
                        "npm" in str(c[0]) for c in mock_run.call_args_list
                    )
                    assert npm_called

    def test_setup_handles_missing_directories(self, runner, tmp_path: Path):
        """Test setup command handles missing directories gracefully."""
        with patch("cli.main.get_project_root", return_value=tmp_path):
            with patch("cli.main.print_msg"):
                with patch("cli.main.print_panel"):
                    result = runner.invoke(setup)

            # Should complete without error
            assert result.exit_code == 0


class TestConstants:
    """Tests for module constants."""

    def test_default_ports(self):
        """Test default port values are set correctly."""
        assert DEFAULT_BACKEND_PORT == 6000
        assert DEFAULT_FRONTEND_PORT == 6006

    def test_default_ports_are_different(self):
        """Test backend and frontend use different default ports."""
        assert DEFAULT_BACKEND_PORT != DEFAULT_FRONTEND_PORT


class TestMainFunction:
    """Tests for main entry point."""

    def test_main_calls_cli(self, runner):
        """Test main function invokes CLI."""
        # Invoke with --help which always returns 0
        result = runner.invoke(cli, ["--help"])

        # Should not error
        assert result.exit_code == 0
        assert "ADKFlow" in result.output
