"""Debug API routes for development mode only.

These routes are only registered when ADKFLOW_DEV_MODE=1.
They provide runtime configuration for logging and debugging.
Settings are persisted to the project's manifest.json under the "logging" key.
"""

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Query, HTTPException, status
from pydantic import BaseModel, Field

# Import logging configuration from adkflow_runner
from adkflow_runner.logging import (
    LogLevel,
    get_config,
    set_config,
    get_registry,
    reset_config as _reset_config,
    LogConfig,
)


router = APIRouter(prefix="/api/debug", tags=["debug"])


class CategoryInfo(BaseModel):
    """Information about a logging category."""

    name: str = Field(..., description="Category name (e.g., 'api.request')")
    level: str = Field(..., description="Current log level")
    enabled: bool = Field(..., description="Whether this category is enabled")
    children: list[str] = Field(
        default_factory=list, description="Child category names"
    )


class LoggingConfigResponse(BaseModel):
    """Response model for logging configuration."""

    global_level: str = Field(..., description="Global log level")
    categories: dict[str, str] = Field(
        default_factory=dict,
        description="Category-specific log levels",
    )
    file_enabled: bool = Field(
        default=False, description="Whether file logging is enabled"
    )
    file_path: str | None = Field(default=None, description="Log file path")
    console_colored: bool = Field(
        default=True, description="Whether console output is colored"
    )
    console_format: str = Field(default="readable", description="Console output format")


class LoggingConfigUpdate(BaseModel):
    """Request model for updating logging configuration."""

    global_level: str | None = Field(
        default=None,
        description="Global log level (DEBUG/INFO/WARNING/ERROR)",
    )
    categories: dict[str, str] | None = Field(
        default=None,
        description="Category-specific log levels",
    )
    file_enabled: bool | None = Field(
        default=None,
        description="Enable/disable file logging",
    )
    console_colored: bool | None = Field(
        default=None,
        description="Enable/disable colored console output",
    )


class LoggingConfigUpdateResponse(BaseModel):
    """Response model for logging configuration update."""

    success: bool
    config: LoggingConfigResponse


def _get_level_name(level: LogLevel | int) -> str:
    """Convert LogLevel to string name."""
    if isinstance(level, int):
        level_map = {
            10: "DEBUG",
            20: "INFO",
            30: "WARNING",
            40: "ERROR",
            50: "CRITICAL",
        }
        return level_map.get(level, "INFO")
    return level.name


def _parse_level(level_str: str) -> LogLevel:
    """Parse level string to LogLevel enum."""
    level_map = {
        "DEBUG": LogLevel.DEBUG,
        "INFO": LogLevel.INFO,
        "WARNING": LogLevel.WARNING,
        "ERROR": LogLevel.ERROR,
        "CRITICAL": LogLevel.CRITICAL,
    }
    return level_map.get(level_str.upper(), LogLevel.INFO)


def _load_manifest(project_path: str) -> dict[str, Any]:
    """Load manifest.json from project directory."""
    manifest_file = Path(project_path) / "manifest.json"
    if manifest_file.exists():
        with open(manifest_file) as f:
            return json.load(f)
    return {}


def _save_manifest(project_path: str, manifest: dict[str, Any]) -> None:
    """Save manifest.json to project directory."""
    manifest_file = Path(project_path) / "manifest.json"
    try:
        with open(manifest_file, "w") as f:
            json.dump(manifest, f, indent=2)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save manifest: {str(e)}",
        )


def _load_project_config(project_path: str | None) -> LogConfig:
    """Load logging config from project's manifest.json if it exists."""
    config = get_config()

    if not project_path:
        return config

    manifest = _load_manifest(project_path)
    logging_data = manifest.get("logging")

    if logging_data:
        try:
            # Apply settings from manifest
            if "level" in logging_data:
                config.level = _parse_level(logging_data["level"])

            if "categories" in logging_data:
                for cat, level_str in logging_data["categories"].items():
                    config.categories[cat] = _parse_level(level_str)

            if "file" in logging_data:
                fc = logging_data["file"]
                if "enabled" in fc:
                    config.file.enabled = fc["enabled"]

            if "console" in logging_data:
                cc = logging_data["console"]
                if "colored" in cc:
                    config.console.colored = cc["colored"]
                if "format" in cc:
                    config.console.format = cc["format"]

            # Apply to runtime
            set_config(config)

            # Update registry
            registry = get_registry()
            registry.set_default_level(config.level)
            for cat_pattern, level in config.categories.items():
                registry.set_level(cat_pattern, level)

        except Exception:
            # If loading fails, just use the current config
            pass

    return config


