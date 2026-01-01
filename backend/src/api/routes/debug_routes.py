"""Debug API routes for development mode only.

These routes are only registered when ADKFLOW_DEV_MODE=1.
They provide runtime configuration for logging and debugging.
"""

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

# Import logging configuration from adkflow_runner
# This module is optional - routes will return 503 if not available
from adkflow_runner.logging import (
    LogLevel,
    get_config,
    set_config,
    get_registry,
    reset_config as _reset_config,
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


@router.get("/logging", response_model=LoggingConfigResponse)
async def get_logging_config() -> LoggingConfigResponse:
    """
    Get current logging configuration.

    Returns:
        LoggingConfigResponse with current logging settings

    Note:
        This endpoint is only available in development mode.
    """
    config = get_config()
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
) -> LoggingConfigUpdateResponse:
    """
    Update logging configuration at runtime.

    Args:
        update: Configuration updates to apply

    Returns:
        LoggingConfigUpdateResponse with success status and new config

    Note:
        This endpoint is only available in development mode.
        Changes are applied immediately but not persisted to config file.
    """
    config = get_config()
    registry = get_registry()

    # Update global level
    if update.global_level is not None:
        config.level = _parse_level(update.global_level)

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

    # Return updated config
    return LoggingConfigUpdateResponse(
        success=True,
        config=await get_logging_config(),
    )


@router.get("/logging/categories", response_model=list[CategoryInfo])
async def list_logging_categories() -> list[CategoryInfo]:
    """
    List all available logging categories with their hierarchy.

    Returns:
        List of CategoryInfo objects describing each category

    Note:
        This endpoint is only available in development mode.
    """
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
async def reset_logging_config() -> dict[str, Any]:
    """
    Reset logging configuration to defaults.

    Returns:
        Success message

    Note:
        This endpoint is only available in development mode.
    """
    _reset_config()

    return {"success": True, "message": "Logging configuration reset to defaults"}
