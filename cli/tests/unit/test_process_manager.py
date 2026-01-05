"""Tests for CLI process manager."""

import signal
import subprocess
from unittest.mock import MagicMock, patch

import pytest

from cli.process_manager import (
    BACKEND_PROCESS_PATTERN,
    FRONTEND_DEV_PATTERN,
    FRONTEND_PROD_PATTERN,
    HEALTH_CHECK_INTERVAL,
    HEALTH_CHECK_MAX_ATTEMPTS,
    ProcessManager,
    create_backend_manager,
    create_dev_manager,
    create_frontend_manager,
    create_prod_manager,
    wait_for_process_running,
    wait_for_server_health,
)


class TestWaitForServerHealth:
    """Tests for wait_for_server_health function."""

    def test_returns_true_when_server_healthy(self):
        """Test returns True when server responds with 200."""
        mock_proc = MagicMock()
        mock_proc.poll.return_value = None

        mock_response = MagicMock()
        mock_response.status_code = 200

        with patch("cli.process_manager.requests.get", return_value=mock_response):
            with patch("cli.process_manager.time.sleep"):
                result = wait_for_server_health(
                    "http://localhost:6000/health", mock_proc, max_attempts=3
                )

                assert result is True

    def test_returns_false_when_process_dies(self):
        """Test returns False when process terminates."""
        mock_proc = MagicMock()
        mock_proc.poll.return_value = 1  # Process died

        result = wait_for_server_health(
            "http://localhost:6000/health", mock_proc, max_attempts=1
        )

        assert result is False

    def test_returns_false_on_timeout(self):
        """Test returns False when max attempts reached."""
        import requests

        mock_proc = MagicMock()
        mock_proc.poll.return_value = None

        with patch("cli.process_manager.requests.get") as mock_get:
            mock_get.side_effect = requests.RequestException("Connection refused")
            with patch("cli.process_manager.time.sleep"):
                result = wait_for_server_health(
                    "http://localhost:6000/health", mock_proc, max_attempts=2
                )

                assert result is False

    def test_retries_on_request_exception(self):
        """Test keeps retrying when request fails."""
        mock_proc = MagicMock()
        mock_proc.poll.return_value = None

        mock_response = MagicMock()
        mock_response.status_code = 200

        import requests

        with patch("cli.process_manager.requests.get") as mock_get:
            mock_get.side_effect = [
                requests.RequestException("Connection refused"),
                requests.RequestException("Connection refused"),
                mock_response,
            ]
            with patch("cli.process_manager.time.sleep"):
                result = wait_for_server_health(
                    "http://localhost:6000/health", mock_proc, max_attempts=5
                )

                assert result is True
                assert mock_get.call_count == 3


class TestWaitForProcessRunning:
    """Tests for wait_for_process_running function."""

    def test_returns_true_when_process_running(self):
        """Test returns True when process stays running."""
        mock_proc = MagicMock()
        mock_proc.poll.return_value = None

        with patch("cli.process_manager.time.sleep"):
            result = wait_for_process_running(mock_proc, max_attempts=3)

            assert result is True

    def test_returns_false_when_process_dies(self):
        """Test returns False when process terminates."""
        mock_proc = MagicMock()
        mock_proc.poll.return_value = 1  # Process died

        result = wait_for_process_running(mock_proc, max_attempts=1)

        assert result is False

    def test_returns_false_when_process_dies_after_sleep(self):
        """Test returns False when process dies after first check."""
        mock_proc = MagicMock()
        # Process alive initially (poll=None), then dies after sleep (poll=1)
        # Function does: poll (None), sleep, poll (1) -> returns False
        mock_proc.poll.side_effect = [None, 1, 1, 1]  # Extra values in case

        with patch("cli.process_manager.time.sleep"):
            result = wait_for_process_running(mock_proc, max_attempts=2)

            assert result is False


