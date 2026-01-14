import type { AgentPrismTraceTypeColors, Theme } from "./types";
import lightTheme from "./themes/light.json";
import darkTheme from "./themes/dark.json";

// Built-in themes
export const builtInThemes: Theme[] = [lightTheme as Theme, darkTheme as Theme];

/**
 * Get a built-in theme by ID
 */
export function getBuiltInTheme(id: string): Theme | undefined {
  return builtInThemes.find((t) => t.id === id);
}

/**
 * Get all available themes (built-in + custom from localStorage)
 */
export function getAllThemes(): Theme[] {
  const customThemes = getCustomThemes();
  return [...builtInThemes, ...customThemes];
}

/**
 * Get custom themes from localStorage
 */
export function getCustomThemes(): Theme[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem("adkflow-custom-themes");
    if (!stored) return [];
    return JSON.parse(stored) as Theme[];
  } catch {
    return [];
  }
}

/**
 * Save custom themes to localStorage
 */
export function saveCustomThemes(themes: Theme[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("adkflow-custom-themes", JSON.stringify(themes));
}

/**
 * Add a custom theme
 */
export function addCustomTheme(theme: Theme): void {
  const themes = getCustomThemes();
  const existingIndex = themes.findIndex((t) => t.id === theme.id);

  if (existingIndex >= 0) {
    themes[existingIndex] = theme;
  } else {
    themes.push(theme);
  }

  saveCustomThemes(themes);
}

/**
 * Remove a custom theme
 */
export function removeCustomTheme(id: string): void {
  const themes = getCustomThemes().filter((t) => t.id !== id);
  saveCustomThemes(themes);
}

/**
 * Get the current theme ID from localStorage
 */
export function getCurrentThemeId(): string {
  if (typeof window === "undefined") return "light";
  return localStorage.getItem("adkflow-theme-id") || "light";
}

/**
 * Save the current theme ID to localStorage
 */
export function saveCurrentThemeId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("adkflow-theme-id", id);
}

