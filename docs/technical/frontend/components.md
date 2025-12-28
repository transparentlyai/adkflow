# Components

UI component library in ADKFlow.

## Overview

ADKFlow uses a component library built on:
- **Radix UI** - Accessible primitives
- **Tailwind CSS** - Utility styling
- **Custom components** - ADKFlow-specific UI

## Directory Structure

```
components/
├── ui/                    # Radix UI wrappers
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── input.tsx
│   └── ...
├── nodes/                 # Node components
│   ├── CustomNode.tsx
│   ├── GroupNode.tsx
│   └── widgets/
├── dialogs/               # Modal dialogs
│   ├── ProjectDialog.tsx
│   └── ...
└── [other components]
```

## UI Components (Radix Wrappers)

Located in `components/ui/`:

### Button

```tsx
import { Button } from '@/components/ui/button';

<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="outline">Outline</Button>
```

### Dialog

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <Button onClick={onClose}>Cancel</Button>
      <Button onClick={onConfirm}>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Input

```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

<div>
  <Label htmlFor="name">Name</Label>
  <Input
    id="name"
    value={value}
    onChange={(e) => setValue(e.target.value)}
    placeholder="Enter name..."
  />
</div>
```

### Select

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

### Tabs

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

<Tabs defaultValue="general">
  <TabsList>
    <TabsTrigger value="general">General</TabsTrigger>
    <TabsTrigger value="advanced">Advanced</TabsTrigger>
  </TabsList>
  <TabsContent value="general">General content</TabsContent>
  <TabsContent value="advanced">Advanced content</TabsContent>
</Tabs>
```

### Other Components

| Component | Purpose |
|-----------|---------|
| `Alert` | Status messages |
| `AlertDialog` | Confirmation dialogs |
| `Card` | Content containers |
| `ContextMenu` | Right-click menus |
| `Menubar` | Top menu bar |
| `RadioGroup` | Radio button groups |
| `ScrollArea` | Scrollable containers |
| `Tooltip` | Hover tooltips |

## Application Components

### TopMenubar

**Location**: `components/TopMenubar.tsx`

Main menu bar with File, Edit, View, Workflow, Theme menus.

```tsx
<TopMenubar
  onNewProject={handleNewProject}
  onOpenProject={handleOpenProject}
  onSave={handleSave}
  onUndo={handleUndo}
  onRedo={handleRedo}
  onRun={handleRun}
/>
```

### TabBar

**Location**: `components/TabBar.tsx`

Workflow tab management.

```tsx
<TabBar
  tabs={tabs}
  activeTabId={activeTabId}
  onTabClick={handleTabClick}
  onTabClose={handleTabClose}
  onAddTab={handleAddTab}
/>
```

### RunPanel

**Location**: `components/RunPanel.tsx`

Execution output and user input.

```tsx
<RunPanel
  isOpen={isRunning}
  events={runEvents}
  onCancel={handleCancel}
  onUserInput={handleUserInput}
/>
```

### FilePicker

**Location**: `components/FilePicker.tsx`

File and directory selection.

```tsx
<FilePicker
  mode="file"
  extensions={['.md', '.txt']}
  onSelect={handleSelect}
  onCancel={handleCancel}
/>
```

### ContextMenu

**Location**: `components/CanvasContextMenu.tsx`

Right-click menu for canvas.

```tsx
<CanvasContextMenu
  position={menuPosition}
  nodeSchemas={schemas}
  onAddNode={handleAddNode}
  onClose={handleClose}
/>
```

## Dialog Components

| Dialog | Purpose |
|--------|---------|
| `ProjectDialog` | Create/open project |
| `ProjectSwitcher` | Quick project switch |
| `PromptNameDialog` | Create new prompt |
| `SaveConfirmDialog` | Unsaved changes warning |
| `RunConfirmDialog` | Execution parameters |
| `ValidationResultDialog` | Validation errors |
| `TopologyDialog` | Workflow diagram |
| `SettingsDialog` | Preferences |
| `GroupDeleteDialog` | Group deletion confirmation |

## Styling Patterns

### Tailwind Classes

```tsx
<div className="flex items-center gap-2 p-4 bg-background border rounded-lg">
  <span className="text-sm text-muted-foreground">Label</span>
  <Input className="flex-1" />
</div>
```

### Theme Variables

```tsx
<div style={{ background: 'var(--background)' }}>
  {/* Content */}
</div>
```

### Conditional Classes

```tsx
import { cn } from '@/lib/utils';

<button
  className={cn(
    'px-4 py-2 rounded',
    isActive ? 'bg-primary text-primary-foreground' : 'bg-muted'
  )}
>
  {label}
</button>
```

## Component Conventions

### Props Interface

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}
```

### Forward Refs

```typescript
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn('...', className)}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
```

### Composition

```typescript
// Export individual parts for composition
export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter };

// Usage allows flexibility
<Dialog>
  <DialogContent>
    {/* Custom layout */}
  </DialogContent>
</Dialog>
```

## See Also

- [Node System](./node-system.md) - Node components
- [Theme System](./theme-system.md) - Styling
- [Radix UI Docs](https://www.radix-ui.com/) - Component primitives
