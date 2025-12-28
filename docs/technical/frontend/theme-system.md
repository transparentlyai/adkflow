# Theme System

Theming implementation in ADKFlow.

## Overview

The theme system provides:
- Light and dark themes
- CSS variable-based styling
- Theme persistence
- System theme detection

**Location**: `lib/themes/`

## Architecture

```
lib/themes/
├── index.ts           # Public API
├── types.ts           # Theme type definitions
├── themeLoader.ts     # Loading and persistence
└── themes/
    ├── dark.json      # Dark theme definition
    └── light.json     # Light theme definition
```

## Theme Structure

### Theme Definition

```typescript
interface Theme {
  name: string;
  colors: {
    // Base colors
    background: string;
    foreground: string;
    muted: string;
    mutedForeground: string;

    // Canvas
    canvas: {
      background: string;
      grid: string;
    };

    // Interactive
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;

    // Status
    success: string;
    warning: string;
    error: string;

    // Nodes
    node: {
      background: string;
      border: string;
      selected: string;
      hover: string;
    };

    // Node types
    nodeTypes: {
      agent: string;
      prompt: string;
      context: string;
      tool: string;
      variable: string;
      group: string;
    };
  };
}
```

### Theme Files

**dark.json**:
```json
{
  "name": "Dark",
  "colors": {
    "background": "#1a1a1a",
    "foreground": "#fafafa",
    "canvas": {
      "background": "#0a0a0a",
      "grid": "#262626"
    },
    "node": {
      "background": "#262626",
      "border": "#404040"
    }
  }
}
```

## ThemeContext

**Location**: `contexts/ThemeContext.tsx`

```typescript
interface ThemeContextValue {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  colors: Theme['colors'];
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  // Detect system preference
  useEffect(() => {
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setResolvedTheme(isDark ? 'dark' : 'light');
    } else {
      setResolvedTheme(theme);
    }
  }, [theme]);

  // Load theme colors
  const colors = useMemo(() => {
    return loadTheme(resolvedTheme);
  }, [resolvedTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

## CSS Variables

Themes apply CSS variables to the document:

```typescript
function applyTheme(colors: Theme['colors']) {
  const root = document.documentElement;

  root.style.setProperty('--background', colors.background);
  root.style.setProperty('--foreground', colors.foreground);
  root.style.setProperty('--primary', colors.primary);
  // ... more variables
}
```

### Using Variables in CSS

```css
.component {
  background: var(--background);
  color: var(--foreground);
  border: 1px solid var(--border);
}
```

### Using in Tailwind

```typescript
// tailwind.config.ts
{
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: 'var(--primary)',
      }
    }
  }
}
```

```tsx
<div className="bg-background text-foreground">
  <button className="bg-primary text-primary-foreground">
    Click me
  </button>
</div>
```

## useTheme Hook

```typescript
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// Usage
function MyComponent() {
  const { theme, setTheme, colors } = useTheme();

  return (
    <div style={{ background: colors.node.background }}>
      <button onClick={() => setTheme('dark')}>Dark</button>
    </div>
  );
}
```

## Theme Persistence

### Saving

```typescript
function setTheme(theme: 'light' | 'dark' | 'system') {
  localStorage.setItem('adkflow-theme', theme);
  // ... apply theme
}
```

### Loading

```typescript
function loadSavedTheme(): 'light' | 'dark' | 'system' {
  const saved = localStorage.getItem('adkflow-theme');
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved;
  }
  return 'system'; // Default
}
```

## Node Type Colors

Each node type has a designated color:

```typescript
const nodeTypeColors = {
  agent: '#3b82f6',      // Blue
  prompt: '#22c55e',     // Green
  context: '#8b5cf6',    // Purple
  tool: '#f59e0b',       // Orange
  variable: '#06b6d4',   // Cyan
  group: '#6b7280',      // Gray
};
```

These are used for:
- Node headers
- Handle colors
- Menu icons

## Accessing Colors

### In Components

```typescript
function NodeHeader({ type }: { type: string }) {
  const { colors } = useTheme();
  const typeColor = colors.nodeTypes[type] || colors.nodeTypes.agent;

  return (
    <div style={{ background: typeColor }}>
      {/* ... */}
    </div>
  );
}
```

### From Theme Key

Extensions can specify a `theme_key`:

```typescript
const schema = {
  ui_schema: {
    theme_key: 'agent', // Uses agent color from theme
    color: '#custom',   // Or custom color
  },
};
```

## See Also

- [Components](./components.md) - Component styling
- [Node System](./node-system.md) - Node colors
- [Extensions](../extensions/README.md) - Extension theming
