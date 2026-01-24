"""Tests for CLI health module.

Tests health check and auto-repair functionality for:
- Frontend dependency verification
- Frontend dependency repair
- Auto-repair orchestration
"""

from __future__ import annotations

import subprocess
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from cli.health import (
    ensure_frontend_deps,
    repair_frontend_deps,
    verify_frontend_deps,
)


@pytest.fixture
def frontend_dir(tmp_path: Path) -> Path:
    """Create a mock frontend directory structure."""
    frontend = tmp_path / "frontend"
    frontend.mkdir()
    node_modules = frontend / "node_modules"
    node_modules.mkdir()

    # Create .bin directory and next binary
    bin_dir = node_modules / ".bin"
    bin_dir.mkdir()
    next_bin = bin_dir / "next"
    next_bin.touch()
    next_bin.chmod(0o755)

    # Create critical Next.js files
    next_dir = node_modules / "next"
    next_dir.mkdir()
    (next_dir / "package.json").write_text('{"name": "next"}')

    dist_dir = next_dir / "dist"
    dist_dir.mkdir()

    server_dir = dist_dir / "server"
    server_dir.mkdir()
    (server_dir / "require-hook.js").touch()

    bin_dist_dir = dist_dir / "bin"
    bin_dist_dir.mkdir()
    (bin_dist_dir / "next").touch()

    return frontend


