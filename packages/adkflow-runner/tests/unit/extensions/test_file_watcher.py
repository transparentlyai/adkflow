"""Tests for file watcher module."""

from unittest.mock import MagicMock
import time


from adkflow_runner.extensions.file_watcher import FileWatcher
from adkflow_runner.extensions.types import ExtensionScope


class TestFileWatcherCreation:
    """Tests for FileWatcher initialization."""

    def test_create_file_watcher(self):
        """Create file watcher with callback."""
        callback = MagicMock()
        watcher = FileWatcher(callback)
        assert watcher._check_callback is callback

    def test_initial_state(self):
        """Initial state has no threads running."""
        watcher = FileWatcher(MagicMock())
        assert watcher._global_watch_thread is None
        assert watcher._project_watch_thread is None
        assert watcher._legacy_watch_thread is None


class TestStartWatching:
    """Tests for start watching methods."""

    def test_start_watching_legacy(self, tmp_path):
        """Start legacy watching creates thread."""
        callback = MagicMock()
        watcher = FileWatcher(callback)

        watcher.start_watching(tmp_path, poll_interval=0.1)
        assert watcher._legacy_watch_thread is not None
        assert watcher._legacy_path == tmp_path

        watcher.stop_watching()

    def test_start_watching_legacy_twice(self, tmp_path):
        """Starting legacy watching twice is no-op."""
        callback = MagicMock()
        watcher = FileWatcher(callback)

        watcher.start_watching(tmp_path, poll_interval=0.1)
        thread = watcher._legacy_watch_thread

        # Start again - should be no-op
        watcher.start_watching(tmp_path, poll_interval=0.1)
        assert watcher._legacy_watch_thread is thread

        watcher.stop_watching()

    def test_start_watching_global(self, tmp_path):
        """Start global watching creates thread."""
        callback = MagicMock()
        watcher = FileWatcher(callback)

        watcher.start_watching_global(tmp_path, poll_interval=0.1)
        assert watcher._global_watch_thread is not None
        assert watcher._global_path == tmp_path

        watcher.stop_watching()

    def test_start_watching_global_twice(self, tmp_path):
        """Starting global watching twice is no-op."""
        callback = MagicMock()
        watcher = FileWatcher(callback)

        watcher.start_watching_global(tmp_path, poll_interval=0.1)
        thread = watcher._global_watch_thread

        watcher.start_watching_global(tmp_path, poll_interval=0.1)
        assert watcher._global_watch_thread is thread

        watcher.stop_watching()

    def test_start_watching_project(self, tmp_path):
        """Start project watching creates thread."""
        callback = MagicMock()
        watcher = FileWatcher(callback)

        watcher.start_watching_project(tmp_path, poll_interval=0.1)
        assert watcher._project_watch_thread is not None
        assert watcher._project_path == tmp_path

        watcher.stop_watching()

    def test_start_watching_project_twice(self, tmp_path):
        """Starting project watching twice is no-op."""
        callback = MagicMock()
        watcher = FileWatcher(callback)

        watcher.start_watching_project(tmp_path, poll_interval=0.1)
        thread = watcher._project_watch_thread

        watcher.start_watching_project(tmp_path, poll_interval=0.1)
        assert watcher._project_watch_thread is thread

        watcher.stop_watching()


