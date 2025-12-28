# ADKFlow Documentation

Visual workflow editor for building AI agents with Google's Agent Development Kit (ADK).

## Quick Links

| I want to... | Go to |
|--------------|-------|
| Get started with ADKFlow | [Getting Started](./user-manual/getting-started.md) |
| Learn the UI | [Interface Overview](./user-manual/interface-overview.md) |
| Build workflows | [User Manual](./user-manual/README.md) |
| Understand the architecture | [Architecture](./technical/architecture.md) |
| Contribute to ADKFlow | [Contributing](./contributing.md) |
| Create custom nodes | [Extensions Guide](./technical/extensions/README.md) |

---

## Documentation Sections

### [User Manual](./user-manual/README.md)

For end users building workflows with ADKFlow.

- [Getting Started](./user-manual/getting-started.md) - Installation and first project
- [Interface Overview](./user-manual/interface-overview.md) - UI walkthrough
- [Projects](./user-manual/projects.md) - Create, open, save projects
- [Canvas](./user-manual/canvas.md) - Navigation, zoom, pan
- [Nodes](./user-manual/nodes.md) - Working with nodes
- [Connections](./user-manual/connections.md) - Connecting nodes
- [Groups](./user-manual/groups.md) - Grouping and nesting
- [Tabs](./user-manual/tabs.md) - Multi-tab workflows
- [Teleporters](./user-manual/teleporters.md) - Cross-tab connections
- [Prompts & Contexts](./user-manual/prompts-and-contexts.md) - Creating content
- [Running Workflows](./user-manual/running-workflows.md) - Execution and output
- [Validation](./user-manual/validation.md) - Validation and topology
- [Keyboard Shortcuts](./user-manual/keyboard-shortcuts.md) - All shortcuts
- [Themes](./user-manual/themes.md) - Theme customization
- [Troubleshooting](./user-manual/troubleshooting.md) - Common issues

### [Technical Documentation](./technical/README.md)

For developers working on or extending ADKFlow.

#### [Architecture](./technical/architecture.md)
High-level system design and data flow.

#### [Frontend](./technical/frontend/README.md)
React/Next.js frontend implementation.

- [State Management](./technical/frontend/state-management.md) - Contexts and data flow
- [Canvas System](./technical/frontend/canvas-system.md) - ReactFlow integration
- [Node System](./technical/frontend/node-system.md) - Node types and widgets
- [Hooks Architecture](./technical/frontend/hooks-architecture.md) - Hook patterns
- [API Client](./technical/frontend/api-client.md) - Backend communication
- [Theme System](./technical/frontend/theme-system.md) - Theming implementation
- [Components](./technical/frontend/components.md) - UI component library

#### [Backend](./technical/backend/README.md)
FastAPI backend implementation.

- [API Reference](./technical/backend/api-reference.md) - All endpoints
- [Project Management](./technical/backend/project-management.md) - Storage and loading
- [Tab System](./technical/backend/tab-system.md) - Multi-tab support
- [File Operations](./technical/backend/file-operations.md) - File management
- [Execution Engine](./technical/backend/execution-engine.md) - Workflow execution
- [Extension System](./technical/backend/extension-system.md) - Custom node loading

#### [Extensions](./technical/extensions/README.md)
Creating custom nodes with the FlowUnit API.

- [FlowUnit API](./technical/extensions/flowunit-api.md) - Base class reference
- [Port Schemas](./technical/extensions/port-schemas.md) - Input/output ports
- [Field Schemas](./technical/extensions/field-schemas.md) - Configuration fields
- [UI Schema](./technical/extensions/ui-schema.md) - Node appearance
- [Node Layouts](./technical/extensions/node-layouts.md) - Visual styles
- [Type System](./technical/extensions/type-system.md) - Type definitions
- [Execution Context](./technical/extensions/execution-context.md) - Runtime context
- [Caching & Execution](./technical/extensions/caching-execution.md) - Execution control
- [Best Practices](./technical/extensions/best-practices.md) - Patterns
- [Examples](./technical/extensions/examples/README.md) - Working examples

#### [CLI](./technical/cli/README.md)
Command-line interface.

- [Commands Reference](./technical/cli/commands.md) - All CLI commands

### [Contributing](./contributing.md)

How to contribute to ADKFlow development.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 18, TypeScript, ReactFlow, Tailwind CSS |
| Backend | FastAPI, Python 3.11+, Pydantic v2 |
| CLI | Python Click, uv package manager |
| Execution | adkflow-runner package |

---

## Project Structure

```
adkflow/
├── frontend/          # Next.js frontend
├── backend/           # FastAPI backend
├── cli/               # CLI tool
├── packages/
│   └── adkflow-runner/  # Execution engine
└── docs/              # This documentation
```

---

## See Also

- [GitHub Repository](https://github.com/your-org/adkflow)
- [Google ADK Documentation](https://google.github.io/adk-docs/)
