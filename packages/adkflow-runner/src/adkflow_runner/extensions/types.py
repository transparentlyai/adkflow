"""Extension type definitions."""

from enum import Enum


class ExtensionScope(Enum):
    """Scope of an extension - where it was loaded from."""

    SHIPPED = "shipped"  # Built-in extensions that ship with the app
    GLOBAL = "global"  # From ~/.adkflow/adkflow_extensions/ - available everywhere
    PROJECT = "project"  # From {project}/adkflow_extensions/ - project-specific
