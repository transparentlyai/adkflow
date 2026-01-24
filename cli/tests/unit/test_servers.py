"""Tests for CLI server management functions."""

import subprocess
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from cli.servers import start_backend_server, start_frontend_server


class TestStartBackendServer:
    """Tests for start_backend_server function."""

    def test_starts_backend_with_correct_command(self, tmp_path: Path):
        """Test backend server started with correct Python command."""
        with patch("cli.servers.subprocess.Popen") as mock_popen:
            mock_popen.return_value = MagicMock()

            start_backend_server(tmp_path, 6000)

            mock_popen.assert_called_once()
            call_args = mock_popen.call_args
            cmd = call_args[0][0]

            assert "-m" in cmd
            assert "backend.src.main" in cmd

    def test_sets_pythonpath(self, tmp_path: Path):
        """Test PYTHONPATH is set to project root."""
        with patch("cli.servers.subprocess.Popen") as mock_popen:
            mock_popen.return_value = MagicMock()

            start_backend_server(tmp_path, 6000)

            call_args = mock_popen.call_args
            env = call_args[1]["env"]

            assert env["PYTHONPATH"] == str(tmp_path)

    def test_sets_backend_port(self, tmp_path: Path):
        """Test BACKEND_PORT environment variable is set."""
        with patch("cli.servers.subprocess.Popen") as mock_popen:
            mock_popen.return_value = MagicMock()

            start_backend_server(tmp_path, 7000)

            call_args = mock_popen.call_args
            env = call_args[1]["env"]

            assert env["BACKEND_PORT"] == "7000"

    def test_dev_mode_sets_environment_variable(self, tmp_path: Path):
        """Test dev mode sets ADKFLOW_DEV_MODE env var."""
        with patch("cli.servers.subprocess.Popen") as mock_popen:
            mock_popen.return_value = MagicMock()

            start_backend_server(tmp_path, 6000, dev_mode=True)

            call_args = mock_popen.call_args
            env = call_args[1]["env"]

            assert env.get("ADKFLOW_DEV_MODE") == "1"

    def test_non_dev_mode_no_dev_env_var(self, tmp_path: Path):
        """Test non-dev mode does not set ADKFLOW_DEV_MODE."""
        with patch("cli.servers.subprocess.Popen") as mock_popen:
            mock_popen.return_value = MagicMock()

            start_backend_server(tmp_path, 6000, dev_mode=False)

            call_args = mock_popen.call_args
            env = call_args[1]["env"]

            assert "ADKFLOW_DEV_MODE" not in env

    def test_returns_popen_object(self, tmp_path: Path):
        """Test function returns the Popen process object."""
        mock_proc = MagicMock(spec=subprocess.Popen)

        with patch("cli.servers.subprocess.Popen", return_value=mock_proc):
            result = start_backend_server(tmp_path, 6000)

            assert result is mock_proc

    def test_stdout_piped(self, tmp_path: Path):
        """Test stdout is piped for log streaming."""
        with patch("cli.servers.subprocess.Popen") as mock_popen:
            mock_popen.return_value = MagicMock()

            start_backend_server(tmp_path, 6000)

            call_args = mock_popen.call_args
            assert call_args[1]["stdout"] == subprocess.PIPE

    def test_stderr_redirected_to_stdout(self, tmp_path: Path):
        """Test stderr is redirected to stdout."""
        with patch("cli.servers.subprocess.Popen") as mock_popen:
            mock_popen.return_value = MagicMock()

            start_backend_server(tmp_path, 6000)

            call_args = mock_popen.call_args
            assert call_args[1]["stderr"] == subprocess.STDOUT


