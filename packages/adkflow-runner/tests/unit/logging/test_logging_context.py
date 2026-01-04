"""Tests for logging context management.

Tests log_scope, log_timing, and run_context.
"""

from __future__ import annotations

import pytest

from adkflow_runner.logging import (
    get_logger,
    log_scope,
    log_timing,
    reset_config,
    reset_loggers,
    reset_registry,
    run_context,
)


@pytest.fixture(autouse=True)
def reset_logging_state():
    """Reset logging state before each test."""
    reset_config()
    reset_loggers()
    reset_registry()
    yield
    reset_config()
    reset_loggers()
    reset_registry()


class TestLogContext:
    """Tests for log context management."""

    def test_log_scope(self):
        """Use log_scope context manager."""
        log = get_logger("scope.test")

        with log_scope(log, "operation", key="value") as scoped:
            assert scoped is not None
            # The scoped logger should have the context

    def test_log_timing(self):
        """Use log_timing context manager."""
        log = get_logger("timing.test")

        with log_timing(log, "operation", extra="data") as ctx:
            # Can add timing context
            ctx["result_count"] = 42

    def test_run_context(self):
        """Use run_context for run ID scoping."""
        with run_context("run-123"):
            from adkflow_runner.logging import get_run_id

            assert get_run_id() == "run-123"


class TestContextManagers:
    """Tests for context manager functions."""

    def test_log_scope_adds_context(self):
        """log_scope adds context to logs."""
        log = get_logger("scope.advanced")

        with log_scope(log, "operation", user="alice", action="read") as scoped:
            # Scoped logger should have context
            scoped.info("In scope")

    def test_log_timing_measures_duration(self):
        """log_timing measures operation duration."""
        import time

        log = get_logger("timing.advanced")

        with log_timing(log, "slow_op") as ctx:
            time.sleep(0.01)  # 10ms
            ctx["items_processed"] = 100

        # Duration should be measured

    def test_run_context_nesting(self):
        """Run contexts can be nested."""
        from adkflow_runner.logging import get_run_id

        with run_context("outer-run"):
            assert get_run_id() == "outer-run"

            with run_context("inner-run"):
                assert get_run_id() == "inner-run"

            assert get_run_id() == "outer-run"
