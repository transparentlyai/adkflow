# Technical Documentation

Developer documentation for understanding and contributing to ADKFlow.

## Architecture

- [Architecture Overview](./architecture.md) - High-level system design, data flow, and component relationships

## Frontend

React/Next.js visual editor implementation.

- [Frontend Overview](./frontend/README.md) - Frontend architecture summary
- [State Management](./frontend/state-management.md) - React contexts and data flow
- [Canvas System](./frontend/canvas-system.md) - ReactFlow integration and canvas hooks
- [Node System](./frontend/node-system.md) - Node types, layouts, and widgets
- [Hooks Architecture](./frontend/hooks-architecture.md) - Hook composition patterns
- [API Client](./frontend/api-client.md) - Backend API communication
- [Theme System](./frontend/theme-system.md) - Theming implementation
- [Components](./frontend/components.md) - UI component library

## Backend

FastAPI server implementation.

- [Backend Overview](./backend/README.md) - Backend architecture summary
- [API Reference](./backend/api-reference.md) - All REST endpoints
- [Project Management](./backend/project-management.md) - Project storage and loading
- [Tab System](./backend/tab-system.md) - Multi-tab workflow support
- [File Operations](./backend/file-operations.md) - File and filesystem operations
- [Execution Engine](./backend/execution-engine.md) - Workflow execution and SSE streaming
- [Extension System](./backend/extension-system.md) - Custom node discovery and loading

## Extensions

Creating custom nodes with the FlowUnit API.

- [Extensions Overview](./extensions/README.md) - Getting started with custom nodes
- [FlowUnit API](./extensions/flowunit-api.md) - Base class reference
- [Port Schemas](./extensions/port-schemas.md) - Input/output port definitions
- [Field Schemas](./extensions/field-schemas.md) - Configuration field definitions
- [UI Schema](./extensions/ui-schema.md) - Node appearance configuration
- [Node Layouts](./extensions/node-layouts.md) - Visual layout styles
- [Type System](./extensions/type-system.md) - Type definitions and validation
- [Execution Context](./extensions/execution-context.md) - Runtime context and state
- [Caching & Execution](./extensions/caching-execution.md) - Execution control and caching
- [Best Practices](./extensions/best-practices.md) - Patterns and conventions
- [Examples](./extensions/examples/README.md) - Working extension examples

## CLI

Command-line interface.

- [CLI Overview](./cli/README.md) - CLI architecture
- [Commands Reference](./cli/commands.md) - All CLI commands

## Testing

- [Testing Guide](./testing.md) - Running, writing, and maintaining tests

---

## Tech Stack

| Component | Technology | Location |
|-----------|------------|----------|
| Frontend | Next.js 15, React 19, TypeScript | `/frontend/` |
| Backend | FastAPI, Python 3.13+, Pydantic v2 | `/backend/` |
| CLI | Python Click | `/cli/` |
| Execution | adkflow-runner | `/packages/adkflow-runner/` |

## Key Patterns

- **Schema-driven UI**: Backend defines node schemas, frontend renders them dynamically
- **Hook composition**: Complex logic split into specialized hooks
- **SSE streaming**: Real-time execution events via Server-Sent Events
- **Multi-scope extensions**: Global and project-level custom nodes
