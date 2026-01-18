"""File watcher service for real-time file change notifications."""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

logger = logging.getLogger(__name__)


@dataclass
class FileChangeEvent:
    """Represents a file change event."""

    file_path: str  # Relative path from project root
    change_type: Literal["created", "modified", "deleted"]
    timestamp: float


@dataclass
class WatcherState:
    """Internal state for watching a project directory."""

    project_path: Path
    file_mtimes: dict[str, float] = field(default_factory=dict)
    subscribers: list[asyncio.Queue[FileChangeEvent]] = field(default_factory=list)
    is_running: bool = False
    task: asyncio.Task | None = None


class FileWatcherManager:
    """
    Manages file watching across multiple projects.

    Polls watched directories for file changes and broadcasts
    events to all subscribers via async queues.
    """

    # Directories to watch within each project
    WATCH_DIRS = ["prompts", "static", "tools", "schemas"]

    # File extensions to watch
    WATCH_EXTENSIONS = {".md", ".py", ".json", ".yaml", ".yml", ".txt"}

    def __init__(self, poll_interval: float = 1.0):
        """
        Initialize the file watcher manager.

        Args:
            poll_interval: Time in seconds between polls (default: 1.0)
        """
        self._poll_interval = poll_interval
        self._watchers: dict[str, WatcherState] = {}
        self._lock = asyncio.Lock()

    async def start_watching(self, project_path: str) -> None:
        """
        Start watching a project directory for file changes.

        Args:
            project_path: Absolute path to the project root
        """
        async with self._lock:
            if project_path in self._watchers:
                logger.debug("Already watching: %s", project_path)
                return  # Already watching

            path = Path(project_path)
            if not path.is_dir():
                logger.warning("Not a directory: %s", project_path)
                return

            state = WatcherState(project_path=path)
            state.file_mtimes = self._scan_files(path)
            state.is_running = True
            state.task = asyncio.create_task(self._poll_loop(project_path))
            self._watchers[project_path] = state
            logger.info(
                "Started watching: %s (tracking %d files)",
                project_path,
                len(state.file_mtimes),
            )

    async def stop_watching(self, project_path: str) -> None:
        """
        Stop watching a project directory.

        Args:
            project_path: Absolute path to the project root
        """
        async with self._lock:
            state = self._watchers.get(project_path)
            if not state:
                return

            state.is_running = False
            if state.task:
                state.task.cancel()
                try:
                    await state.task
                except asyncio.CancelledError:
                    pass

            del self._watchers[project_path]

    async def subscribe(self, project_path: str) -> asyncio.Queue[FileChangeEvent]:
        """
        Subscribe to file change events for a project.

        Automatically starts watching if not already watching.

        Args:
            project_path: Absolute path to the project root

        Returns:
            Async queue that will receive FileChangeEvent objects
        """
        await self.start_watching(project_path)

        async with self._lock:
            state = self._watchers.get(project_path)
            if not state:
                raise ValueError(f"Failed to start watching {project_path}")

            queue: asyncio.Queue[FileChangeEvent] = asyncio.Queue()
            state.subscribers.append(queue)
            logger.info(
                "New subscriber for %s (total: %d)",
                project_path,
                len(state.subscribers),
            )
            return queue

    async def unsubscribe(
        self, project_path: str, queue: asyncio.Queue[FileChangeEvent]
    ) -> None:
        """
        Unsubscribe from file change events.

        Args:
            project_path: Absolute path to the project root
            queue: The queue returned from subscribe()
        """
        async with self._lock:
            state = self._watchers.get(project_path)
            if state and queue in state.subscribers:
                state.subscribers.remove(queue)

                # Stop watching if no more subscribers
                if not state.subscribers:
                    state.is_running = False
                    if state.task:
                        state.task.cancel()
                    del self._watchers[project_path]

    def notify_file_change(
        self,
        project_path: str,
        file_path: str,
        change_type: Literal["created", "modified", "deleted"],
    ) -> None:
        """
        Notify subscribers of a file change (for internal saves).

        This is called after a file is saved via the API to immediately
        notify subscribers without waiting for the next poll.

        Args:
            project_path: Absolute path to the project root
            file_path: Relative path to the changed file
            change_type: Type of change
        """
        state = self._watchers.get(project_path)
        if not state:
            logger.debug("No watcher for project: %s", project_path)
            return

        event = FileChangeEvent(
            file_path=file_path, change_type=change_type, timestamp=time.time()
        )

        # Update mtime cache to avoid duplicate detection in poll
        full_path = state.project_path / file_path
        if full_path.exists():
            state.file_mtimes[file_path] = full_path.stat().st_mtime

        logger.info(
            "Notifying %d subscribers of %s: %s",
            len(state.subscribers),
            change_type,
            file_path,
        )

        # Broadcast to all subscribers
        for queue in state.subscribers:
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                logger.warning("Queue full, skipping notification")

    def _scan_files(self, project_path: Path) -> dict[str, float]:
        """
        Scan watched directories and return file modification times.

        Args:
            project_path: Path to the project root

        Returns:
            Dictionary mapping relative file paths to modification times
        """
        mtimes: dict[str, float] = {}

        for dir_name in self.WATCH_DIRS:
            watch_dir = project_path / dir_name
            if not watch_dir.is_dir():
                continue

            for file_path in watch_dir.rglob("*"):
                if not file_path.is_file():
                    continue
                if file_path.suffix.lower() not in self.WATCH_EXTENSIONS:
                    continue

                relative_path = str(file_path.relative_to(project_path))
                try:
                    mtimes[relative_path] = file_path.stat().st_mtime
                except OSError:
                    pass  # File may have been deleted

        return mtimes

    async def _poll_loop(self, project_path: str) -> None:
        """
        Poll loop that checks for file changes.

        Args:
            project_path: Absolute path to the project root
        """
        while True:
            state = self._watchers.get(project_path)
            if not state or not state.is_running:
                break

            try:
                await asyncio.sleep(self._poll_interval)
                await self._check_for_changes(project_path)
            except asyncio.CancelledError:
                break
            except Exception:
                # Log error but continue polling
                pass

    async def _check_for_changes(self, project_path: str) -> None:
        """
        Check for file changes and broadcast events.

        Args:
            project_path: Absolute path to the project root
        """
        state = self._watchers.get(project_path)
        if not state:
            return

        current_files = self._scan_files(state.project_path)
        events: list[FileChangeEvent] = []
        now = time.time()

        # Check for new and modified files
        for file_path, mtime in current_files.items():
            old_mtime = state.file_mtimes.get(file_path)
            if old_mtime is None:
                events.append(
                    FileChangeEvent(
                        file_path=file_path, change_type="created", timestamp=now
                    )
                )
            elif mtime > old_mtime:
                events.append(
                    FileChangeEvent(
                        file_path=file_path, change_type="modified", timestamp=now
                    )
                )

        # Check for deleted files
        for file_path in state.file_mtimes:
            if file_path not in current_files:
                events.append(
                    FileChangeEvent(
                        file_path=file_path, change_type="deleted", timestamp=now
                    )
                )

        # Update mtime cache
        state.file_mtimes = current_files

        # Broadcast events
        for event in events:
            for queue in state.subscribers:
                try:
                    queue.put_nowait(event)
                except asyncio.QueueFull:
                    pass


# Global singleton instance
file_watcher_manager = FileWatcherManager()
