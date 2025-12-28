# Themes

Customizing the appearance of ADKFlow.

## Available Themes

ADKFlow includes two built-in themes:

| Theme | Description |
|-------|-------------|
| **Light** | Light background, dark text |
| **Dark** | Dark background, light text |

## Switching Themes

### From Menu

**Theme** menu → Select **Light** or **Dark**

### System Theme

Select **System** to follow your operating system's theme preference:
- macOS: Follows Appearance setting
- Windows: Follows Windows color mode
- Linux: Follows desktop environment theme

## Theme Persistence

Your theme preference is:
- Saved to browser local storage
- Restored on next visit
- Per-browser (not synced across devices)

## Theme Colors

### Light Theme

| Element | Color |
|---------|-------|
| Background | White |
| Canvas | Light gray grid |
| Text | Dark gray |
| Nodes | White with colored headers |
| Selection | Blue |

### Dark Theme

| Element | Color |
|---------|-------|
| Background | Dark gray |
| Canvas | Dark grid |
| Text | Light gray |
| Nodes | Dark with colored headers |
| Selection | Blue |

## Node Colors

Node header colors are consistent across themes:

| Node Type | Color |
|-----------|-------|
| Agent | Blue |
| Prompt | Green |
| Context | Purple |
| Tool | Orange |
| Variable | Teal |
| Group | Gray |

## Custom Themes

### Theme Files

Custom themes can be added as JSON files in your system or project.

### Theme Structure

```json
{
  "name": "My Theme",
  "colors": {
    "background": "#ffffff",
    "foreground": "#1a1a1a",
    "canvas": "#f5f5f5",
    "primary": "#3b82f6",
    "node": {
      "agent": "#3b82f6",
      "prompt": "#22c55e",
      "context": "#8b5cf6"
    }
  }
}
```

### Loading Custom Themes

Currently, custom themes require modifying the source code. Future versions may support:
- Theme files in project folder
- Theme import/export
- Community theme sharing

## Accessibility

### Contrast

Both themes maintain sufficient contrast ratios for readability.

### Color Blindness

Node colors are designed to be distinguishable for common forms of color blindness. Additional work is ongoing.

## Tips

### Choosing a Theme

- **Light**: Better in bright environments
- **Dark**: Reduces eye strain in low light

### Presentations

Light theme often works better for:
- Screen sharing
- Presentations
- Screenshots for documentation

## Troubleshooting

### Theme Not Saving

1. Check browser allows local storage
2. Clear browser cache and retry
3. Ensure you're not in private/incognito mode

### Theme Looks Wrong

1. Hard refresh (Ctrl+Shift+R)
2. Clear browser cache
3. Reset to default theme

## See Also

- [Interface Overview](./interface-overview.md) - UI reference
- [Troubleshooting](./troubleshooting.md) - Common issues