class TestStartFrontendServer:
    """Tests for start_frontend_server function."""

    def test_installs_deps_when_missing(self, tmp_path: Path):
        """Test npm install is run when node_modules missing."""
        frontend_dir = tmp_path / "frontend"
        frontend_dir.mkdir()

        with patch("cli.servers.subprocess.Popen") as mock_popen:
            with patch("cli.servers.subprocess.run") as mock_run:
                with patch("cli.servers.print_msg"):
                    mock_popen.return_value = MagicMock()

                    start_frontend_server(tmp_path, 6006, 6000)

                    # Check npm install was called
                    npm_install_call = None
                    for c in mock_run.call_args_list:
                        if "npm" in c[0][0] and "install" in c[0][0]:
                            npm_install_call = c
                            break

                    assert npm_install_call is not None

    def test_skips_install_when_deps_exist(self, tmp_path: Path):
        """Test npm install is skipped when deps already exist."""
        frontend_dir = tmp_path / "frontend"
        frontend_dir.mkdir()
        node_modules = frontend_dir / "node_modules" / ".bin"
        node_modules.mkdir(parents=True)
        (node_modules / "next").touch()

        with patch("cli.servers.subprocess.Popen") as mock_popen:
            with patch("cli.servers.subprocess.run") as mock_run:
                mock_popen.return_value = MagicMock()

                start_frontend_server(tmp_path, 6006, 6000)

                # npm install should not be called
                for c in mock_run.call_args_list:
                    if c[0][0] and "install" in str(c[0][0]):
                        pytest.fail("npm install should not be called")

    def test_writes_env_local_file(self, tmp_path: Path):
        """Test .env.local file is written with API URL."""
        frontend_dir = tmp_path / "frontend"
        frontend_dir.mkdir()
        node_modules = frontend_dir / "node_modules" / ".bin"
        node_modules.mkdir(parents=True)
        (node_modules / "next").touch()

        with patch("cli.servers.subprocess.Popen") as mock_popen:
            mock_popen.return_value = MagicMock()

            start_frontend_server(tmp_path, 6006, 7000)

            env_file = frontend_dir / ".env.local"
            assert env_file.exists()
            content = env_file.read_text()
            assert "NEXT_PUBLIC_API_URL=http://localhost:7000" in content

    def test_dev_mode_uses_npm_dev(self, tmp_path: Path):
        """Test dev mode uses 'npm run dev'."""
        frontend_dir = tmp_path / "frontend"
        frontend_dir.mkdir()
        node_modules = frontend_dir / "node_modules" / ".bin"
        node_modules.mkdir(parents=True)
        (node_modules / "next").touch()

        with patch("cli.servers.subprocess.Popen") as mock_popen:
            mock_popen.return_value = MagicMock()

            start_frontend_server(tmp_path, 6006, 6000, dev_mode=True)

            call_args = mock_popen.call_args
            cmd = call_args[0][0]

            assert "npm" in cmd
            assert "dev" in cmd

    def test_prod_mode_uses_npm_start(self, tmp_path: Path):
        """Test prod mode uses 'npm run start'."""
        frontend_dir = tmp_path / "frontend"
        frontend_dir.mkdir()
        node_modules = frontend_dir / "node_modules" / ".bin"
        node_modules.mkdir(parents=True)
        (node_modules / "next").touch()
        # Create .next directory to skip build
        (frontend_dir / ".next").mkdir()

        with patch("cli.servers.subprocess.Popen") as mock_popen:
            mock_popen.return_value = MagicMock()

            start_frontend_server(tmp_path, 6006, 6000, dev_mode=False)

            call_args = mock_popen.call_args
            cmd = call_args[0][0]

            assert "npm" in cmd
            assert "start" in cmd

    def test_prod_mode_builds_when_needed(self, tmp_path: Path):
        """Test prod mode builds frontend when .next doesn't exist."""
        frontend_dir = tmp_path / "frontend"
        frontend_dir.mkdir()
        node_modules = frontend_dir / "node_modules" / ".bin"
        node_modules.mkdir(parents=True)
        (node_modules / "next").touch()

        with patch("cli.servers.subprocess.Popen") as mock_popen:
            with patch("cli.servers.subprocess.run") as mock_run:
                with patch("cli.servers.print_msg"):
                    mock_popen.return_value = MagicMock()

                    start_frontend_server(tmp_path, 6006, 6000, dev_mode=False)

                    # Check npm build was called
                    build_call_found = False
                    for c in mock_run.call_args_list:
                        if c[0][0] and "build" in str(c[0][0]):
                            build_call_found = True
                            break

                    assert build_call_found

    def test_port_passed_to_command(self, tmp_path: Path):
        """Test frontend port is passed to npm command."""
        frontend_dir = tmp_path / "frontend"
        frontend_dir.mkdir()
        node_modules = frontend_dir / "node_modules" / ".bin"
        node_modules.mkdir(parents=True)
        (node_modules / "next").touch()

        with patch("cli.servers.subprocess.Popen") as mock_popen:
            mock_popen.return_value = MagicMock()

            start_frontend_server(tmp_path, 8080, 6000)

            call_args = mock_popen.call_args
            cmd = call_args[0][0]

            assert "-p" in cmd
            assert "8080" in cmd

    def test_returns_popen_object(self, tmp_path: Path):
        """Test function returns the Popen process object."""
        frontend_dir = tmp_path / "frontend"
        frontend_dir.mkdir()
        node_modules = frontend_dir / "node_modules" / ".bin"
        node_modules.mkdir(parents=True)
        (node_modules / "next").touch()

        mock_proc = MagicMock(spec=subprocess.Popen)

        with patch("cli.servers.subprocess.Popen", return_value=mock_proc):
            result = start_frontend_server(tmp_path, 6006, 6000)

            assert result is mock_proc
