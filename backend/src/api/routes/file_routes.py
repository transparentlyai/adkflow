"""File operations API routes (prompts, contexts, tools, chunks)."""

import asyncio
import json
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from backend.src.api.file_watcher import file_watcher_manager

from backend.src.api.routes.models import (
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
)

router = APIRouter()


@router.post("/project/prompt/create", response_model=PromptCreateResponse)
async def create_prompt_file(request: PromptCreateRequest) -> PromptCreateResponse:
    """
    Create a new prompt markdown file in the project.

    Args:
        request: Prompt creation request with project path and prompt name

    Returns:
        PromptCreateResponse with file path

    Raises:
        HTTPException: If file creation fails
    """
    try:
        # Validate and normalize project path
        project_path = Path(request.project_path).resolve()

        # Sanitize prompt name for filesystem
        safe_name = re.sub(r"[^\w\-]", "-", request.prompt_name.lower())
        safe_name = re.sub(r"-+", "-", safe_name).strip("-")

        if not safe_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid prompt name"
            )

        # Create prompts directory
        prompts_dir = project_path / "prompts"
        prompts_dir.mkdir(parents=True, exist_ok=True)

        # Create prompt file
        filename = f"{safe_name}.prompt.md"
        prompt_file = prompts_dir / filename

        # Check if file already exists
        if prompt_file.exists():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Prompt file '{filename}' already exists",
            )

        # Create empty file
        prompt_file.touch()

        # Return relative path from project root
        relative_path = f"prompts/{filename}"

        return PromptCreateResponse(
            success=True,
            file_path=relative_path,
            absolute_path=str(prompt_file),
            message=f"Prompt file created: {filename}",
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
            detail=f"Failed to create prompt file: {str(e)}",
        )


@router.post("/project/context/create", response_model=PromptCreateResponse)
async def create_context_file(request: ContextCreateRequest) -> PromptCreateResponse:
    """
    Create a new context markdown file in the project.

    Args:
        request: Context creation request with project path and context name

    Returns:
        PromptCreateResponse with file path

    Raises:
        HTTPException: If file creation fails
    """
    try:
        # Validate and normalize project path
        project_path = Path(request.project_path).resolve()

        # Sanitize context name for filesystem
        safe_name = re.sub(r"[^\w\-]", "-", request.context_name.lower())
        safe_name = re.sub(r"-+", "-", safe_name).strip("-")

        if not safe_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid context name"
            )

        # Create static directory
        static_dir = project_path / "static"
        static_dir.mkdir(parents=True, exist_ok=True)

        # Create context file
        filename = f"{safe_name}.context.md"
        context_file = static_dir / filename

        # Check if file already exists
        if context_file.exists():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Context file '{filename}' already exists",
            )

        # Create empty file
        context_file.touch()

        # Return relative path from project root
        relative_path = f"static/{filename}"

        return PromptCreateResponse(
            success=True,
            file_path=relative_path,
            absolute_path=str(context_file),
            message=f"Context file created: {filename}",
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
            detail=f"Failed to create context file: {str(e)}",
        )


@router.post("/project/tool/create", response_model=PromptCreateResponse)
async def create_tool_file(request: ToolCreateRequest) -> PromptCreateResponse:
    """
    Create a new Python tool file in the project.

    Args:
        request: Tool creation request with project path and tool name

    Returns:
        PromptCreateResponse with file path

    Raises:
        HTTPException: If file creation fails
    """
    try:
        # Validate and normalize project path
        project_path = Path(request.project_path).resolve()

        # Sanitize tool name for filesystem
        safe_name = re.sub(r"[^\w\-]", "_", request.tool_name.lower())
        safe_name = re.sub(r"_+", "_", safe_name).strip("_")

        if not safe_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid tool name"
            )

        # Create tools directory
        tools_dir = project_path / "tools"
        tools_dir.mkdir(parents=True, exist_ok=True)

        # Create tool file
        filename = f"{safe_name}.py"
        tool_file = tools_dir / filename

        # Check if file already exists
        if tool_file.exists():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Tool file '{filename}' already exists",
            )

        # Create file with default Python tool template
        default_code = f'''def {safe_name}(input_data: dict) -> dict:
    """
    {request.tool_name} - Tool function that processes input and returns output.

    Args:
        input_data: Dictionary containing input parameters

    Returns:
        Dictionary with tool output
    """
    # Your tool logic here
    result = input_data

    return result
'''
        with open(tool_file, "w", encoding="utf-8") as f:
            f.write(default_code)

        # Return relative path from project root
        relative_path = f"tools/{filename}"

        return PromptCreateResponse(
            success=True,
            file_path=relative_path,
            absolute_path=str(tool_file),
            message=f"Tool file created: {filename}",
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
            detail=f"Failed to create tool file: {str(e)}",
        )