class TestProcessManager:
    """Tests for ProcessManager class."""

    def test_initialization(self):
        """Test ProcessManager initializes with empty process list."""
        manager = ProcessManager()

        assert manager.processes == []
        assert manager.pkill_patterns == []
        assert manager.shutdown_message == "Shutting down servers..."
        assert manager.stopped_message == "Servers stopped"

    def test_initialization_with_custom_values(self):
        """Test ProcessManager can be initialized with custom values."""
        manager = ProcessManager(
            pkill_patterns=["pattern1"],
            shutdown_message="Custom shutdown",
            stopped_message="Custom stopped",
        )

        assert manager.pkill_patterns == ["pattern1"]
        assert manager.shutdown_message == "Custom shutdown"
        assert manager.stopped_message == "Custom stopped"

    def test_add_process(self):
        """Test adding processes to manager."""
        manager = ProcessManager()
        mock_proc = MagicMock()

        manager.add_process(mock_proc)

        assert mock_proc in manager.processes
        assert len(manager.processes) == 1

    def test_add_multiple_processes(self):
        """Test adding multiple processes to manager."""
        manager = ProcessManager()
        mock_proc1 = MagicMock()
        mock_proc2 = MagicMock()

        manager.add_process(mock_proc1)
        manager.add_process(mock_proc2)

        assert len(manager.processes) == 2
        assert mock_proc1 in manager.processes
        assert mock_proc2 in manager.processes

    def test_add_pkill_pattern(self):
        """Test adding pkill patterns."""
        manager = ProcessManager()

        manager.add_pkill_pattern("test-pattern")

        assert "test-pattern" in manager.pkill_patterns

    def test_setup_signal_handlers(self):
        """Test signal handlers are set up."""
        manager = ProcessManager()

        with patch("cli.process_manager.signal.signal") as mock_signal:
            manager.setup_signal_handlers()

            assert mock_signal.call_count == 2
            mock_signal.assert_any_call(signal.SIGINT, pytest.approx(mock_signal.call_args_list[0][0][1], rel=1e-9))
            mock_signal.assert_any_call(signal.SIGTERM, pytest.approx(mock_signal.call_args_list[1][0][1], rel=1e-9))

    def test_setup_signal_handlers_idempotent(self):
        """Test signal handlers only set up once."""
        manager = ProcessManager()

        with patch("cli.process_manager.signal.signal") as mock_signal:
            manager.setup_signal_handlers()
            manager.setup_signal_handlers()  # Call again

            # Should only be called twice (SIGINT + SIGTERM), not four times
            assert mock_signal.call_count == 2

    def test_cleanup_terminates_processes(self):
        """Test cleanup terminates all managed processes."""
        manager = ProcessManager()
        mock_proc = MagicMock()
        mock_proc.poll.return_value = None

        manager.add_process(mock_proc)

        with patch("cli.process_manager.print_msg"):
            with patch("cli.process_manager.subprocess.run"):
                with pytest.raises(SystemExit) as exc_info:
                    manager.cleanup()

                mock_proc.terminate.assert_called_once()
                assert exc_info.value.code == 0

    def test_cleanup_with_exit_code(self):
        """Test cleanup uses provided exit code."""
        manager = ProcessManager()

        with patch("cli.process_manager.print_msg"):
            with patch("cli.process_manager.subprocess.run"):
                with pytest.raises(SystemExit) as exc_info:
                    manager.cleanup(exit_code=1)

                assert exc_info.value.code == 1

    def test_cleanup_kills_stubborn_processes(self):
        """Test cleanup kills processes that don't terminate gracefully."""
        manager = ProcessManager()
        mock_proc = MagicMock()
        mock_proc.poll.return_value = None
        mock_proc.wait.side_effect = subprocess.TimeoutExpired("cmd", 5)

        manager.add_process(mock_proc)

        with patch("cli.process_manager.print_msg"):
            with patch("cli.process_manager.subprocess.run"):
                with pytest.raises(SystemExit):
                    manager.cleanup()

                mock_proc.terminate.assert_called_once()
                mock_proc.kill.assert_called_once()

    def test_cleanup_runs_pkill_patterns(self):
        """Test cleanup runs pkill for fallback patterns."""
        manager = ProcessManager(pkill_patterns=["pattern1", "pattern2"])

        with patch("cli.process_manager.print_msg"):
            with patch("cli.process_manager.subprocess.run") as mock_run:
                with pytest.raises(SystemExit):
                    manager.cleanup()

                # Should call pkill for each pattern
                assert mock_run.call_count >= 2

    def test_all_running_true(self):
        """Test all_running returns True when all processes alive."""
        manager = ProcessManager()
        mock_proc1 = MagicMock()
        mock_proc1.poll.return_value = None
        mock_proc2 = MagicMock()
        mock_proc2.poll.return_value = None

        manager.add_process(mock_proc1)
        manager.add_process(mock_proc2)

        assert manager.all_running() is True

    def test_all_running_false(self):
        """Test all_running returns False when any process dead."""
        manager = ProcessManager()
        mock_proc1 = MagicMock()
        mock_proc1.poll.return_value = None
        mock_proc2 = MagicMock()
        mock_proc2.poll.return_value = 1  # Dead

        manager.add_process(mock_proc1)
        manager.add_process(mock_proc2)

        assert manager.all_running() is False

    def test_all_running_empty(self):
        """Test all_running returns True for empty process list."""
        manager = ProcessManager()

        assert manager.all_running() is True