/**
 * Apply theme colors to CSS custom properties
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const colors = theme.colors;

  // Canvas
  root.style.setProperty("--canvas-bg", colors.canvas.background);
  root.style.setProperty("--canvas-grid", colors.canvas.grid);
  root.style.setProperty(
    "--canvas-minimap-bg",
    colors.canvas.minimap.background,
  );
  root.style.setProperty("--canvas-minimap-mask", colors.canvas.minimap.mask);
  root.style.setProperty(
    "--canvas-minimap-node-stroke",
    colors.canvas.minimap.nodeStroke,
  );

  // Node common
  root.style.setProperty(
    "--node-container-bg",
    colors.nodes.common.container.background,
  );
  root.style.setProperty(
    "--node-container-border",
    colors.nodes.common.container.border,
  );
  root.style.setProperty(
    "--node-container-shadow",
    colors.nodes.common.container.shadow,
  );
  root.style.setProperty(
    "--node-footer-bg",
    colors.nodes.common.footer.background,
  );
  root.style.setProperty(
    "--node-footer-border",
    colors.nodes.common.footer.border,
  );
  root.style.setProperty("--node-footer-text", colors.nodes.common.footer.text);
  root.style.setProperty(
    "--node-text-primary",
    colors.nodes.common.text.primary,
  );
  root.style.setProperty(
    "--node-text-secondary",
    colors.nodes.common.text.secondary,
  );
  root.style.setProperty("--node-text-muted", colors.nodes.common.text.muted);

  // Agent node
  root.style.setProperty("--node-agent-header", colors.nodes.agent.header);
  root.style.setProperty(
    "--node-agent-header-hover",
    colors.nodes.agent.headerHover || colors.nodes.agent.header,
  );
  root.style.setProperty("--node-agent-text", colors.nodes.agent.text);
  root.style.setProperty("--node-agent-ring", colors.nodes.agent.ring);
  root.style.setProperty(
    "--node-agent-badge-llm-bg",
    colors.nodes.agent.badges.llm.background,
  );
  root.style.setProperty(
    "--node-agent-badge-llm-text",
    colors.nodes.agent.badges.llm.text,
  );
  root.style.setProperty(
    "--node-agent-badge-sequential-bg",
    colors.nodes.agent.badges.sequential.background,
  );
  root.style.setProperty(
    "--node-agent-badge-sequential-text",
    colors.nodes.agent.badges.sequential.text,
  );
  root.style.setProperty(
    "--node-agent-badge-parallel-bg",
    colors.nodes.agent.badges.parallel.background,
  );
  root.style.setProperty(
    "--node-agent-badge-parallel-text",
    colors.nodes.agent.badges.parallel.text,
  );
  root.style.setProperty(
    "--node-agent-badge-loop-bg",
    colors.nodes.agent.badges.loop.background,
  );
  root.style.setProperty(
    "--node-agent-badge-loop-text",
    colors.nodes.agent.badges.loop.text,
  );

  // Prompt node
  root.style.setProperty("--node-prompt-header", colors.nodes.prompt.header);
  root.style.setProperty(
    "--node-prompt-header-hover",
    colors.nodes.prompt.headerHover || colors.nodes.prompt.header,
  );
  root.style.setProperty("--node-prompt-text", colors.nodes.prompt.text);
  root.style.setProperty("--node-prompt-ring", colors.nodes.prompt.ring);

  // Context node
  root.style.setProperty("--node-context-header", colors.nodes.context.header);
  root.style.setProperty(
    "--node-context-header-hover",
    colors.nodes.context.headerHover || colors.nodes.context.header,
  );
  root.style.setProperty("--node-context-text", colors.nodes.context.text);
  root.style.setProperty("--node-context-ring", colors.nodes.context.ring);

  // Tool node
  root.style.setProperty("--node-tool-header", colors.nodes.tool.header);
  root.style.setProperty(
    "--node-tool-header-hover",
    colors.nodes.tool.headerHover || colors.nodes.tool.header,
  );
  root.style.setProperty("--node-tool-text", colors.nodes.tool.text);
  root.style.setProperty("--node-tool-ring", colors.nodes.tool.ring);

  // AgentTool node
  root.style.setProperty(
    "--node-agent-tool-header",
    colors.nodes.agentTool.header,
  );
  root.style.setProperty(
    "--node-agent-tool-header-hover",
    colors.nodes.agentTool.headerHover || colors.nodes.agentTool.header,
  );
  root.style.setProperty("--node-agent-tool-text", colors.nodes.agentTool.text);
  root.style.setProperty("--node-agent-tool-ring", colors.nodes.agentTool.ring);

  // Callback node
  root.style.setProperty(
    "--node-callback-header",
    colors.nodes.callback.header,
  );
  root.style.setProperty(
    "--node-callback-header-hover",
    colors.nodes.callback.headerHover || colors.nodes.callback.header,
  );
  root.style.setProperty("--node-callback-text", colors.nodes.callback.text);
  root.style.setProperty("--node-callback-ring", colors.nodes.callback.ring);

  // Variable node
  root.style.setProperty(
    "--node-variable-header",
    colors.nodes.variable.header,
  );
  root.style.setProperty(
    "--node-variable-header-hover",
    colors.nodes.variable.headerHover || colors.nodes.variable.header,
  );
  root.style.setProperty("--node-variable-text", colors.nodes.variable.text);
  root.style.setProperty("--node-variable-ring", colors.nodes.variable.ring);

  // Process node
  root.style.setProperty("--node-process-header", colors.nodes.process.header);
  root.style.setProperty(
    "--node-process-header-hover",
    colors.nodes.process.headerHover || colors.nodes.process.header,
  );
  root.style.setProperty("--node-process-text", colors.nodes.process.text);
  root.style.setProperty("--node-process-ring", colors.nodes.process.ring);

  // Group node
  root.style.setProperty("--node-group-header", colors.nodes.group.header);
  root.style.setProperty(
    "--node-group-header-active",
    colors.nodes.group.headerActive,
  );
  root.style.setProperty("--node-group-text", colors.nodes.group.text);
  root.style.setProperty("--node-group-border", colors.nodes.group.border);
  root.style.setProperty(
    "--node-group-border-active",
    colors.nodes.group.borderActive,
  );
  root.style.setProperty("--node-group-drop-zone", colors.nodes.group.dropZone);

  // Probe node
  root.style.setProperty("--node-probe-header", colors.nodes.probe.header);
  root.style.setProperty(
    "--node-probe-header-hover",
    colors.nodes.probe.headerHover || colors.nodes.probe.header,
  );
  root.style.setProperty("--node-probe-text", colors.nodes.probe.text);
  root.style.setProperty("--node-probe-ring", colors.nodes.probe.ring);

  // OutputFile node
  root.style.setProperty(
    "--node-output-file-header",
    colors.nodes.outputFile.header,
  );
  root.style.setProperty(
    "--node-output-file-header-hover",
    colors.nodes.outputFile.headerHover || colors.nodes.outputFile.header,
  );
  root.style.setProperty(
    "--node-output-file-text",
    colors.nodes.outputFile.text,
  );
  root.style.setProperty(
    "--node-output-file-ring",
    colors.nodes.outputFile.ring,
  );

  // Label node
  root.style.setProperty("--node-label-header", colors.nodes.label.header);
  root.style.setProperty("--node-label-text", colors.nodes.label.text);
  root.style.setProperty("--node-label-ring", colors.nodes.label.ring);

  // Start node
  root.style.setProperty("--node-start-header", colors.nodes.start.header);
  root.style.setProperty(
    "--node-start-header-hover",
    colors.nodes.start.headerHover || colors.nodes.start.header,
  );
  root.style.setProperty("--node-start-text", colors.nodes.start.text);
  root.style.setProperty("--node-start-ring", colors.nodes.start.ring);

  // End node
  root.style.setProperty("--node-end-header", colors.nodes.end.header);
  root.style.setProperty(
    "--node-end-header-hover",
    colors.nodes.end.headerHover || colors.nodes.end.header,
  );
  root.style.setProperty("--node-end-text", colors.nodes.end.text);
  root.style.setProperty("--node-end-ring", colors.nodes.end.ring);

  // Teleport colors (stored as JSON for JS access)
  root.style.setProperty(
    "--teleport-colors",
    JSON.stringify(colors.nodes.teleport.colors),
  );

  // Handles
  root.style.setProperty("--handle-input", colors.handles.input);
  root.style.setProperty("--handle-output", colors.handles.output);
  root.style.setProperty("--handle-link", colors.handles.link);
  root.style.setProperty("--handle-tool", colors.handles.tool);
  root.style.setProperty("--handle-context", colors.handles.context);
  root.style.setProperty("--handle-agent-tool", colors.handles.agentTool);
  root.style.setProperty("--handle-callback", colors.handles.callback);
  root.style.setProperty("--handle-process", colors.handles.process);
  root.style.setProperty("--handle-probe", colors.handles.probe);
  root.style.setProperty("--handle-border", colors.handles.border);

  // Edges
  root.style.setProperty("--edge-default", colors.edges.default);
  root.style.setProperty("--edge-link", colors.edges.link);
  root.style.setProperty("--edge-selected", colors.edges.selected);

  // UI colors (shadcn compatible)
  root.style.setProperty("--background", colors.ui.background);
  root.style.setProperty("--foreground", colors.ui.foreground);
  root.style.setProperty("--card", colors.ui.card);
  root.style.setProperty("--card-foreground", colors.ui.cardForeground);
  root.style.setProperty("--popover", colors.ui.popover);
  root.style.setProperty("--popover-foreground", colors.ui.popoverForeground);
  root.style.setProperty("--primary", colors.ui.primary);
  root.style.setProperty("--primary-foreground", colors.ui.primaryForeground);
  root.style.setProperty("--secondary", colors.ui.secondary);
  root.style.setProperty(
    "--secondary-foreground",
    colors.ui.secondaryForeground,
  );
  root.style.setProperty("--muted", colors.ui.muted);
  root.style.setProperty("--muted-foreground", colors.ui.mutedForeground);
  root.style.setProperty("--accent", colors.ui.accent);
  root.style.setProperty("--accent-foreground", colors.ui.accentForeground);
  root.style.setProperty("--destructive", colors.ui.destructive);
  root.style.setProperty(
    "--destructive-foreground",
    colors.ui.destructiveForeground,
  );
  root.style.setProperty("--border", colors.ui.border);
  root.style.setProperty("--input", colors.ui.input);
  root.style.setProperty("--ring", colors.ui.ring);

  // Form colors
  root.style.setProperty("--form-bg", colors.form.background);
  root.style.setProperty("--form-text", colors.form.text);
  root.style.setProperty("--form-border", colors.form.border);
  root.style.setProperty("--form-placeholder", colors.form.placeholder);
  root.style.setProperty("--form-focus-border", colors.form.focus.border);
  root.style.setProperty("--form-focus-ring", colors.form.focus.ring);
  root.style.setProperty("--form-disabled-bg", colors.form.disabled.background);
  root.style.setProperty("--form-disabled-text", colors.form.disabled.text);
  root.style.setProperty("--form-select-bg", colors.form.select.background);
  root.style.setProperty("--form-select-text", colors.form.select.text);
  root.style.setProperty(
    "--form-select-option-bg",
    colors.form.select.optionBackground,
  );
  root.style.setProperty(
    "--form-select-option-text",
    colors.form.select.optionText,
  );
  root.style.setProperty("--form-checkbox-bg", colors.form.checkbox.background);
  root.style.setProperty("--form-checkbox-border", colors.form.checkbox.border);
  root.style.setProperty(
    "--form-checkbox-checked",
    colors.form.checkbox.checked,
  );
  root.style.setProperty(
    "--form-checkbox-checkmark",
    colors.form.checkbox.checkmark,
  );
  root.style.setProperty("--form-slider-track", colors.form.slider.track);
  root.style.setProperty("--form-slider-thumb", colors.form.slider.thumb);
  root.style.setProperty("--form-slider-active", colors.form.slider.active);

  // Scrollbar
  root.style.setProperty("--scrollbar-track", colors.scrollbar.track);
  root.style.setProperty("--scrollbar-thumb", colors.scrollbar.thumb);
  root.style.setProperty(
    "--scrollbar-thumb-hover",
    colors.scrollbar.thumbHover,
  );

  // Monaco theme (stored for JS access)
  root.style.setProperty("--monaco-theme", colors.monaco);

  // State colors
  root.style.setProperty("--state-running-ring", colors.state.running.ring);
  root.style.setProperty("--state-running-glow", colors.state.running.glow);
  root.style.setProperty("--state-completed-ring", colors.state.completed.ring);
  root.style.setProperty("--state-completed-glow", colors.state.completed.glow);
  root.style.setProperty("--state-error-ring", colors.state.error.ring);
  root.style.setProperty("--state-error-glow", colors.state.error.glow);
  root.style.setProperty("--state-valid-ring", colors.state.valid.ring);
  root.style.setProperty("--state-valid-glow", colors.state.valid.glow);
  root.style.setProperty("--state-invalid-ring", colors.state.invalid.ring);
  root.style.setProperty("--state-invalid-glow", colors.state.invalid.glow);
  root.style.setProperty("--state-dirty-ring", colors.state.dirty.ring);
  root.style.setProperty("--state-selected-ring", colors.state.selected.ring);
  root.style.setProperty("--state-success", colors.state.success);
  root.style.setProperty("--state-warning", colors.state.warning);
  root.style.setProperty("--state-danger", colors.state.danger);

  // AgentPrism colors (for trace visualization)
  const ap = colors.agentPrism;

  // General purpose colors
  root.style.setProperty("--agentprism-background", ap.background);
  root.style.setProperty("--agentprism-foreground", ap.foreground);
  root.style.setProperty("--agentprism-primary", ap.primary);
  root.style.setProperty("--agentprism-primary-foreground", ap.primaryForeground);
  root.style.setProperty("--agentprism-secondary", ap.secondary);
  root.style.setProperty(
    "--agentprism-secondary-foreground",
    ap.secondaryForeground,
  );
  root.style.setProperty("--agentprism-muted", ap.muted);
  root.style.setProperty("--agentprism-muted-foreground", ap.mutedForeground);
  root.style.setProperty("--agentprism-accent", ap.accent);
  root.style.setProperty("--agentprism-accent-foreground", ap.accentForeground);

  // Brand colors
  root.style.setProperty("--agentprism-brand", ap.brand);
  root.style.setProperty("--agentprism-brand-foreground", ap.brandForeground);
  root.style.setProperty("--agentprism-brand-secondary", ap.brandSecondary);
  root.style.setProperty(
    "--agentprism-brand-secondary-foreground",
    ap.brandSecondaryForeground,
  );

  // Borders
  root.style.setProperty("--agentprism-border", ap.border);
  root.style.setProperty("--agentprism-border-subtle", ap.borderSubtle);
  root.style.setProperty("--agentprism-border-strong", ap.borderStrong);
  root.style.setProperty("--agentprism-border-inverse", ap.borderInverse);

  // Status colors
  root.style.setProperty("--agentprism-success", ap.success);
  root.style.setProperty("--agentprism-success-muted", ap.successMuted);
  root.style.setProperty(
    "--agentprism-success-muted-foreground",
    ap.successMutedForeground,
  );
  root.style.setProperty("--agentprism-error", ap.error);
  root.style.setProperty("--agentprism-error-muted", ap.errorMuted);
  root.style.setProperty(
    "--agentprism-error-muted-foreground",
    ap.errorMutedForeground,
  );
  root.style.setProperty("--agentprism-warning", ap.warning);
  root.style.setProperty("--agentprism-warning-muted", ap.warningMuted);
  root.style.setProperty(
    "--agentprism-warning-muted-foreground",
    ap.warningMutedForeground,
  );
  root.style.setProperty("--agentprism-pending", ap.pending);
  root.style.setProperty("--agentprism-pending-muted", ap.pendingMuted);
  root.style.setProperty(
    "--agentprism-pending-muted-foreground",
    ap.pendingMutedForeground,
  );

  // Code syntax highlighting
  root.style.setProperty("--agentprism-code-string", ap.codeString);
  root.style.setProperty("--agentprism-code-number", ap.codeNumber);
  root.style.setProperty("--agentprism-code-key", ap.codeKey);
  root.style.setProperty("--agentprism-code-base", ap.codeBase);

  // Badge defaults
  root.style.setProperty("--agentprism-badge-default", ap.badgeDefault);
  root.style.setProperty(
    "--agentprism-badge-default-foreground",
    ap.badgeDefaultForeground,
  );

  // Helper to apply trace type colors
  const applyTraceTypeColors = (
    prefix: string,
    colors: AgentPrismTraceTypeColors,
  ) => {
    root.style.setProperty(`--agentprism-avatar-${prefix}`, colors.avatar);
    root.style.setProperty(`--agentprism-badge-${prefix}`, colors.badge);
    root.style.setProperty(
      `--agentprism-badge-${prefix}-foreground`,
      colors.badgeForeground,
    );
    root.style.setProperty(`--agentprism-timeline-${prefix}`, colors.timeline);
  };

  // Trace type colors
  applyTraceTypeColors("llm", ap.llm);
  applyTraceTypeColors("agent", ap.agent);
  applyTraceTypeColors("tool", ap.tool);
  applyTraceTypeColors("chain", ap.chain);
  applyTraceTypeColors("retrieval", ap.retrieval);
  applyTraceTypeColors("embedding", ap.embedding);
  applyTraceTypeColors("guardrail", ap.guardrail);
  applyTraceTypeColors("create-agent", ap.createAgent);
  applyTraceTypeColors("span", ap.span);
  applyTraceTypeColors("event", ap.event);
  applyTraceTypeColors("unknown", ap.unknown);
}

/**
 * Validate a theme object
 */
