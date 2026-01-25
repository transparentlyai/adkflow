# Frontend Overview

Next.js/React frontend architecture for ADKFlow.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 15** | React framework with App Router |
| **React 19** | UI library |
| **TypeScript** | Type-safe JavaScript |
| **ReactFlow** | Node-based canvas (@xyflow/react) |
| **Tailwind CSS** | Utility-first styling |
| **Radix UI** | Accessible component primitives |
| **Monaco Editor** | Code editing widgets |
| **Axios** | HTTP client |

## Directory Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/             # React components
│   ├── nodes/             # Node implementations
│   ├── ui/                # Radix UI wrappers
│   └── hooks/             # Component-level hooks
├── contexts/              # React Context providers
├── hooks/                 # Shared/page-level hooks
│   └── home/              # Home page hooks
└── lib/                   # Utilities and services
    ├── api/               # API client (modular)
    │   ├── client.ts      # Axios config
    │   ├── project.ts     # Project APIs
    │   ├── tabs.ts        # Tab APIs
    │   ├── execution.ts   # Execution APIs
    │   ├── filesystem.ts  # Filesystem APIs
    │   ├── settings.ts    # Settings APIs
    │   ├── extensions.ts  # Extension APIs
    │   └── index.ts       # Re-exports
    ├── types.ts           # TypeScript types
    └── themes/            # Theme system
```

## Key Modules

| Module | Description | Documentation |
|--------|-------------|---------------|
| **State Management** | React Contexts for global state | [state-management.md](./state-management.md) |
| **Canvas System** | ReactFlow integration | [canvas-system.md](./canvas-system.md) |
| **Node System** | Node types and widgets | [node-system.md](./node-system.md) |
| **Hooks Architecture** | Hook composition patterns | [hooks-architecture.md](./hooks-architecture.md) |
| **API Client** | Backend communication | [api-client.md](./api-client.md) |
| **Theme System** | Theming implementation | [theme-system.md](./theme-system.md) |
| **Components** | UI component library | [components.md](./components.md) |

## Architecture Patterns

### Component Hierarchy

```
App (layout.tsx)
└── ThemeProvider
    └── Page (page.tsx)
        ├── TabsProvider
        │   ├── ClipboardProvider
        │   │   ├── TopMenubar
        │   │   ├── TabBar
        │   │   └── ReactFlowCanvas
        │   └── Dialogs
        └── RunPanel/          # Modular component
```

### Data Flow

```
User Action
    ↓
Component Event Handler
    ↓
Hook Function (useProjectManagement, etc.)
    ↓
Context Dispatch / API Call
    ↓
State Update
    ↓
Re-render
```

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `components/ReactFlowCanvas.tsx` | Main canvas component | ~300 |
| `components/nodes/CustomNode.tsx` | Base node component | ~200 |
| `lib/api/` | API client (modular) | ~600 total |
| `lib/types.ts` | Type definitions | ~250 |

## Development

### Running Locally

```bash
cd frontend
npm install
npm run dev
```

### Building

```bash
npm run build
npm run start
```

### Linting

```bash
npm run lint
```

## Conventions

### Imports

Use absolute imports from project root:

```typescript
// Good
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';

// Avoid
import { useTheme } from '../../../contexts/ThemeContext';
```

### Component Structure

```typescript
// 1. Imports
import { useState } from 'react';

// 2. Types (if component-specific)
interface MyComponentProps {
  value: string;
}

// 3. Component
export function MyComponent({ value }: MyComponentProps) {
  // 4. Hooks
  const [state, setState] = useState(value);

  // 5. Handlers
  const handleClick = () => { ... };

  // 6. Render
  return <div onClick={handleClick}>{state}</div>;
}
```

### Hooks

- Prefix with `use`: `useProjectManagement`, `useCanvasHistory`
- Return objects for named access: `const { save, load } = useProject()`
- Keep hooks focused on single responsibility

## See Also

- [Architecture](../architecture.md) - System overview
- [Backend](../backend/README.md) - Backend documentation
- [Contributing](../../contributing.md) - Contribution guidelines