class TestProcessManagerFactories:
    """Tests for ProcessManager factory functions."""

    def test_create_backend_manager(self):
        """Test create_backend_manager returns correctly configured manager."""
        manager = create_backend_manager()

        assert BACKEND_PROCESS_PATTERN in manager.pkill_patterns
        assert "backend" in manager.shutdown_message.lower()
        assert "backend" in manager.stopped_message.lower()

    def test_create_frontend_manager(self):
        """Test create_frontend_manager returns correctly configured manager."""
        manager = create_frontend_manager()

        assert FRONTEND_DEV_PATTERN in manager.pkill_patterns
        assert FRONTEND_PROD_PATTERN in manager.pkill_patterns
        assert "frontend" in manager.shutdown_message.lower()
        assert "frontend" in manager.stopped_message.lower()

    def test_create_dev_manager(self):
        """Test create_dev_manager returns correctly configured manager."""
        manager = create_dev_manager()

        assert BACKEND_PROCESS_PATTERN in manager.pkill_patterns
        assert FRONTEND_DEV_PATTERN in manager.pkill_patterns
        assert "servers" in manager.shutdown_message.lower()

    def test_create_prod_manager(self):
        """Test create_prod_manager returns correctly configured manager."""
        manager = create_prod_manager()

        assert BACKEND_PROCESS_PATTERN in manager.pkill_patterns
        assert FRONTEND_PROD_PATTERN in manager.pkill_patterns
        assert "servers" in manager.shutdown_message.lower()


class TestConstants:
    """Tests for module constants."""

    def test_backend_process_pattern(self):
        """Test BACKEND_PROCESS_PATTERN is defined correctly."""
        assert "backend" in BACKEND_PROCESS_PATTERN.lower()

    def test_frontend_patterns(self):
        """Test frontend patterns are defined."""
        assert "next" in FRONTEND_DEV_PATTERN.lower()
        assert "next" in FRONTEND_PROD_PATTERN.lower()
        assert "dev" in FRONTEND_DEV_PATTERN.lower()
        assert "start" in FRONTEND_PROD_PATTERN.lower()

    def test_health_check_config(self):
        """Test health check configuration values are reasonable."""
        assert HEALTH_CHECK_MAX_ATTEMPTS > 0
        assert HEALTH_CHECK_INTERVAL > 0
        # Total timeout should be reasonable (e.g., < 60 seconds)
        assert HEALTH_CHECK_MAX_ATTEMPTS * HEALTH_CHECK_INTERVAL < 60
