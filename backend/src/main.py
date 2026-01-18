"""Main FastAPI application for ADKFlow backend."""

import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.src.api.routes import router as api_router
from backend.src.api.execution_routes import router as execution_router
from backend.src.api.extension_routes import router as extension_router
from backend.src.api.routes.chat_routes import router as chat_router

# Check if running in dev mode
DEV_MODE = os.getenv("ADKFLOW_DEV_MODE", "0") == "1"
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "6000"))


def log_startup(message: str, level: str = "INFO") -> None:
    """Log startup message with consistent formatting."""
    prefix = "[ADKFlow]"
    if DEV_MODE:
        prefix = "[ADKFlow:DEV]"
    if level == "ERROR":
        print(f"{prefix} ERROR: {message}", file=sys.stderr)
    elif level == "WARNING":
        print(f"{prefix} WARNING: {message}")
    else:
        print(f"{prefix} {message}")


# Try to import debug routes (only used in dev mode)
if DEV_MODE:
    try:
        from backend.src.api.routes.debug_routes import router as debug_router
    except ImportError as e:
        debug_router = None
        log_startup(f"Debug routes not available: {e}", "WARNING")

    try:
        from backend.src.api.routes.log_explorer_routes import (
            router as log_explorer_router,
        )
    except ImportError as e:
        log_explorer_router = None
        log_startup(f"Log explorer routes not available: {e}", "WARNING")

    try:
        from backend.src.api.routes.trace_explorer_routes import (
            router as trace_explorer_router,
        )
    except ImportError as e:
        trace_explorer_router = None
        log_startup(f"Trace explorer routes not available: {e}", "WARNING")
else:
    debug_router = None
    log_explorer_router = None
    trace_explorer_router = None


# Try to import extension system
try:
    from adkflow_runner.extensions import (
        init_shipped_extensions,
        init_global_extensions,
        init_builtin_units,
    )
except ImportError:
    init_shipped_extensions = None
    init_global_extensions = None
    init_builtin_units = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events."""
    log_startup(f"Starting backend on port {BACKEND_PORT}")

    if DEV_MODE:
        log_startup("Development mode enabled - verbose logging active")

    # Startup: Initialize extensions in order of precedence (lowest first)
    # Shipped extensions (built-in, lowest precedence)
    if init_shipped_extensions is not None:
        log_startup("Loading shipped extensions...")
        init_shipped_extensions()

    # Builtin units (registered directly, not from files)
    if init_builtin_units is not None:
        log_startup("Registering builtin FlowUnits...")
        init_builtin_units()

    # Global extensions (user's global, can override shipped)
    if init_global_extensions is not None:
        log_startup("Initializing global extension system...")
        init_global_extensions(watch=True)
        log_startup("Global extensions initialized and watching for changes")

    log_startup(f"Backend ready at http://localhost:{BACKEND_PORT}")

    yield

    # Shutdown: Cleanup can be added here if needed
    log_startup("Shutting down...")


# Initialize FastAPI app
app = FastAPI(
    title="ADKFlow Backend API",
    description="Backend API for ADKFlow - Visual workflow builder for Google ADK agents",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS middleware
# In development, allow all origins for convenience
# TODO: Restrict this in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router)
app.include_router(execution_router)
app.include_router(extension_router)
app.include_router(chat_router)

# Include debug routes only in dev mode
if DEV_MODE and debug_router is not None:
    app.include_router(debug_router)
    log_startup("Debug API routes enabled at /api/debug/*")

if DEV_MODE and log_explorer_router is not None:
    app.include_router(log_explorer_router)
    log_startup("Log Explorer API routes enabled at /api/debug/logs/*")

if DEV_MODE and trace_explorer_router is not None:
    app.include_router(trace_explorer_router)
    log_startup("Trace Explorer API routes enabled at /api/debug/traces/*")


@app.api_route("/", methods=["GET", "HEAD"])
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {"status": "ok", "service": "ADKFlow Backend API"}


@app.get("/health")
async def health_check() -> dict[str, str]:
    """
    Health check endpoint.

    Returns:
        Status message indicating service health
    """
    return {"status": "healthy"}


@app.get("/api/dev/info")
async def dev_info() -> dict[str, str | bool | None]:
    """
    Dev mode info endpoint.

    Returns dev mode status and current git branch.
    Only returns meaningful data when running in dev mode.
    """
    if not DEV_MODE:
        return {"devMode": False, "branch": None}

    import subprocess

    branch = None
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            branch = result.stdout.strip()
    except Exception:
        pass

    return {"devMode": True, "branch": branch}


def check_port_available(port: int) -> bool:
    """Check if a port is available.

    Uses SO_REUSEADDR to allow binding even if the port is in TIME_WAIT state.
    """
    import socket

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind(("0.0.0.0", port))
            return True
        except OSError:
            return False


if __name__ == "__main__":
    import uvicorn

    # Get backend port from environment (default: 6000)
    backend_port = int(os.getenv("BACKEND_PORT", "6000"))

    # Check if port is available
    if not check_port_available(backend_port):
        log_startup(
            f"Port {backend_port} is already in use. "
            f"Kill the existing process or use a different port:\n"
            f"  - Find process: ss -tlnp | grep {backend_port}\n"
            f"  - Or set BACKEND_PORT environment variable",
            "ERROR",
        )
        sys.exit(1)

    uvicorn.run("backend.src.main:app", host="0.0.0.0", port=backend_port, reload=True)
