# User Manual

Complete guide to using ADKFlow for building AI agent workflows.

## Getting Started

- [Getting Started](./getting-started.md) - Installation, CLI setup, and your first project
- [Interface Overview](./interface-overview.md) - Understanding the ADKFlow interface

## Core Concepts

- [Projects](./projects.md) - Creating, opening, and managing projects
- [Canvas](./canvas.md) - Navigating and working with the canvas
- [Nodes](./nodes.md) - Adding and configuring nodes
- [Connections](./connections.md) - Connecting nodes together

## Advanced Features

- [Groups](./groups.md) - Organizing nodes into groups
- [Tabs](./tabs.md) - Working with multiple workflow tabs
- [Teleporters](./teleporters.md) - Connecting flows across tabs
- [Prompts & Contexts](./prompts-and-contexts.md) - Managing prompts and context files

## Execution

- [Running Workflows](./running-workflows.md) - Executing workflows and viewing output
- [Validation](./validation.md) - Validating workflows and viewing topology

## Debugging (Dev Mode)

When running with `./adkflow dev`, additional debugging tools are available:

- **Debug Panel** - Configure logging levels and options (⚙ icon in Run Panel)
- **Log Explorer** - View structured logs with filtering (📄 icon in Run Panel)
- **Trace Explorer** - Visualize agent execution as span trees (📊 icon in Run Panel)

See [Running Workflows - Debugging](./running-workflows.md#debugging-dev-mode) for details.

## Reference

- [Keyboard Shortcuts](./keyboard-shortcuts.md) - All keyboard shortcuts
- [Themes](./themes.md) - Customizing the appearance
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions

---

## Quick Start

1. **Install**: `pip install adkflow` (or clone and run `adkflow setup`)
2. **Start**: `adkflow dev` to launch the development server
3. **Create**: File → New Project to create your first workflow
4. **Build**: Drag nodes from the menu, connect them, configure settings
5. **Run**: Click "Run" to execute your workflow

See [Getting Started](./getting-started.md) for detailed instructions.
