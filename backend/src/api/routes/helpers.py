"""Helper functions for API routes."""

import random
import string
import time

from backend.src.models.workflow import ReactFlowJSON, Viewport


def generate_tab_id() -> str:
    """Generate a unique tab ID with timestamp and random string."""
    timestamp = int(time.time() * 1000)
    random_str = "".join(random.choices(string.ascii_lowercase + string.digits, k=9))
    return f"page_{timestamp}_{random_str}"


def get_default_flow() -> ReactFlowJSON:
    """Return an empty ReactFlow JSON structure for new tabs.

    The frontend is responsible for creating any default nodes (like Start)
    using its schema-driven node creation system.
    """
    return ReactFlowJSON(nodes=[], edges=[], viewport=Viewport(x=0, y=0, zoom=1))
