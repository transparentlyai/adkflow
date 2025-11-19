# ADKFlow Frontend - Quick Start Guide

## Installation and Setup

### 1. Install Dependencies

```bash
cd /home/mauro/projects/adkflow/frontend
npm install
```

### 2. Configure Environment

The `.env.local` file is already configured with default settings:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Update this if your backend is running on a different URL.

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Overview

The frontend is now set up with the following structure:

```
frontend/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with metadata
│   ├── page.tsx                 # Main workflow editor page
│   └── globals.css              # Global + Drawflow styles
├── components/                   # React components
│   ├── Toolbar.tsx              # Sidebar with node controls
│   └── DrawflowCanvas.tsx       # Drawflow integration (stub)
├── lib/                         # Utilities
│   ├── types.ts                 # TypeScript interfaces
│   ├── api.ts                   # API client functions
│   └── workflowHelpers.ts       # Workflow manipulation helpers
└── Configuration files...
```

## Current Status

### Completed

- Next.js 15 with TypeScript and Tailwind CSS
- App Router structure
- TypeScript interfaces matching backend models
- API client with all backend endpoints
- Toolbar component with node type buttons
- Import/Export YAML functionality
- DrawflowCanvas placeholder component
- Workflow helper functions

### Next Steps - Drawflow Integration

1. **Initialize Drawflow in DrawflowCanvas.tsx**
   - Uncomment Drawflow imports
   - Create Drawflow instance on component mount
   - Set up basic canvas configuration

2. **Create Node Templates**
   - Design HTML templates for Agent nodes
   - Design HTML templates for Subagent nodes
   - Design HTML templates for Prompt nodes
   - Add connection points (inputs/outputs)

3. **Implement Node Operations**
   - Add drag-and-drop from toolbar
   - Handle node creation with proper data
   - Implement node deletion
   - Add node selection and editing

4. **Connection Management**
   - Enable node connections
   - Validate connection rules
   - Store connection data

5. **Workflow Serialization**
   - Convert Drawflow data to Workflow format
   - Convert Workflow format to Drawflow data
   - Implement import/export integration

6. **UI Enhancements**
   - Add node property editor panel
   - Implement zoom and pan controls
   - Add minimap (optional)
   - Create keyboard shortcuts

## Component Integration

### Using the Toolbar

The Toolbar component accepts these props:

```typescript
interface ToolbarProps {
  onAddAgent?: () => void;
  onAddSubagent?: () => void;
  onAddPrompt?: () => void;
  onClear?: () => void;
  workflow?: Workflow;
}
```

Connect these handlers in `page.tsx` to interact with the DrawflowCanvas.

### Using the API Client

```typescript
import { validateWorkflow, exportToYAML, importFromYAML } from "@/lib/api";

// Validate workflow
const result = await validateWorkflow(workflow);

// Export to YAML
const yamlData = await exportToYAML(workflow);

// Import from YAML
const imported = await importFromYAML(yamlContent);
```

## Development Tips

### Hot Reload

Next.js will automatically reload when you make changes. No need to restart the dev server.

### TypeScript Checking

```bash
npm run build
```

This will check for TypeScript errors across the entire project.

### ESLint

```bash
npm run lint
```

### Debugging

Use browser DevTools. React DevTools extension is recommended for component inspection.

## Drawflow Resources

- [Drawflow Documentation](https://github.com/jerosoler/Drawflow)
- [Drawflow Examples](https://jerosoler.github.io/Drawflow/)

## Common Issues

### Module not found errors

Run `npm install` to ensure all dependencies are installed.

### API CORS errors

Ensure the backend has CORS middleware configured to allow requests from `http://localhost:3000`.

### Drawflow CSS not loading

Make sure to import the Drawflow CSS when you implement the integration:
```typescript
import "drawflow/dist/drawflow.min.css";
```

## Backend Integration Checklist

Ensure your backend has these endpoints:

- [ ] `POST /api/validate` - Validates workflow
- [ ] `POST /api/export/yaml` - Exports to YAML
- [ ] `POST /api/import/yaml` - Imports from YAML
- [ ] `GET /api/tools` - Lists available tools
- [ ] CORS enabled for `http://localhost:3000`

## Ready to Code!

The foundation is complete. Start by implementing the Drawflow integration in `components/DrawflowCanvas.tsx`.

Happy coding!
