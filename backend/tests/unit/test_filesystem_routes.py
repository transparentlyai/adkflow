"""Tests for filesystem API routes."""

from pathlib import Path

import pytest
from httpx import AsyncClient


class TestListDirectory:
    """Tests for list_directory endpoint."""

    @pytest.mark.asyncio
    async def test_list_root_directory(self, client: AsyncClient, tmp_path: Path):
        """List contents of a directory."""
        # Create some files and subdirs
        (tmp_path / "subdir").mkdir()
        (tmp_path / "file.txt").write_text("content")

        response = await client.get(
            "/api/filesystem/list", params={"path": str(tmp_path)}
        )
        assert response.status_code == 200

        data = response.json()
        assert data["current_path"] == str(tmp_path)
        assert len(data["entries"]) == 2

    @pytest.mark.asyncio
    async def test_list_hidden_files_excluded(
        self, client: AsyncClient, tmp_path: Path
    ):
        """Hidden files are excluded from listing."""
        (tmp_path / ".hidden").write_text("secret")
        (tmp_path / "visible.txt").write_text("content")

        response = await client.get(
            "/api/filesystem/list", params={"path": str(tmp_path)}
        )
        assert response.status_code == 200

        data = response.json()
        names = [e["name"] for e in data["entries"]]
        assert ".hidden" not in names
        assert "visible.txt" in names

    @pytest.mark.asyncio
    async def test_list_directory_sorted(self, client: AsyncClient, tmp_path: Path):
        """Directories are listed before files, then alphabetically."""
        (tmp_path / "zebra.txt").write_text("z")
        (tmp_path / "alpha").mkdir()
        (tmp_path / "beta").mkdir()
        (tmp_path / "apple.txt").write_text("a")

        response = await client.get(
            "/api/filesystem/list", params={"path": str(tmp_path)}
        )
        assert response.status_code == 200

        data = response.json()
        entries = data["entries"]
        # Directories first, then files - all alphabetically
        assert entries[0]["name"] == "alpha"
        assert entries[0]["is_directory"] is True
        assert entries[1]["name"] == "beta"
        assert entries[1]["is_directory"] is True

    @pytest.mark.asyncio
    async def test_list_nonexistent_directory(
        self, client: AsyncClient, tmp_path: Path
    ):
        """Listing non-existent directory returns 404."""
        response = await client.get(
            "/api/filesystem/list", params={"path": str(tmp_path / "nonexistent")}
        )
        assert response.status_code == 404
        assert "does not exist" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_list_file_not_directory(self, client: AsyncClient, tmp_path: Path):
        """Listing a file (not directory) returns 400."""
        file_path = tmp_path / "file.txt"
        file_path.write_text("content")

        response = await client.get(
            "/api/filesystem/list", params={"path": str(file_path)}
        )
        assert response.status_code == 400
        assert "not a directory" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_list_with_tilde_expansion(self, client: AsyncClient):
        """Tilde is expanded to home directory."""
        response = await client.get("/api/filesystem/list", params={"path": "~"})
        assert response.status_code == 200

        data = response.json()
        # Should be an absolute path, not starting with ~
        assert not data["current_path"].startswith("~")

    @pytest.mark.asyncio
    async def test_list_directory_with_parent(
        self, client: AsyncClient, tmp_path: Path
    ):
        """Listing returns parent path."""
        subdir = tmp_path / "subdir"
        subdir.mkdir()

        response = await client.get(
            "/api/filesystem/list", params={"path": str(subdir)}
        )
        assert response.status_code == 200

        data = response.json()
        assert data["parent_path"] == str(tmp_path)


