"""API routes for project settings management."""

import json
import re
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from backend.src.models.workflow import ProjectManifest, ProjectSettings


router = APIRouter()


class EnvSettings(BaseModel):
    """Environment settings from .env file."""

    model_config = {"populate_by_name": True}

    auth_mode: Literal["api_key", "vertex_ai"] = Field(
        default="api_key",
        alias="authMode",
        serialization_alias="authMode",
    )
    has_api_key: bool = Field(
        default=False,
        alias="hasApiKey",
        serialization_alias="hasApiKey",
    )
    api_key_masked: str | None = Field(
        default=None,
        alias="apiKeyMasked",
        serialization_alias="apiKeyMasked",
    )
    google_cloud_project: str | None = Field(
        default=None,
        alias="googleCloudProject",
        serialization_alias="googleCloudProject",
    )
    google_cloud_location: str | None = Field(
        default=None,
        alias="googleCloudLocation",
        serialization_alias="googleCloudLocation",
    )


class SettingsResponse(BaseModel):
    """Response model for project settings."""

    settings: ProjectSettings
    env: EnvSettings


class EnvSettingsUpdate(BaseModel):
    """Environment settings update request."""

    model_config = {"populate_by_name": True}

    auth_mode: Literal["api_key", "vertex_ai"] = Field(
        default="api_key", alias="authMode", description="Authentication mode"
    )
    api_key: str | None = Field(
        default=None, alias="apiKey", description="API key (empty string = don't update)"
    )
    google_cloud_project: str | None = Field(
        default=None, alias="googleCloudProject", description="Google Cloud project ID"
    )
    google_cloud_location: str | None = Field(
        default=None, alias="googleCloudLocation", description="Google Cloud location"
    )


class SettingsUpdateRequest(BaseModel):
    """Request model for updating project settings."""

    project_path: str = Field(..., description="Project directory path")
    settings: ProjectSettings = Field(..., description="Project settings")
    env: EnvSettingsUpdate = Field(..., description="Environment settings")


class SettingsUpdateResponse(BaseModel):
    """Response model for settings update."""

    success: bool


def mask_api_key(api_key: str) -> str:
    """Mask an API key for display, showing only first 4 and last 4 characters."""
    if len(api_key) <= 8:
        return "****"
    return f"{api_key[:4]}...{api_key[-4:]}"


def parse_env_file(env_path: Path) -> dict[str, str]:
    """Parse a .env file into a dictionary."""
    env_vars: dict[str, str] = {}
    if not env_path.exists():
        return env_vars

    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            # Skip empty lines and comments
            if not line or line.startswith("#"):
                continue
            # Parse KEY=VALUE
            match = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)=(.*)$", line)
            if match:
                key, value = match.groups()
                # Remove surrounding quotes if present
                value = value.strip()
                if (value.startswith('"') and value.endswith('"')) or (
                    value.startswith("'") and value.endswith("'")
                ):
                    value = value[1:-1]
                env_vars[key] = value

    return env_vars