export function validateTheme(theme: unknown): theme is Theme {
  if (!theme || typeof theme !== "object") return false;

  const t = theme as Record<string, unknown>;

  // Check required top-level fields
  if (typeof t.id !== "string" || !t.id) return false;
  if (typeof t.name !== "string" || !t.name) return false;
  if (typeof t.version !== "string") return false;
  if (!t.colors || typeof t.colors !== "object") return false;

  const colors = t.colors as Record<string, unknown>;

  // Check required color sections
  if (!colors.canvas || typeof colors.canvas !== "object") return false;
  if (!colors.nodes || typeof colors.nodes !== "object") return false;
  if (!colors.handles || typeof colors.handles !== "object") return false;
  if (!colors.edges || typeof colors.edges !== "object") return false;
  if (!colors.ui || typeof colors.ui !== "object") return false;
  if (!colors.form || typeof colors.form !== "object") return false;
  if (colors.monaco !== "vs" && colors.monaco !== "vs-dark") return false;

  return true;
}

/**
 * Export a theme as a JSON string
 */
export function exportTheme(theme: Theme): string {
  return JSON.stringify(theme, null, 2);
}

/**
 * Import a theme from JSON string
 */
export function importTheme(json: string): Theme | null {
  try {
    const parsed = JSON.parse(json);
    if (validateTheme(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
