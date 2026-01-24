"""Tests for file watcher service.

Tests file watching, change detection, and event broadcasting.
"""

from __future__ import annotations

import asyncio
import time
from pathlib import Path


from backend.src.api.file_watcher import (
    FileChangeEvent,
    FileWatcherManager,
    WatcherState,
)


class TestFileWatcherManager:
    """Tests for FileWatcherManager."""

    async def test_start_watching_creates_watcher(self, tmp_path: Path):
        """Start watching a project directory."""
        manager = FileWatcherManager(poll_interval=0.1)
        project_path = str(tmp_path)

        await manager.start_watching(project_path)

        assert project_path in manager._watchers
        state = manager._watchers[project_path]
        assert state.is_running is True
        assert state.task is not None

        # Cleanup
        await manager.stop_watching(project_path)

    async def test_start_watching_scans_existing_files(self, tmp_path: Path):
        """Start watching scans existing files in watch directories."""
        # Create files in watched directories
        (tmp_path / "prompts").mkdir()
        (tmp_path / "prompts" / "test.prompt.md").write_text("content")
        (tmp_path / "tools").mkdir()
        (tmp_path / "tools" / "tool.py").write_text("def foo(): pass")

        manager = FileWatcherManager(poll_interval=0.1)
        await manager.start_watching(str(tmp_path))

        state = manager._watchers[str(tmp_path)]
        assert "prompts/test.prompt.md" in state.file_mtimes
        assert "tools/tool.py" in state.file_mtimes

        await manager.stop_watching(str(tmp_path))

    async def test_start_watching_ignores_non_watched_extensions(self, tmp_path: Path):
        """Files with non-watched extensions are ignored."""
        (tmp_path / "prompts").mkdir()
        (tmp_path / "prompts" / "test.prompt.md").write_text("content")
        (tmp_path / "prompts" / "ignore.exe").write_text("binary")

        manager = FileWatcherManager(poll_interval=0.1)
        await manager.start_watching(str(tmp_path))

        state = manager._watchers[str(tmp_path)]
        assert "prompts/test.prompt.md" in state.file_mtimes
        assert "prompts/ignore.exe" not in state.file_mtimes

        await manager.stop_watching(str(tmp_path))

    async def test_start_watching_already_watching(self, tmp_path: Path):
        """Starting watch on already-watched path is idempotent."""
        manager = FileWatcherManager(poll_interval=0.1)
        project_path = str(tmp_path)

        await manager.start_watching(project_path)
        first_task = manager._watchers[project_path].task

        await manager.start_watching(project_path)
        second_task = manager._watchers[project_path].task

        # Should be the same task (not restarted)
        assert first_task is second_task

        await manager.stop_watching(project_path)

    async def test_start_watching_non_directory(self, tmp_path: Path):
        """Starting watch on non-directory does nothing."""
        manager = FileWatcherManager(poll_interval=0.1)
        file_path = tmp_path / "not_a_dir.txt"
        file_path.touch()

        await manager.start_watching(str(file_path))

        assert str(file_path) not in manager._watchers

    async def test_stop_watching_removes_watcher(self, tmp_path: Path):
        """Stop watching removes watcher and cancels task."""
        manager = FileWatcherManager(poll_interval=0.1)
        project_path = str(tmp_path)

        await manager.start_watching(project_path)
        assert project_path in manager._watchers

        await manager.stop_watching(project_path)
        assert project_path not in manager._watchers

    async def test_stop_watching_not_watching(self, tmp_path: Path):
        """Stopping watch on non-watched path is safe."""
        manager = FileWatcherManager(poll_interval=0.1)
        project_path = str(tmp_path)

        # Should not raise
        await manager.stop_watching(project_path)

    async def test_subscribe_starts_watching(self, tmp_path: Path):
        """Subscribe automatically starts watching."""
        manager = FileWatcherManager(poll_interval=0.1)
        project_path = str(tmp_path)

        queue = await manager.subscribe(project_path)

        assert project_path in manager._watchers
        assert queue in manager._watchers[project_path].subscribers

        await manager.unsubscribe(project_path, queue)

    async def test_subscribe_returns_queue(self, tmp_path: Path):
        """Subscribe returns async queue for events."""
        manager = FileWatcherManager(poll_interval=0.1)
        project_path = str(tmp_path)

        queue = await manager.subscribe(project_path)

        assert isinstance(queue, asyncio.Queue)

        await manager.unsubscribe(project_path, queue)

    async def test_multiple_subscribers(self, tmp_path: Path):
        """Multiple subscribers can watch same project."""
        manager = FileWatcherManager(poll_interval=0.1)
        project_path = str(tmp_path)

        queue1 = await manager.subscribe(project_path)
        queue2 = await manager.subscribe(project_path)

        state = manager._watchers[project_path]
        assert len(state.subscribers) == 2

        await manager.unsubscribe(project_path, queue1)
        await manager.unsubscribe(project_path, queue2)

    async def test_unsubscribe_removes_subscriber(self, tmp_path: Path):
        """Unsubscribe removes subscriber from list."""
        manager = FileWatcherManager(poll_interval=0.1)
        project_path = str(tmp_path)

        queue = await manager.subscribe(project_path)
        assert len(manager._watchers[project_path].subscribers) == 1

        await manager.unsubscribe(project_path, queue)
        assert project_path not in manager._watchers  # Stopped when no subscribers

    async def test_unsubscribe_stops_watching_when_no_subscribers(self, tmp_path: Path):
        """Unsubscribing last subscriber stops watching."""
        manager = FileWatcherManager(poll_interval=0.1)
        project_path = str(tmp_path)

        queue1 = await manager.subscribe(project_path)
        queue2 = await manager.subscribe(project_path)

        await manager.unsubscribe(project_path, queue1)
        assert project_path in manager._watchers  # Still watching (queue2)

        await manager.unsubscribe(project_path, queue2)
        assert project_path not in manager._watchers  # Stopped

    async def test_unsubscribe_nonexistent_queue(self, tmp_path: Path):
        """Unsubscribing non-existent queue is safe."""
        manager = FileWatcherManager(poll_interval=0.1)
        project_path = str(tmp_path)
        fake_queue: asyncio.Queue[FileChangeEvent] = asyncio.Queue()

        # Should not raise
        await manager.unsubscribe(project_path, fake_queue)

    async def test_detect_new_file(self, tmp_path: Path):
        """Detect newly created files."""
        manager = FileWatcherManager(poll_interval=0.1)
        project_path = str(tmp_path)
        (tmp_path / "prompts").mkdir()

        queue = await manager.subscribe(project_path)

        # Create new file
        (tmp_path / "prompts" / "new.prompt.md").write_text("new content")

        # Wait for poll to detect change
        await asyncio.sleep(0.2)

        # Should receive event
        event = await asyncio.wait_for(queue.get(), timeout=1.0)
        assert event.file_path == "prompts/new.prompt.md"
        assert event.change_type == "created"

        await manager.unsubscribe(project_path, queue)

    async def test_detect_modified_file(self, tmp_path: Path):
        """Detect modified files."""
        manager = FileWatcherManager(poll_interval=0.1)
        project_path = str(tmp_path)
        (tmp_path / "prompts").mkdir()
        prompt_file = tmp_path / "prompts" / "existing.prompt.md"
        prompt_file.write_text("old content")

        queue = await manager.subscribe(project_path)

        # Give time for initial scan
        await asyncio.sleep(0.15)

        # Modify file
        await asyncio.sleep(0.05)  # Ensure mtime changes
        prompt_file.write_text("new content")

        # Wait for poll to detect change
        event = await asyncio.wait_for(queue.get(), timeout=1.0)
        assert event.file_path == "prompts/existing.prompt.md"
        assert event.change_type == "modified"

        await manager.unsubscribe(project_path, queue)

    async def test_detect_deleted_file(self, tmp_path: Path):
        """Detect deleted files."""
        manager = FileWatcherManager(poll_interval=0.1)
        project_path = str(tmp_path)
        (tmp_path / "prompts").mkdir()
        prompt_file = tmp_path / "prompts" / "to_delete.prompt.md"
        prompt_file.write_text("content")

        queue = await manager.subscribe(project_path)

        # Give time for initial scan
        await asyncio.sleep(0.15)

        # Delete file
        prompt_file.unlink()

        # Wait for poll to detect change
        event = await asyncio.wait_for(queue.get(), timeout=1.0)
        assert event.file_path == "prompts/to_delete.prompt.md"
        assert event.change_type == "deleted"

        await manager.unsubscribe(project_path, queue)

    async def test_notify_file_change_broadcasts_event(self, tmp_path: Path):
        """Notify file change broadcasts to all subscribers."""
        manager = FileWatcherManager(poll_interval=0.1)
        project_path = str(tmp_path)

        queue1 = await manager.subscribe(project_path)
        queue2 = await manager.subscribe(project_path)

        # Notify of change
        manager.notify_file_change(project_path, "prompts/test.md", "modified")

        # Both subscribers should receive event
        event1 = queue1.get_nowait()
        event2 = queue2.get_nowait()

        assert event1.file_path == "prompts/test.md"
        assert event1.change_type == "modified"
        assert event2.file_path == "prompts/test.md"
        assert event2.change_type == "modified"

        await manager.unsubscribe(project_path, queue1)
        await manager.unsubscribe(project_path, queue2)

    async def test_notify_file_change_updates_mtime_cache(self, tmp_path: Path):
        """Notify file change updates mtime cache to avoid duplicate detection."""
        manager = FileWatcherManager(poll_interval=0.1)
        project_path = str(tmp_path)
        (tmp_path / "prompts").mkdir()
        prompt_file = tmp_path / "prompts" / "test.md"
        prompt_file.write_text("content")

        queue = await manager.subscribe(project_path)

        # Notify of change (simulating internal save)
        manager.notify_file_change(project_path, "prompts/test.md", "modified")

        # Mtime should be updated in cache
        state = manager._watchers[project_path]
        assert "prompts/test.md" in state.file_mtimes

        await manager.unsubscribe(project_path, queue)

    async def test_notify_file_change_nonexistent_watcher(self, tmp_path: Path):
        """Notify file change on non-watched project is safe."""
        manager = FileWatcherManager(poll_interval=0.1)
        project_path = str(tmp_path)

        # Should not raise
        manager.notify_file_change(project_path, "prompts/test.md", "modified")

    async def test_poll_loop_continues_on_error(self, tmp_path: Path):
        """Poll loop continues even if check fails."""
        manager = FileWatcherManager(poll_interval=0.1)
        project_path = str(tmp_path)

        await manager.start_watching(project_path)

        # Poll loop should be running
        assert manager._watchers[project_path].is_running is True

        # Wait for a few poll cycles
        await asyncio.sleep(0.3)

        # Should still be running
        assert manager._watchers[project_path].is_running is True

        await manager.stop_watching(project_path)

    async def test_scan_files_watches_correct_directories(self, tmp_path: Path):
        """Scan files only watches configured directories."""
        manager = FileWatcherManager(poll_interval=0.1)

        # Create files in watched directories
        (tmp_path / "prompts").mkdir()
        (tmp_path / "prompts" / "test.md").write_text("content")

        # Create file in non-watched directory
        (tmp_path / "other").mkdir()
        (tmp_path / "other" / "test.md").write_text("content")

        mtimes = manager._scan_files(tmp_path)

        assert "prompts/test.md" in mtimes
        assert "other/test.md" not in mtimes

    async def test_scan_files_watches_correct_extensions(self, tmp_path: Path):
        """Scan files only watches configured extensions."""
        manager = FileWatcherManager(poll_interval=0.1)

        (tmp_path / "prompts").mkdir()
        (tmp_path / "prompts" / "test.md").write_text("content")
        (tmp_path / "prompts" / "test.py").write_text("content")
        (tmp_path / "prompts" / "test.exe").write_text("content")

        mtimes = manager._scan_files(tmp_path)

        assert "prompts/test.md" in mtimes
        assert "prompts/test.py" in mtimes
        assert "prompts/test.exe" not in mtimes

    async def test_scan_files_handles_missing_watch_dirs(self, tmp_path: Path):
        """Scan files handles missing watch directories gracefully."""
        manager = FileWatcherManager(poll_interval=0.1)

        # Don't create any watch directories
        mtimes = manager._scan_files(tmp_path)

        # Should return empty dict without errors
        assert mtimes == {}

    async def test_broadcast_to_all_subscribers(self, tmp_path: Path):
        """File changes are broadcast to all subscribers."""
        manager = FileWatcherManager(poll_interval=0.1)
        project_path = str(tmp_path)
        (tmp_path / "prompts").mkdir()

        queue1 = await manager.subscribe(project_path)
        queue2 = await manager.subscribe(project_path)
        queue3 = await manager.subscribe(project_path)

        # Create new file
        (tmp_path / "prompts" / "broadcast.md").write_text("content")

        # Wait for poll
        await asyncio.sleep(0.2)

        # All subscribers should receive event
        event1 = await asyncio.wait_for(queue1.get(), timeout=1.0)
        event2 = await asyncio.wait_for(queue2.get(), timeout=1.0)
        event3 = await asyncio.wait_for(queue3.get(), timeout=1.0)

        assert event1.file_path == "prompts/broadcast.md"
        assert event2.file_path == "prompts/broadcast.md"
        assert event3.file_path == "prompts/broadcast.md"

        await manager.unsubscribe(project_path, queue1)
        await manager.unsubscribe(project_path, queue2)
        await manager.unsubscribe(project_path, queue3)


class TestFileChangeEvent:
    """Tests for FileChangeEvent dataclass."""

    def test_create_event(self):
        """Create file change event."""
        event = FileChangeEvent(
            file_path="prompts/test.md", change_type="created", timestamp=time.time()
        )

        assert event.file_path == "prompts/test.md"
        assert event.change_type == "created"
        assert isinstance(event.timestamp, float)


class TestWatcherState:
    """Tests for WatcherState dataclass."""

    def test_create_state(self, tmp_path: Path):
        """Create watcher state."""
        state = WatcherState(project_path=tmp_path)

        assert state.project_path == tmp_path
        assert state.file_mtimes == {}
        assert state.subscribers == []
        assert state.is_running is False
        assert state.task is None
