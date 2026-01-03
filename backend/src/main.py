"""Main FastAPI application for ADKFlow backend."""

import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.src.api.routes import router as api_router
from backend.src.api.execution_routes import router as execution_router
from backend.src.api.extension_routes import router as extension_router

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
    from adkflow_runner.extensions import init_global_extensions
except ImportError:
    init_global_extensions = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events."""
    log_startup(f"Starting backend on port {BACKEND_PORT}")

    if DEV_MODE:
        log_startup("Development mode enabled - verbose logging active")

    # Startup: Initialize global extensions
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
