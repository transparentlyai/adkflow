"""API routes package.

This package contains all API route definitions, organized by domain:
- project_routes: Project and tools endpoints
- file_routes: File operations (prompts, contexts, tools, chunks)
- filesystem_routes: Filesystem operations (directory listing, creation)
- tab_routes: Tab/Page CRUD operations
"""

from fastapi import APIRouter

from backend.src.api.routes.project_routes import router as project_router
from backend.src.api.routes.file_routes import router as file_router
from backend.src.api.routes.filesystem_routes import router as filesystem_router
from backend.src.api.routes.tab_routes import router as tab_router

# Re-export all models for backwards compatibility
from backend.src.api.routes.models import (
    ToolInfo,
    ToolsResponse,
    ProjectLoadResponse,
    ProjectSaveRequest,
    ProjectSaveResponse,
    PromptCreateRequest,
    ContextCreateRequest,
    ToolCreateRequest,
    PromptCreateResponse,
    PromptReadRequest,
    PromptReadResponse,
    PromptSaveRequest,
    PromptSaveResponse,
    FileChunkRequest,
    FileChunkResponse,
    DirectoryEntry,
    DirectoryListResponse,
    DirectoryCreateRequest,
    DirectoryCreateResponse,
    DirectoryEnsureRequest,
    TabListResponse,
    TabCreateRequest,
    TabCreateResponse,
    TabLoadResponse,
    TabSaveRequest,
    TabRenameRequest,
    TabReorderRequest,
)

# Re-export helpers
from backend.src.api.routes.helpers import generate_tab_id, get_default_flow

# Create the main router that aggregates all sub-routers
router = APIRouter(prefix="/api")
router.include_router(project_router)
router.include_router(file_router)
router.include_router(filesystem_router)
router.include_router(tab_router)

__all__ = [
    # Main router
    "router",
    # Models
    "ToolInfo",
    "ToolsResponse",
    "ProjectLoadResponse",
    "ProjectSaveRequest",
    "ProjectSaveResponse",
    "PromptCreateRequest",
    "ContextCreateRequest",
    "ToolCreateRequest",
    "PromptCreateResponse",
    "PromptReadRequest",
    "PromptReadResponse",
    "PromptSaveRequest",
    "PromptSaveResponse",
    "FileChunkRequest",
    "FileChunkResponse",
    "DirectoryEntry",
    "DirectoryListResponse",
    "DirectoryCreateRequest",
    "DirectoryCreateResponse",
    "DirectoryEnsureRequest",
    "TabListResponse",
    "TabCreateRequest",
    "TabCreateResponse",
    "TabLoadResponse",
    "TabSaveRequest",
    "TabRenameRequest",
    "TabReorderRequest",
    # Helpers
    "generate_tab_id",
    "get_default_flow",
]
