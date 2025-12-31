"""File watching logic for extension hot-reload."""

import threading
import time
from pathlib import Path
from typing import Callable

from adkflow_runner.extensions.types import ExtensionScope


class FileWatcher:
    """Watches extension directories for changes and triggers reloads."""

    def __init__(
        self,
        check_callback: Callable[[Path, ExtensionScope], None],
    ):
        """Initialize the file watcher.

        Args:
            check_callback: Function to call when checking for changes.
                           Takes (watch_path, scope) as arguments.
        """
        self._check_callback = check_callback

        # File watching - separate for each location
        self._global_watch_thread: threading.Thread | None = None
        self._project_watch_thread: threading.Thread | None = None
        self._legacy_watch_thread: threading.Thread | None = None

        self._stop_global_watching: threading.Event = threading.Event()
        self._stop_project_watching: threading.Event = threading.Event()
        self._stop_legacy_watching: threading.Event = threading.Event()

        # Paths being watched
        self._global_path: Path | None = None
        self._project_path: Path | None = None
        self._legacy_path: Path | None = None

    def start_watching(
        self,
        path: Path,
        poll_interval: float = 1.0,
        scope: ExtensionScope = ExtensionScope.PROJECT,
    ) -> None:
        """Start watching a path for changes (legacy single-path).

        Args:
            path: Directory to watch
            poll_interval: Seconds between file change checks
            scope: Scope for discovered units
        """
        if self._legacy_watch_thread is not None:
            return

        self._legacy_path = path
        self._stop_legacy_watching.clear()
        self._legacy_watch_thread = threading.Thread(
            target=self._watch_loop,
            args=(poll_interval, path, self._stop_legacy_watching, scope),
            daemon=True,
        )
        self._legacy_watch_thread.start()

    def start_watching_global(self, path: Path, poll_interval: float = 1.0) -> None:
        """Start file watcher for global extensions.

        Args:
            path: Global extensions directory
            poll_interval: Seconds between file change checks
        """
        if self._global_watch_thread is not None:
            return

        self._global_path = path
        self._stop_global_watching.clear()
        self._global_watch_thread = threading.Thread(
            target=self._watch_loop,
            args=(
                poll_interval,
                path,
                self._stop_global_watching,
                ExtensionScope.GLOBAL,
            ),
            daemon=True,
        )
        self._global_watch_thread.start()

    def start_watching_project(self, path: Path, poll_interval: float = 1.0) -> None:
        """Start file watcher for project extensions.

        Args:
            path: Project extensions directory
            poll_interval: Seconds between file change checks
        """
        if self._project_watch_thread is not None:
            return

        self._project_path = path
        self._stop_project_watching.clear()
        self._project_watch_thread = threading.Thread(
            target=self._watch_loop,
            args=(
                poll_interval,
                path,
                self._stop_project_watching,
                ExtensionScope.PROJECT,
            ),
            daemon=True,
        )
        self._project_watch_thread.start()

    def _watch_loop(
        self,
        poll_interval: float,
        watch_path: Path,
        stop_event: threading.Event,
        scope: ExtensionScope,
    ) -> None:
        """Background thread for watching file changes."""
        while not stop_event.is_set():
            try:
                self._check_callback(watch_path, scope)
            except Exception as e:
                print(f"[FileWatcher] Watch error for {scope.value}: {e}")
            time.sleep(poll_interval)

    def stop_watching(self) -> None:
        """Stop all file watchers."""
        self._stop_legacy_watching.set()
        self._stop_global_watching.set()
        self._stop_project_watching.set()

        if self._legacy_watch_thread:
            self._legacy_watch_thread.join(timeout=2.0)
            self._legacy_watch_thread = None
        if self._global_watch_thread:
            self._global_watch_thread.join(timeout=2.0)
            self._global_watch_thread = None
        if self._project_watch_thread:
            self._project_watch_thread.join(timeout=2.0)
            self._project_watch_thread = None

    def stop_watching_global(self) -> None:
        """Stop global file watcher."""
        self._stop_global_watching.set()
        if self._global_watch_thread:
            self._global_watch_thread.join(timeout=2.0)
            self._global_watch_thread = None

    def stop_watching_project(self) -> None:
        """Stop project file watcher."""
        self._stop_project_watching.set()
        if self._project_watch_thread:
            self._project_watch_thread.join(timeout=2.0)
            self._project_watch_thread = None