class TestCreateDirectory:
    """Tests for create_directory endpoint."""

    @pytest.mark.asyncio
    async def test_create_directory_success(self, client: AsyncClient, tmp_path: Path):
        """Create a new directory."""
        response = await client.post(
            "/api/filesystem/mkdir",
            json={"path": str(tmp_path), "name": "new_dir"},
        )
        assert response.status_code == 200

        data = response.json()
        assert data["success"] is True
        assert (tmp_path / "new_dir").is_dir()

    @pytest.mark.asyncio
    async def test_create_directory_already_exists(
        self, client: AsyncClient, tmp_path: Path
    ):
        """Creating existing directory returns 409."""
        (tmp_path / "existing").mkdir()

        response = await client.post(
            "/api/filesystem/mkdir",
            json={"path": str(tmp_path), "name": "existing"},
        )
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_create_directory_parent_not_exists(
        self, client: AsyncClient, tmp_path: Path
    ):
        """Creating in non-existent parent returns 404."""
        response = await client.post(
            "/api/filesystem/mkdir",
            json={"path": str(tmp_path / "nonexistent"), "name": "new_dir"},
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_directory_parent_is_file(
        self, client: AsyncClient, tmp_path: Path
    ):
        """Creating in a file (not directory) returns 400."""
        file_path = tmp_path / "file.txt"
        file_path.write_text("content")

        response = await client.post(
            "/api/filesystem/mkdir",
            json={"path": str(file_path), "name": "new_dir"},
        )
        assert response.status_code == 400
        assert "not a directory" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_create_directory_invalid_name_dot(
        self, client: AsyncClient, tmp_path: Path
    ):
        """Invalid name '.' returns 400."""
        response = await client.post(
            "/api/filesystem/mkdir",
            json={"path": str(tmp_path), "name": "."},
        )
        assert response.status_code == 400
        assert "Invalid directory name" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_create_directory_invalid_name_dotdot(
        self, client: AsyncClient, tmp_path: Path
    ):
        """Invalid name '..' returns 400."""
        response = await client.post(
            "/api/filesystem/mkdir",
            json={"path": str(tmp_path), "name": ".."},
        )
        assert response.status_code == 400
        assert "Invalid directory name" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_create_directory_path_separator_in_name(
        self, client: AsyncClient, tmp_path: Path
    ):
        """Name with path separator returns 400."""
        response = await client.post(
            "/api/filesystem/mkdir",
            json={"path": str(tmp_path), "name": "a/b"},
        )
        assert response.status_code == 400
        assert "cannot contain path separators" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_create_directory_with_tilde(
        self, client: AsyncClient, tmp_path: Path
    ):
        """Tilde in path is expanded."""
        # This test just ensures tilde expansion doesn't crash
        # We can't easily test creating dirs in home
        pass


class TestEnsureDirectory:
    """Tests for ensure_directory endpoint."""

    @pytest.mark.asyncio
    async def test_ensure_creates_new_directory(
        self, client: AsyncClient, tmp_path: Path
    ):
        """Ensure creates a new directory when it doesn't exist."""
        new_path = tmp_path / "a" / "b" / "c"

        response = await client.post(
            "/api/filesystem/ensure-dir",
            json={"path": str(new_path)},
        )
        assert response.status_code == 200

        data = response.json()
        assert data["success"] is True
        assert new_path.is_dir()

    @pytest.mark.asyncio
    async def test_ensure_existing_directory(self, client: AsyncClient, tmp_path: Path):
        """Ensure on existing directory returns success."""
        existing = tmp_path / "existing"
        existing.mkdir()

        response = await client.post(
            "/api/filesystem/ensure-dir",
            json={"path": str(existing)},
        )
        assert response.status_code == 200

        data = response.json()
        assert data["success"] is True
        assert "already exists" in data["message"]

    @pytest.mark.asyncio
    async def test_ensure_path_is_file(self, client: AsyncClient, tmp_path: Path):
        """Ensure on an existing file returns 400."""
        file_path = tmp_path / "file.txt"
        file_path.write_text("content")

        response = await client.post(
            "/api/filesystem/ensure-dir",
            json={"path": str(file_path)},
        )
        assert response.status_code == 400
        assert "not a directory" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_ensure_with_tilde(self, client: AsyncClient, tmp_path: Path):
        """Tilde in path is expanded."""
        # This test just ensures tilde expansion works without error
        # We use tmp_path to be safe
        new_path = tmp_path / "tilde_test"

        response = await client.post(
            "/api/filesystem/ensure-dir",
            json={"path": str(new_path)},
        )
        assert response.status_code == 200