class TestStopWatching:
    """Tests for stop watching methods."""

    def test_stop_watching_all(self, tmp_path):
        """Stop watching all stops all threads."""
        callback = MagicMock()
        watcher = FileWatcher(callback)

        watcher.start_watching(tmp_path, poll_interval=0.1)
        watcher.start_watching_global(tmp_path / "global", poll_interval=0.1)
        watcher.start_watching_project(tmp_path / "project", poll_interval=0.1)

        watcher.stop_watching()

        assert watcher._legacy_watch_thread is None
        assert watcher._global_watch_thread is None
        assert watcher._project_watch_thread is None

    def test_stop_watching_global(self, tmp_path):
        """Stop global watching only."""
        callback = MagicMock()
        watcher = FileWatcher(callback)

        watcher.start_watching_global(tmp_path, poll_interval=0.1)
        watcher.stop_watching_global()

        assert watcher._global_watch_thread is None

    def test_stop_watching_project(self, tmp_path):
        """Stop project watching only."""
        callback = MagicMock()
        watcher = FileWatcher(callback)

        watcher.start_watching_project(tmp_path, poll_interval=0.1)
        watcher.stop_watching_project()

        assert watcher._project_watch_thread is None

    def test_stop_watching_no_thread(self):
        """Stop watching when no thread exists."""
        watcher = FileWatcher(MagicMock())
        watcher.stop_watching()  # Should not raise

    def test_stop_watching_global_no_thread(self):
        """Stop global watching when no thread exists."""
        watcher = FileWatcher(MagicMock())
        watcher.stop_watching_global()  # Should not raise

    def test_stop_watching_project_no_thread(self):
        """Stop project watching when no thread exists."""
        watcher = FileWatcher(MagicMock())
        watcher.stop_watching_project()  # Should not raise


class TestWatchLoop:
    """Tests for watch loop callback invocation."""

    def test_watch_loop_calls_callback(self, tmp_path):
        """Watch loop invokes callback periodically."""
        callback = MagicMock()
        watcher = FileWatcher(callback)

        watcher.start_watching(tmp_path, poll_interval=0.05)
        time.sleep(0.15)  # Allow 2-3 iterations
        watcher.stop_watching()

        # Callback should have been called at least once
        assert callback.call_count >= 1
        callback.assert_called_with(tmp_path, ExtensionScope.PROJECT)

    def test_watch_loop_global_scope(self, tmp_path):
        """Global watch loop uses GLOBAL scope."""
        callback = MagicMock()
        watcher = FileWatcher(callback)

        watcher.start_watching_global(tmp_path, poll_interval=0.05)
        time.sleep(0.15)
        watcher.stop_watching()

        callback.assert_called_with(tmp_path, ExtensionScope.GLOBAL)

    def test_watch_loop_project_scope(self, tmp_path):
        """Project watch loop uses PROJECT scope."""
        callback = MagicMock()
        watcher = FileWatcher(callback)

        watcher.start_watching_project(tmp_path, poll_interval=0.05)
        time.sleep(0.15)
        watcher.stop_watching()

        callback.assert_called_with(tmp_path, ExtensionScope.PROJECT)

    def test_watch_loop_callback_exception(self, tmp_path, capsys):
        """Watch loop handles callback exceptions."""
        callback = MagicMock(side_effect=ValueError("Test error"))
        watcher = FileWatcher(callback)

        watcher.start_watching(tmp_path, poll_interval=0.05)
        time.sleep(0.15)
        watcher.stop_watching()

        # Should not crash - error is printed
        captured = capsys.readouterr()
        assert "Watch error" in captured.out


class TestMultipleWatchers:
    """Tests for multiple simultaneous watchers."""

    def test_multiple_watchers_independent(self, tmp_path):
        """Multiple watchers can run independently."""
        global_path = tmp_path / "global"
        global_path.mkdir()
        project_path = tmp_path / "project"
        project_path.mkdir()

        callback = MagicMock()
        watcher = FileWatcher(callback)

        watcher.start_watching_global(global_path, poll_interval=0.1)
        watcher.start_watching_project(project_path, poll_interval=0.1)

        assert watcher._global_watch_thread is not None
        assert watcher._project_watch_thread is not None

        watcher.stop_watching()

        assert watcher._global_watch_thread is None
        assert watcher._project_watch_thread is None

    def test_stop_one_watcher_keeps_other(self, tmp_path):
        """Stopping one watcher doesn't affect others."""
        global_path = tmp_path / "global"
        global_path.mkdir()
        project_path = tmp_path / "project"
        project_path.mkdir()

        callback = MagicMock()
        watcher = FileWatcher(callback)

        watcher.start_watching_global(global_path, poll_interval=0.1)
        watcher.start_watching_project(project_path, poll_interval=0.1)

        watcher.stop_watching_global()

        assert watcher._global_watch_thread is None
        assert watcher._project_watch_thread is not None

        watcher.stop_watching()
