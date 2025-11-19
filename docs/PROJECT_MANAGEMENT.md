# Project Management System

## Overview

ADKFlow now includes a comprehensive project-based workflow system that allows users to create, load, and save workflows to the filesystem. Projects are stored as `workflow.yaml` files in user-specified directories.

## Features

- **Initial Project Dialog**: On application start, users are prompted to either create a new project or load an existing one
- **Full Path Support**: Users specify complete filesystem paths for project directories
- **Auto-Save to YAML**: Workflows are saved as `workflow.yaml` in the project directory
- **Unsaved Changes Protection**: Confirmation dialog when creating new projects with unsaved changes
- **Visual Feedback**: Current project path displayed in the header

## User Workflow

### Creating a New Project

1. On app load, the Project Dialog appears
2. Select "Create New Workflow" tab
3. Enter a full path (e.g., `/home/user/my-workflows/customer-service`)
4. Click "Create Project"
5. The application creates the directory if it doesn't exist
6. Canvas is cleared and ready for new workflow design

### Loading an Existing Project

1. On app load, the Project Dialog appears
2. Select "Load Existing Workflow" tab
3. Enter the path to an existing project directory
4. Click "Load Project"
5. If `workflow.yaml` exists, it's loaded into the canvas
6. If no workflow found, an alert is shown

### Saving a Project

1. With a project open, click "Save Project" in the toolbar (left sidebar)
2. Current workflow is converted to YAML and saved to `{project_path}/workflow.yaml`
3. Canvas state is preserved in `metadata.drawflow` field
4. Success confirmation is shown

### Starting a New Project

1. Click "New Project" button in the header
2. If there are unsaved changes, a confirmation dialog appears:
   - **Save & Continue**: Saves current project, then opens Project Dialog
   - **Don't Save**: Discards changes and opens Project Dialog
   - **Cancel**: Returns to current project
3. If no unsaved changes, Project Dialog opens immediately

## Technical Implementation

### Backend API Endpoints

#### GET `/api/project/load`

Loads a workflow from the filesystem.

**Query Parameters:**
- `path` (string, required): Full path to project directory

**Response:**
```typescript
{
  exists: boolean,        // Whether workflow.yaml exists
  workflow: Workflow | null,  // Parsed workflow or null
  path: string           // Resolved project path
}
```

**Example:**
```bash
curl "http://localhost:8000/api/project/load?path=/home/user/projects/my-workflow"
```

#### POST `/api/project/save`

Saves a workflow to the filesystem.

**Request Body:**
```typescript
{
  path: string,      // Full path to project directory
  workflow: Workflow // Complete workflow object
}
```

**Response:**
```typescript
{
  success: boolean,
  path: string,      // Project directory path
  message: string    // Success/error message
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/project/save \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/home/user/projects/my-workflow",
    "workflow": {
      "name": "My Workflow",
      "description": "...",
      "agents": [],
      "prompts": [],
      "connections": [],
      "metadata": {"drawflow": {...}}
    }
  }'
```

### Frontend Components

#### ProjectDialog

Located at: `frontend/components/ProjectDialog.tsx`

**Purpose**: Initial dialog for creating or loading projects

**Props:**
- `isOpen: boolean` - Controls dialog visibility
- `onCreateNew: (path: string) => void` - Callback for creating new project
- `onLoadExisting: (path: string) => void` - Callback for loading project
- `onClose?: () => void` - Optional close callback

**Features:**
- Two-tab interface (Create New / Load Existing)
- Full path text input
- Validation (path cannot be empty)
- Responsive design with backdrop

#### SaveConfirmDialog

Located at: `frontend/components/SaveConfirmDialog.tsx`

**Purpose**: Confirmation before creating new project with unsaved changes

**Props:**
- `isOpen: boolean` - Controls dialog visibility
- `projectPath: string` - Current project path for display
- `onSaveAndContinue: () => void` - Save then proceed
- `onDontSave: () => void` - Discard changes and proceed
- `onCancel: () => void` - Cancel operation