def write_env_file(env_path: Path, env_vars: dict[str, str]) -> None:
    """Write environment variables to a .env file."""
    lines = []

    # Determine auth mode
    use_vertex = env_vars.get("GOOGLE_GENAI_USE_VERTEXAI", "").lower() == "true"

    if use_vertex:
        lines.append("# Vertex AI Authentication")
        lines.append("GOOGLE_GENAI_USE_VERTEXAI=true")
        if env_vars.get("GOOGLE_CLOUD_PROJECT"):
            lines.append(f"GOOGLE_CLOUD_PROJECT={env_vars['GOOGLE_CLOUD_PROJECT']}")
        if env_vars.get("GOOGLE_CLOUD_LOCATION"):
            lines.append(f"GOOGLE_CLOUD_LOCATION={env_vars['GOOGLE_CLOUD_LOCATION']}")
    else:
        lines.append("# Google AI API Key Authentication")
        lines.append("GOOGLE_GENAI_USE_VERTEXAI=false")
        if env_vars.get("GOOGLE_API_KEY"):
            lines.append(f"GOOGLE_API_KEY={env_vars['GOOGLE_API_KEY']}")

    with open(env_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


@router.get("/project/settings", response_model=SettingsResponse)
async def get_project_settings(
    path: str = Query(..., description="Project directory path"),
) -> SettingsResponse:
    """
    Get project settings from manifest.json and .env file.

    Args:
        path: Project directory path

    Returns:
        SettingsResponse with project settings and env configuration

    Raises:
        HTTPException: If reading fails
    """
    try:
        project_path = Path(path).resolve()
        manifest_file = project_path / "manifest.json"
        env_file = project_path / ".env"

        # Load settings from manifest
        settings = ProjectSettings()
        if manifest_file.exists():
            with open(manifest_file, "r", encoding="utf-8") as f:
                manifest_data = json.load(f)
            manifest = ProjectManifest(**manifest_data)
            settings = manifest.settings

        # Load env settings
        env_vars = parse_env_file(env_file)

        # Determine auth mode
        use_vertex = env_vars.get("GOOGLE_GENAI_USE_VERTEXAI", "").lower() == "true"
        auth_mode: Literal["api_key", "vertex_ai"] = (
            "vertex_ai" if use_vertex else "api_key"
        )

        # Get API key info (masked)
        api_key = env_vars.get("GOOGLE_API_KEY", "")
        has_api_key = bool(api_key)
        api_key_masked = mask_api_key(api_key) if has_api_key else None

        env_settings = EnvSettings(
            auth_mode=auth_mode,
            has_api_key=has_api_key,
            api_key_masked=api_key_masked,
            google_cloud_project=env_vars.get("GOOGLE_CLOUD_PROJECT"),
            google_cloud_location=env_vars.get("GOOGLE_CLOUD_LOCATION"),
        )

        return SettingsResponse(settings=settings, env=env_settings)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load project settings: {str(e)}",
        )


@router.put("/project/settings", response_model=SettingsUpdateResponse)
async def update_project_settings(
    request: SettingsUpdateRequest,
) -> SettingsUpdateResponse:
    """
    Update project settings in manifest.json and .env file.

    Args:
        request: Settings update request

    Returns:
        SettingsUpdateResponse with success status

    Raises:
        HTTPException: If update fails
    """
    try:
        project_path = Path(request.project_path).resolve()
        manifest_file = project_path / "manifest.json"
        env_file = project_path / ".env"

        # Load or create manifest
        if manifest_file.exists():
            with open(manifest_file, "r", encoding="utf-8") as f:
                manifest_data = json.load(f)
            manifest = ProjectManifest(**manifest_data)
        else:
            manifest = ProjectManifest()

        # Update settings
        manifest.settings = request.settings

        # Save manifest (use by_alias for camelCase in JSON)
        with open(manifest_file, "w", encoding="utf-8") as f:
            json.dump(manifest.model_dump(exclude_none=True, by_alias=True), f, indent=2)

        # Load existing env vars
        existing_env = parse_env_file(env_file)

        # Build new env vars
        new_env: dict[str, str] = {}

        if request.env.auth_mode == "vertex_ai":
            new_env["GOOGLE_GENAI_USE_VERTEXAI"] = "true"
            if request.env.google_cloud_project:
                new_env["GOOGLE_CLOUD_PROJECT"] = request.env.google_cloud_project
            if request.env.google_cloud_location:
                new_env["GOOGLE_CLOUD_LOCATION"] = request.env.google_cloud_location
        else:
            new_env["GOOGLE_GENAI_USE_VERTEXAI"] = "false"
            # Only update API key if a non-empty value is provided
            if request.env.api_key:
                new_env["GOOGLE_API_KEY"] = request.env.api_key
            elif existing_env.get("GOOGLE_API_KEY"):
                # Keep existing API key if not updating
                new_env["GOOGLE_API_KEY"] = existing_env["GOOGLE_API_KEY"]

        # Write env file
        write_env_file(env_file, new_env)

        return SettingsUpdateResponse(success=True)

    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update project settings: {str(e)}",
        )
