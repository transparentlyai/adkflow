# Projects

Creating, opening, and managing ADKFlow projects.

## What is a Project?

A project is a folder containing:
- Workflow tabs (canvas state as JSON)
- Prompt files (markdown)
- Context files (static content)
- Tool files (Python scripts)
- Project metadata

## Creating a Project

### From Menu

1. **File → New Project**
2. Choose a parent directory
3. Enter project name
4. Click **Create**

### From Welcome Screen

If no project is open, the welcome screen shows:
- **New Project** button
- **Recent Projects** list

## Project Structure

```
my-project/
├── manifest.json          # Project metadata
├── pages/                 # Workflow tabs
│   ├── main.json          # Default tab
│   └── helpers.json       # Additional tabs
├── prompts/               # Prompt files
│   ├── system.prompt.md
│   └── user.prompt.md
├── static/                # Context/config files
│   └── config.yaml
├── tools/                 # Python tool files
│   └── custom_tool.py
└── adkflow_extensions/    # Project-specific custom nodes
    └── my_nodes/
```

### manifest.json

```json
{
  "version": "1.0",
  "name": "my-project",
  "tabs": [
    {"id": "main", "name": "Main", "order": 0},
    {"id": "helpers", "name": "Helpers", "order": 1}
  ]
}
```

## Opening a Project

### From Menu

1. **File → Open Project**
2. Navigate to project folder
3. Select the folder (not a file inside it)
4. Click **Open**

### From Recent Projects

1. **File → Recent Projects**
2. Click a project from the list

### Project Switcher

Press **Ctrl+O** (or **Cmd+O** on Mac) to open the quick switcher:
- Shows recent projects
- Type to filter
- Enter to open

## Saving

### Auto-save

Projects auto-save when you:
- Switch tabs
- Close the browser
- Navigate away

### Manual Save

- **Ctrl+S** / **Cmd+S**
- **File → Save**

### Unsaved Changes

If you have unsaved changes:
- Tab title shows a dot indicator
- Closing prompts to save or discard

## Switching Projects

When switching to a different project:
1. Current project is saved automatically
2. New project loads
3. Session state (open tabs, viewport) is restored

## Deleting Projects

ADKFlow doesn't have a delete option in the UI. To delete:
1. Close the project in ADKFlow
2. Delete the project folder from your filesystem

## Project Settings

Currently, project settings are stored in the manifest.json. Future versions may include:
- Default model selection
- API configuration
- Custom theme overrides

## Tips

### Organizing Multiple Projects

Keep related projects in a parent folder:
```
~/adk-projects/
├── chatbot/
├── data-pipeline/
└── code-assistant/
```

### Version Control

Projects are Git-friendly:
```bash
cd my-project
git init
git add .
git commit -m "Initial workflow"
```

### Backup

The entire project folder can be:
- Copied
- Zipped
- Synced to cloud storage

## See Also

- [Getting Started](./getting-started.md) - First project walkthrough
- [Tabs](./tabs.md) - Working with multiple tabs
- [Prompts & Contexts](./prompts-and-contexts.md) - Managing content files