def _save_project_config(project_path: str | None, config: LogConfig) -> None:
    """Save logging config to project's manifest.json."""
    if not project_path:
        return

    # Load existing manifest
    manifest = _load_manifest(project_path)

    # Build logging config dict
    logging_data: dict[str, Any] = {
        "level": _get_level_name(config.level),
    }

    # Only save non-empty categories
    if config.categories:
        logging_data["categories"] = {
            cat: _get_level_name(level) for cat, level in config.categories.items()
        }

    # Save file settings if not default
    if not config.file.enabled:
        logging_data["file"] = {"enabled": False}

    # Save console settings if not default
    if not config.console.colored or config.console.format != "readable":
        logging_data["console"] = {}
        if not config.console.colored:
            logging_data["console"]["colored"] = False
        if config.console.format != "readable":
            logging_data["console"]["format"] = config.console.format

    # Update manifest with logging config
    manifest["logging"] = logging_data

    # Save manifest
    _save_manifest(project_path, manifest)


@router.get("/logging", response_model=LoggingConfigResponse)
async def get_logging_config(
    project_path: str | None = Query(None, description="Project directory path"),
) -> LoggingConfigResponse:
    """
    Get current logging configuration.

    Args:
        project_path: Optional project path to load project-specific config

    Returns:
        LoggingConfigResponse with current logging settings

    Note:
        This endpoint is only available in development mode.
    """
    config = _load_project_config(project_path)
    registry = get_registry()

    # Build category levels from registry
    category_levels: dict[str, str] = {}
    for category in registry.get_all_categories():
        level = registry.get_level(category)
        if level is not None:
            category_levels[category] = _get_level_name(level)

    return LoggingConfigResponse(
        global_level=_get_level_name(config.level),
        categories=category_levels,
        file_enabled=config.file.enabled,
        file_path=config.file.path,
        console_colored=config.console.colored,
        console_format=config.console.format,
    )


@router.put("/logging", response_model=LoggingConfigUpdateResponse)
async def update_logging_config(
    update: LoggingConfigUpdate,
    project_path: str | None = Query(None, description="Project directory path"),
) -> LoggingConfigUpdateResponse:
    """
    Update logging configuration at runtime.

    Args:
        update: Configuration updates to apply
        project_path: Optional project path to save project-specific config

    Returns:
        LoggingConfigUpdateResponse with success status and new config

    Note:
        This endpoint is only available in development mode.
        Changes are saved to manifest.json if project_path is provided.
    """
    config = _load_project_config(project_path)
    registry = get_registry()

    # Update global level
    if update.global_level is not None:
        config.level = _parse_level(update.global_level)
        registry.set_default_level(config.level)

    # Update category levels
    if update.categories is not None:
        for category, level_str in update.categories.items():
            level = _parse_level(level_str)
            registry.set_level(category, level)
            config.categories[category] = level

    # Update file settings
    if update.file_enabled is not None:
        config.file.enabled = update.file_enabled

    # Update console settings
    if update.console_colored is not None:
        config.console.colored = update.console_colored

    # Apply updated config
    set_config(config)

    # Save to project's manifest.json
    _save_project_config(project_path, config)

    # Return updated config
    return LoggingConfigUpdateResponse(
        success=True,
        config=await get_logging_config(project_path),
    )


@router.get("/logging/categories", response_model=list[CategoryInfo])
async def list_logging_categories(
    project_path: str | None = Query(None, description="Project directory path"),
) -> list[CategoryInfo]:
    """
    List all available logging categories with their hierarchy.

    Args:
        project_path: Optional project path to load project-specific config

    Returns:
        List of CategoryInfo objects describing each category

    Note:
        This endpoint is only available in development mode.
    """
    # Load project config to ensure registry is up to date
    _load_project_config(project_path)

    registry = get_registry()
    categories: list[CategoryInfo] = []

    for category in sorted(registry.get_all_categories()):
        level = registry.get_level(category)
        enabled = registry.is_category_enabled(category)
        children = registry.get_children(category)

        categories.append(
            CategoryInfo(
                name=category,
                level=_get_level_name(level) if level else "INFO",
                enabled=enabled,
                children=children,
            )
        )

    return categories


@router.post("/logging/reset")
async def reset_logging_config(
    project_path: str | None = Query(None, description="Project directory path"),
) -> dict[str, Any]:
    """
    Reset logging configuration to defaults.

    Args:
        project_path: Optional project path to remove project-specific config

    Returns:
        Success message

    Note:
        This endpoint is only available in development mode.
        If project_path is provided, removes the logging key from manifest.json.
    """
    _reset_config()

    # Remove logging config from manifest
    if project_path:
        try:
            manifest = _load_manifest(project_path)
            if "logging" in manifest:
                del manifest["logging"]
                _save_manifest(project_path, manifest)
        except Exception:
            pass  # Ignore errors when removing

    return {"success": True, "message": "Logging configuration reset to defaults"}
