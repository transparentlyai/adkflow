"""
Uppercase Extension - Simple Example
=====================================

A beginner-friendly example demonstrating the basics of creating
a custom node in ADKFlow. This node converts input text to uppercase.

To use this extension:
1. Copy this directory to your project's `adkflow_extensions/` directory
2. Reload extensions in ADKFlow
3. Find "Uppercase" in the "Examples/Text" menu
"""

from uppercase.nodes import UppercaseNode

__all__ = ["UppercaseNode"]