class TestVerifyFrontendDeps:
    """Tests for verify_frontend_deps function."""

    def test_returns_true_when_all_deps_present(self, frontend_dir: Path):
        """Verify returns True when all dependencies are present and healthy."""
        with patch("cli.health.subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0, stderr=b"")

            result = verify_frontend_deps(frontend_dir)

            assert result is True
            mock_run.assert_called_once()

    def test_returns_false_when_node_modules_missing(self, tmp_path: Path):
        """Verify returns False when node_modules directory is missing."""
        frontend = tmp_path / "frontend"
        frontend.mkdir()

        result = verify_frontend_deps(frontend)

        assert result is False

    def test_returns_false_when_next_binary_missing(self, frontend_dir: Path):
        """Verify returns False when next binary is missing."""
        next_bin = frontend_dir / "node_modules" / ".bin" / "next"
        next_bin.unlink()

        result = verify_frontend_deps(frontend_dir)

        assert result is False

    def test_returns_false_when_critical_file_missing(self, frontend_dir: Path):
        """Verify returns False when a critical Next.js file is missing."""
        critical_file = (
            frontend_dir
            / "node_modules"
            / "next"
            / "dist"
            / "server"
            / "require-hook.js"
        )
        critical_file.unlink()

        result = verify_frontend_deps(frontend_dir)

        assert result is False

    def test_returns_false_when_next_version_fails(self, frontend_dir: Path):
        """Verify returns False when next --version command fails."""
        with patch("cli.health.subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=1, stderr=b"Error")

            result = verify_frontend_deps(frontend_dir)

            assert result is False

    def test_returns_false_when_next_version_times_out(self, frontend_dir: Path):
        """Verify returns False when next --version times out."""
        with patch("cli.health.subprocess.run") as mock_run:
            mock_run.side_effect = subprocess.TimeoutExpired("next", 10)

            result = verify_frontend_deps(frontend_dir)

            assert result is False

    def test_returns_false_when_node_not_found(self, frontend_dir: Path):
        """Verify returns False when node is not found."""
        with patch("cli.health.subprocess.run") as mock_run:
            mock_run.side_effect = FileNotFoundError("node not found")

            result = verify_frontend_deps(frontend_dir)

            assert result is False

    def test_uses_absolute_paths(self, frontend_dir: Path):
        """Verify uses absolute paths to avoid cwd confusion."""
        with patch("cli.health.subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0)

            verify_frontend_deps(frontend_dir)

            # Check that subprocess was called with absolute path
            call_args = mock_run.call_args
            assert str(frontend_dir.resolve()) in str(call_args)

    def test_checks_all_critical_files(self, frontend_dir: Path):
        """Verify checks all three critical Next.js files."""
        with patch("cli.health.subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0)

            # Verify passes with all files
            assert verify_frontend_deps(frontend_dir) is True

            # Remove each critical file and verify fails
            critical_files = [
                "node_modules/next/dist/server/require-hook.js",
                "node_modules/next/dist/bin/next",
                "node_modules/next/package.json",
            ]

            for file_path in critical_files:
                full_path = frontend_dir / file_path
                if full_path.exists():
                    full_path.unlink()
                    assert verify_frontend_deps(frontend_dir) is False
                    # Restore file for next iteration
                    full_path.parent.mkdir(parents=True, exist_ok=True)
                    full_path.touch()


class TestRepairFrontendDeps:
    """Tests for repair_frontend_deps function."""

    def test_returns_true_when_repair_succeeds(self, frontend_dir: Path):
        """Repair returns True when reinstallation succeeds."""
        with patch("cli.health.subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0)
            with patch("cli.health.verify_frontend_deps", return_value=True):
                with patch("cli.health.print_msg"):
                    result = repair_frontend_deps(frontend_dir)

                    assert result is True

    def test_removes_node_modules_before_reinstall(self, frontend_dir: Path):
        """Repair removes corrupted node_modules before reinstalling."""
        with patch("cli.health.subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0)
            with patch("cli.health.verify_frontend_deps", return_value=True):
                with patch("cli.health.print_msg"):
                    repair_frontend_deps(frontend_dir)

                    # Check rm -rf was called
                    rm_called = any(
                        "rm" in str(c[0][0]) and "-rf" in str(c[0])
                        for c in mock_run.call_args_list
                    )
                    assert rm_called

    def test_runs_npm_install(self, frontend_dir: Path):
        """Repair runs npm install in frontend directory."""
        with patch("cli.health.subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0)
            with patch("cli.health.verify_frontend_deps", return_value=True):
                with patch("cli.health.print_msg"):
                    repair_frontend_deps(frontend_dir)

                    # Check npm install was called
                    npm_called = any(
                        "npm" in str(c[0][0]) and "install" in str(c[0])
                        for c in mock_run.call_args_list
                    )
                    assert npm_called

    def test_returns_false_when_rm_fails(self, frontend_dir: Path):
        """Repair returns False when removing node_modules fails."""
        with patch("cli.health.subprocess.run") as mock_run:
            mock_run.side_effect = subprocess.CalledProcessError(1, "rm")
            with patch("cli.health.print_msg"):
                result = repair_frontend_deps(frontend_dir)

                assert result is False

    def test_returns_false_when_npm_install_fails(self, frontend_dir: Path):
        """Repair returns False when npm install fails."""
        with patch("cli.health.subprocess.run") as mock_run:
            # rm succeeds, npm install fails
            mock_run.side_effect = [
                MagicMock(returncode=0),  # rm succeeds
                MagicMock(returncode=1, stderr=b"npm error"),  # npm install fails
            ]
            with patch("cli.health.print_msg"):
                result = repair_frontend_deps(frontend_dir)

                assert result is False

    def test_returns_false_when_npm_install_times_out(self, frontend_dir: Path):
        """Repair returns False when npm install times out."""
        with patch("cli.health.subprocess.run") as mock_run:
            # rm succeeds, npm install times out
            mock_run.side_effect = [
                MagicMock(returncode=0),  # rm succeeds
                subprocess.TimeoutExpired("npm", 300),  # npm install times out
            ]
            with patch("cli.health.print_msg"):
                result = repair_frontend_deps(frontend_dir)

                assert result is False

    def test_returns_false_when_npm_not_found(self, frontend_dir: Path):
        """Repair returns False when npm is not found."""
        with patch("cli.health.subprocess.run") as mock_run:
            # rm succeeds, npm not found
            mock_run.side_effect = [
                MagicMock(returncode=0),  # rm succeeds
                FileNotFoundError("npm not found"),  # npm not found
            ]
            with patch("cli.health.print_msg"):
                result = repair_frontend_deps(frontend_dir)

                assert result is False

    def test_returns_false_when_verification_fails_after_repair(
        self, frontend_dir: Path
    ):
        """Repair returns False when verification fails after reinstall."""
        with patch("cli.health.subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0)
            with patch("cli.health.verify_frontend_deps", return_value=False):
                with patch("cli.health.print_msg"):
                    result = repair_frontend_deps(frontend_dir)

                    assert result is False

    def test_uses_absolute_paths(self, frontend_dir: Path):
        """Repair uses absolute paths to avoid cwd confusion."""
        with patch("cli.health.subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0)
            with patch("cli.health.verify_frontend_deps", return_value=True):
                with patch("cli.health.print_msg"):
                    repair_frontend_deps(frontend_dir)

                    # Check that subprocess was called with absolute path
                    npm_call = [
                        c for c in mock_run.call_args_list if "npm" in str(c[0][0])
                    ][0]
                    assert "cwd" in npm_call[1]
                    assert str(frontend_dir.resolve()) in str(npm_call[1]["cwd"])

    def test_has_reasonable_timeout(self, frontend_dir: Path):
        """Repair uses a reasonable timeout for npm install."""
        with patch("cli.health.subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0)
            with patch("cli.health.verify_frontend_deps", return_value=True):
                with patch("cli.health.print_msg"):
                    repair_frontend_deps(frontend_dir)

                    # Check npm install has a timeout
                    npm_call = [
                        c for c in mock_run.call_args_list if "npm" in str(c[0][0])
                    ][0]
                    assert "timeout" in npm_call[1]
                    # Timeout should be at least 60 seconds but not too long
                    assert 60 <= npm_call[1]["timeout"] <= 600

    def test_prints_progress_messages(self, frontend_dir: Path):
        """Repair prints progress messages during repair process."""
        with patch("cli.health.subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0)
            with patch("cli.health.verify_frontend_deps", return_value=True):
                with patch("cli.health.print_msg") as mock_print:
                    repair_frontend_deps(frontend_dir)

                    # Should print at least 3 messages
                    assert mock_print.call_count >= 3


class TestEnsureFrontendDeps:
    """Tests for ensure_frontend_deps function."""

    def test_returns_true_when_deps_already_healthy(self, frontend_dir: Path):
        """Ensure returns True immediately if deps are already healthy."""
        with patch("cli.health.verify_frontend_deps", return_value=True):
            with patch("cli.health.repair_frontend_deps") as mock_repair:
                result = ensure_frontend_deps(frontend_dir)

                assert result is True
                mock_repair.assert_not_called()

    def test_repairs_when_verification_fails(self, frontend_dir: Path):
        """Ensure attempts repair when verification fails."""
        with patch("cli.health.verify_frontend_deps", return_value=False):
            with patch(
                "cli.health.repair_frontend_deps", return_value=True
            ) as mock_repair:
                with patch("cli.health.print_msg"):
                    result = ensure_frontend_deps(frontend_dir)

                    assert result is True
                    mock_repair.assert_called_once_with(frontend_dir)

    def test_returns_false_when_repair_fails(self, frontend_dir: Path):
        """Ensure returns False when repair fails."""
        with patch("cli.health.verify_frontend_deps", return_value=False):
            with patch("cli.health.repair_frontend_deps", return_value=False):
                with patch("cli.health.print_msg"):
                    result = ensure_frontend_deps(frontend_dir)

                    assert result is False

    def test_prints_corruption_message_before_repair(self, frontend_dir: Path):
        """Ensure prints message about corruption before attempting repair."""
        with patch("cli.health.verify_frontend_deps", return_value=False):
            with patch("cli.health.repair_frontend_deps", return_value=True):
                with patch("cli.health.print_msg") as mock_print:
                    ensure_frontend_deps(frontend_dir)

                    # Should print corruption message
                    corruption_msg = any(
                        "corrupt" in str(c[0][0]).lower()
                        for c in mock_print.call_args_list
                    )
                    assert corruption_msg

    def test_orchestrates_verify_then_repair_sequence(self, frontend_dir: Path):
        """Ensure orchestrates the verify-then-repair sequence."""
        call_order = []

        def track_verify(*args, **kwargs):
            call_order.append("verify")
            return False

        def track_repair(*args, **kwargs):
            call_order.append("repair")
            return True

        with patch("cli.health.verify_frontend_deps", side_effect=track_verify):
            with patch("cli.health.repair_frontend_deps", side_effect=track_repair):
                with patch("cli.health.print_msg"):
                    ensure_frontend_deps(frontend_dir)

                    assert call_order == ["verify", "repair"]
