# Custom Node Examples

> **Note:** Examples have moved to `/extensions/` directory at the project root.

These are shipped extensions that are automatically available in ADKFlow.

## Available Examples

| Extension | Location | Description |
|-----------|----------|-------------|
| **API Client** | [`/extensions/api_client/`](/extensions/api_client/) | Advanced HTTP client with tabs, sections, all widget types |
| **Uppercase** | [`/extensions/uppercase/`](/extensions/uppercase/) | Simple beginner-friendly text processing example |

## Using Examples as Templates

Since these extensions are shipped with ADKFlow, they're automatically loaded. To create your own extension based on these examples:

1. Copy the extension directory to your `adkflow_extensions/` folder:
   ```bash
   # Global (available in all projects)
   cp -r extensions/uppercase ~/.adkflow/adkflow_extensions/my_extension

   # Project-specific
   cp -r extensions/uppercase your-project/adkflow_extensions/my_extension
   ```

2. Rename and modify as needed
3. Reload extensions or restart the backend

## Extension Precedence

If you create an extension with the same `UNIT_ID` as a shipped extension:
- **Project extensions** override both global and shipped
- **Global extensions** override shipped
- **Shipped extensions** have the lowest precedence

This allows you to customize or replace built-in extensions as needed.
