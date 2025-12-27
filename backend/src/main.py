"""Main FastAPI application for ADKFlow backend."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.src.api.routes import router as api_router
from backend.src.api.execution_routes import router as execution_router
from backend.src.api.extension_routes import router as extension_router


# Try to import extension system
try:
    from adkflow_runner.extensions import init_global_extensions
except ImportError:
    init_global_extensions = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events."""
    # Startup: Initialize global extensions
    if init_global_extensions is not None:
        print("[ADKFlow] Initializing global extension system...")
        init_global_extensions(watch=True)
        print("[ADKFlow] Global extensions initialized and watching for changes")

    yield

    # Shutdown: Cleanup can be added here if needed
    print("[ADKFlow] Shutting down...")


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


if __name__ == "__main__":
    import uvicorn

    # Get backend port from environment (default: 8000)
    backend_port = int(os.getenv("BACKEND_PORT", "8000"))

    uvicorn.run("backend.src.main:app", host="0.0.0.0", port=backend_port, reload=True)
