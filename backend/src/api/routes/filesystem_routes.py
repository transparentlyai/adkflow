"""Filesystem API routes (directory listing, creation)."""

import os
from pathlib import Path

from fastapi import APIRouter, HTTPException, status, Query

from backend.src.api.routes.models import (
    DirectoryEntry,
    DirectoryListResponse,
    DirectoryCreateRequest,
    DirectoryCreateResponse,
    DirectoryEnsureRequest,
)

router = APIRouter()


@router.get("/filesystem/list", response_model=DirectoryListResponse)
async def list_directory(
    path: str = Query("/", description="Directory path to list"),
) -> DirectoryListResponse:
    """
    List contents of a directory on the server filesystem.

    Args:
        path: Directory path to list (default: root)

    Returns:
        DirectoryListResponse with directory contents

    Raises:
        HTTPException: If path is invalid or inaccessible
    """
    try:
        # Expand user home directory
        if path.startswith("~"):
            path = os.path.expanduser(path)

        # Resolve to absolute path
        current_path = Path(path).resolve()

        # Security: Prevent access outside allowed directories
        # For now, we'll allow any path but you may want to restrict this
        if not current_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Path does not exist: {path}",
            )

        if not current_path.is_dir():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Path is not a directory: {path}",
            )

        # Get parent path
        parent_path = (
            str(current_path.parent) if current_path != current_path.parent else None
        )

        # List directory contents
        entries = []
        try:
            for item in sorted(
                current_path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())
            ):
                # Skip hidden files/directories (starting with .)
                if item.name.startswith("."):
                    continue

                entries.append(
                    DirectoryEntry(
                        name=item.name, path=str(item), is_directory=item.is_dir()
                    )
                )
        except PermissionError:
            # If we can't read the directory, return empty list
            pass

        return DirectoryListResponse(
            current_path=str(current_path), parent_path=parent_path, entries=entries
        )

    except HTTPException:
        raise
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"Permission denied: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list directory: {str(e)}",
        )


@router.post("/filesystem/mkdir", response_model=DirectoryCreateResponse)
async def create_directory(request: DirectoryCreateRequest) -> DirectoryCreateResponse:
    """
    Create a new directory on the server filesystem.

    Args:
        request: Directory creation request with parent path and directory name

    Returns:
        DirectoryCreateResponse with created directory path

    Raises:
        HTTPException: If creation fails or directory already exists
    """
    try:
        # Expand user home directory if needed
        parent_path = request.path
        if parent_path.startswith("~"):
            parent_path = os.path.expanduser(parent_path)

        # Resolve to absolute path
        parent_dir = Path(parent_path).resolve()

        # Validate parent directory exists
        if not parent_dir.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Parent directory does not exist: {request.path}",
            )

        if not parent_dir.is_dir():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Path is not a directory: {request.path}",
            )

        # Sanitize directory name to prevent path traversal
        safe_name = request.name.strip()

        # Check for invalid characters and path traversal attempts
        if not safe_name or safe_name in [".", ".."]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid directory name"
            )

        if "/" in safe_name or "\\" in safe_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Directory name cannot contain path separators",
            )

        # Create the new directory
        new_dir = parent_dir / safe_name

        if new_dir.exists():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Directory '{safe_name}' already exists",
            )

        new_dir.mkdir(parents=False, exist_ok=False)

        return DirectoryCreateResponse(
            success=True,
            created_path=str(new_dir),
            message=f"Directory '{safe_name}' created successfully",
        )

    except HTTPException:
        raise
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"Permission denied: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create directory: {str(e)}",
        )


@router.post("/filesystem/ensure-dir", response_model=DirectoryCreateResponse)
async def ensure_directory(request: DirectoryEnsureRequest) -> DirectoryCreateResponse:
    """
    Ensure a directory exists, creating it and any parent directories if needed.

    Args:
        request: Request with the full directory path to ensure

    Returns:
        DirectoryCreateResponse with the directory path

    Raises:
        HTTPException: If creation fails
    """
    try:
        # Expand user home directory if needed
        dir_path = request.path
        if dir_path.startswith("~"):
            dir_path = os.path.expanduser(dir_path)

        # Resolve to absolute path
        target_dir = Path(dir_path).resolve()

        # Check if it already exists
        if target_dir.exists():
            if not target_dir.is_dir():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Path exists but is not a directory: {request.path}",
                )
            return DirectoryCreateResponse(
                success=True,
                created_path=str(target_dir),
                message="Directory already exists",
            )

        # Create directory and all parents
        target_dir.mkdir(parents=True, exist_ok=True)

        return DirectoryCreateResponse(
            success=True,
            created_path=str(target_dir),
            message="Directory created successfully",
        )

    except HTTPException:
        raise
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"Permission denied: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ensure directory: {str(e)}",
        )