@router.post("/project/prompt/read", response_model=PromptReadResponse)
async def read_prompt_file(request: PromptReadRequest) -> PromptReadResponse:
    """
    Read the content of a prompt markdown file.

    Args:
        request: Prompt read request with project path and file path

    Returns:
        PromptReadResponse with file content

    Raises:
        HTTPException: If file read fails
    """
    try:
        # Check if file_path is absolute
        file_path = Path(request.file_path)
        if file_path.is_absolute():
            prompt_file = file_path
        else:
            # Relative path - construct from project path
            project_path = Path(request.project_path).resolve()
            prompt_file = project_path / request.file_path

        # Validate file exists
        if not prompt_file.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prompt file not found: {request.file_path}",
            )

        # Read file content
        with open(prompt_file, "r", encoding="utf-8") as f:
            content = f.read()

        return PromptReadResponse(
            success=True, content=content, file_path=request.file_path
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
            detail=f"Failed to read prompt file: {str(e)}",
        )


@router.post("/project/file/chunk", response_model=FileChunkResponse)
async def read_file_chunk(request: FileChunkRequest) -> FileChunkResponse:
    """
    Read a chunk of a file for paginated loading (optimized for large files).

    Args:
        request: File chunk request with project path, file path, offset, limit, and reverse flag

    Returns:
        FileChunkResponse with chunk content and pagination info

    Raises:
        HTTPException: If file read fails
    """
    try:
        # Validate and normalize project path
        project_path = Path(request.project_path).resolve()

        # Construct full file path
        file_path = project_path / request.file_path

        # Validate file exists
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File not found: {request.file_path}",
            )

        # Read all lines (we need total count anyway)
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            all_lines = f.readlines()

        total_lines = len(all_lines)

        if request.reverse:
            # Reverse mode: read from end of file
            # offset 0 means "last N lines", offset 500 means "500 lines before the last chunk"
            # Calculate which lines to return (from end)
            end_idx = total_lines - request.offset
            start_idx = max(0, end_idx - request.limit)

            if end_idx <= 0:
                # No more lines to read
                return FileChunkResponse(
                    success=True,
                    content="",
                    file_path=request.file_path,
                    total_lines=total_lines,
                    offset=request.offset,
                    has_more=False,
                )

            chunk_lines = all_lines[start_idx:end_idx]
            # Reverse the lines so newest appears first
            chunk_lines = list(reversed(chunk_lines))
            has_more = start_idx > 0
        else:
            # Normal mode: read from start
            start_idx = request.offset
            end_idx = min(total_lines, start_idx + request.limit)

            if start_idx >= total_lines:
                return FileChunkResponse(
                    success=True,
                    content="",
                    file_path=request.file_path,
                    total_lines=total_lines,
                    offset=request.offset,
                    has_more=False,
                )

            chunk_lines = all_lines[start_idx:end_idx]
            has_more = end_idx < total_lines

        # Join lines (they already have newlines)
        content = "".join(chunk_lines)
        # Remove trailing newline for cleaner display
        content = content.rstrip("\n")

        return FileChunkResponse(
            success=True,
            content=content,
            file_path=request.file_path,
            total_lines=total_lines,
            offset=request.offset,
            has_more=has_more,
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
            detail=f"Failed to read file chunk: {str(e)}",
        )


@router.post("/project/prompt/save", response_model=PromptSaveResponse)
async def save_prompt_file(request: PromptSaveRequest) -> PromptSaveResponse:
    """
    Save content to a prompt markdown file.

    Args:
        request: Prompt save request with project path, file path, and content

    Returns:
        PromptSaveResponse with success status

    Raises:
        HTTPException: If file save fails
    """
    try:
        # Resolve project path
        project_path = Path(request.project_path).resolve()

        # Check if file_path is absolute
        file_path = Path(request.file_path)
        if file_path.is_absolute():
            prompt_file = file_path
        else:
            # Relative path - construct from project path
            prompt_file = project_path / request.file_path

        # Create parent directories if they don't exist
        prompt_file.parent.mkdir(parents=True, exist_ok=True)

        # Write content to file (creates file if it doesn't exist)
        with open(prompt_file, "w", encoding="utf-8") as f:
            f.write(request.content)

        # Notify file watcher of the change
        file_watcher_manager.notify_file_change(
            project_path=str(project_path),
            file_path=request.file_path,
            change_type="modified",
        )

        return PromptSaveResponse(
            success=True,
            file_path=request.file_path,
            message=f"Prompt file saved: {request.file_path}",
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
            detail=f"Failed to save prompt file: {str(e)}",
        )


@router.get("/project/files/events")
async def stream_file_events(project_path: str, request: Request):
    """
    Stream file change events via Server-Sent Events (SSE).

    Args:
        project_path: Absolute path to the project root
        request: FastAPI request object (used to detect client disconnect)

    Returns:
        SSE stream of file change events
    """
    # Resolve path to ensure consistent matching with save endpoint
    resolved_path = str(Path(project_path).resolve())

    async def event_generator():
        queue = await file_watcher_manager.subscribe(resolved_path)
        try:
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break

                try:
                    # Wait for event with timeout (for keepalive)
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    data = json.dumps(
                        {
                            "file_path": event.file_path,
                            "change_type": event.change_type,
                            "timestamp": event.timestamp,
                        }
                    )
                    yield f"event: file_change\ndata: {data}\n\n"
                except asyncio.TimeoutError:
                    # Send keepalive
                    yield ": keepalive\n\n"
        finally:
            await file_watcher_manager.unsubscribe(resolved_path, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
