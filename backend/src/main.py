"""Main FastAPI application for ADKFlow backend."""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.src.api.routes import router as api_router


# Initialize FastAPI app
app = FastAPI(
    title="ADKFlow Backend API",
    description="Backend API for ADKFlow - Visual workflow builder for Google ADK agents",
    version="0.1.0"
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

    uvicorn.run(
        "backend.src.main:app",
        host="0.0.0.0",
        port=backend_port,
        reload=True
    )