**Features:**
- Three action buttons
- Shows current project path
- Prevents accidental data loss

### State Management

Main application state in `frontend/app/page.tsx`:

```typescript
// Project state
const [currentProjectPath, setCurrentProjectPath] = useState<string | null>(null);
const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(true);  // Show on load
const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
```

**Key Handlers:**

- `handleCreateNewProject(projectPath)`: Creates new project at path
- `handleLoadExistingProject(projectPath)`: Loads existing workflow from path
- `handleSaveCurrentProject()`: Saves current workflow to project path
- `handleNewProject()`: Initiates new project creation (with save check)
- `handleSaveAndContinue()`: Saves then opens new project dialog
- `handleDontSave()`: Skips save and opens new project dialog
- `handleCancelNewProject()`: Cancels new project creation

### Workflow Storage Format

Projects are saved as `workflow.yaml` with the following structure:

```yaml
name: "Workflow Name"
description: "Workflow created with ADKFlow"
agents: []
prompts: []
connections: []
metadata:
  drawflow:
    drawflow:
      Home:
        data:
          1:
            id: 1
            name: "agent"
            data:
              type: "agent"
              id: "agent_xyz"
              name: "Customer Service Agent"
              # ... node data
            pos_x: 100
            pos_y: 200
            # ... drawflow node structure
```

**Key Points:**
- `metadata.drawflow` preserves complete canvas state
- Enables exact reconstruction of visual layout
- Compatible with YAML import/export for flow-runner

## File Operations

### Directory Creation

Backend automatically creates project directories:

```python
project_path = Path(request.path).resolve()
project_path.mkdir(parents=True, exist_ok=True)
```

- Creates all parent directories if needed
- No error if directory already exists
- Uses absolute path resolution

### YAML Read/Write

**Save Operation:**
1. Convert workflow to YAML using `to_yaml()`
2. Write to `{project_path}/workflow.yaml`
3. UTF-8 encoding

**Load Operation:**
1. Check if `workflow.yaml` exists
2. Read file content
3. Parse YAML using `from_yaml()`
4. Return parsed workflow object

## Integration with Existing Features

### Export YAML

The "Export YAML" button in the toolbar still works independently:
- Exports current canvas to downloadable YAML file
- Useful for sharing or backup
- Does not require a project to be loaded

### Import YAML

The "Import YAML" button loads workflows from files:
- Overwrites current canvas
- Does not change current project path
- Can be used to load workflows from any location

### Workflow Change Tracking

Every canvas modification sets `hasUnsavedChanges = true`:
- Adding/removing nodes
- Moving nodes
- Creating/deleting connections
- Editing prompt content
- Changing agent properties

## Error Handling

### Project Load Errors

- **Path doesn't exist**: Returns `exists: false`, shows alert
- **Invalid YAML**: HTTP 500 with error detail
- **Permission denied**: HTTP 500 with error detail

### Project Save Errors

- **Directory creation failure**: HTTP 500 with error detail
- **Write permission denied**: HTTP 500 with error detail
- **Invalid workflow data**: HTTP 500 with error detail

### Frontend Validation

- **Empty path**: Create/Load buttons disabled
- **No project loaded**: Save button not shown
- **Canvas not ready**: Alert shown before export

## Best Practices

1. **Use descriptive paths**: `/home/user/workflows/customer-service-v1`
2. **Save frequently**: Click "Save Project" after significant changes
3. **Check for existing workflows**: Use "Load Existing" to avoid overwrites
4. **Backup important workflows**: Use "Export YAML" for additional backups
5. **Organize projects**: Create a dedicated workflows directory structure

## Future Enhancements

Potential improvements for the project management system:

- **Recent projects list**: Quick access to recently opened projects
- **Auto-save**: Periodic automatic saving
- **Project metadata**: Store creation date, last modified, author
- **Multi-file projects**: Support for additional project files (docs, assets)
- **Project templates**: Pre-configured workflow templates
- **Version control integration**: Git integration for project tracking
