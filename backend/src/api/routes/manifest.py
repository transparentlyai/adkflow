"""Shared manifest.json loading and saving utilities.

This module provides a single source of truth for loading and saving
the project manifest.json file. All routes should use these functions
to ensure consistency and preserve all fields.
"""

import json
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status

from backend.src.models.workflow import ProjectManifest


def load_manifest(
    project_path: Path | str, create_if_missing: bool = False
) -> ProjectManifest:
    """Load manifest.json from project path.

    Args:
        project_path: Path to project directory
        create_if_missing: If True, create an empty manifest if it doesn't exist

    Returns:
        ProjectManifest

    Raises:
        HTTPException: If manifest not found and create_if_missing is False
    """
    project_path = Path(project_path).resolve()
    manifest_file = project_path / "manifest.json"

    if not manifest_file.exists():
        if create_if_missing:
            # Create project directory if needed
            project_path.mkdir(parents=True, exist_ok=True)
            # Return empty manifest (will be saved by caller)
            return ProjectManifest(
                name=project_path.name,
                tabs=[],
                nodes=[],
                edges=[],
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project manifest not found: {manifest_file}",
        )

    with open(manifest_file, "r", encoding="utf-8") as f:
        manifest_data = json.load(f)

    return ProjectManifest(**manifest_data)


def load_manifest_raw(project_path: Path | str) -> dict[str, Any]:
    """Load manifest.json as raw dict (for cases where we need to preserve unknown fields).

    Args:
        project_path: Path to project directory

    Returns:
        Dict with manifest data, or empty dict if file doesn't exist
    """
    project_path = Path(project_path).resolve()
    manifest_file = project_path / "manifest.json"

    if not manifest_file.exists():
        return {}

    with open(manifest_file, "r", encoding="utf-8") as f:
        return json.load(f)


def save_manifest(project_path: Path | str, manifest: ProjectManifest) -> None:
    """Save manifest.json to project path.

    Args:
        project_path: Path to project directory
        manifest: ProjectManifest to save

    Raises:
        HTTPException: If save fails
    """
    project_path = Path(project_path).resolve()
    manifest_file = project_path / "manifest.json"

    try:
        with open(manifest_file, "w", encoding="utf-8") as f:
            # Use by_alias=True for camelCase serialization (e.g., defaultModel)
            json.dump(
                manifest.model_dump(exclude_none=True, by_alias=True), f, indent=2
            )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied when saving manifest: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save manifest: {str(e)}",
        )
