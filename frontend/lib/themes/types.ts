/**
 * Theme system types for ADKFlow
 */

export interface StateColors {
  running: { ring: string; glow: string };
  completed: { ring: string; glow: string };
  error: { ring: string; glow: string };
  valid: { ring: string; glow: string };
  invalid: { ring: string; glow: string };
  dirty: { ring: string };
  selected: { ring: string };
  success: string;
  warning: string;
  danger: string;
}

export interface CanvasColors {
  background: string;
  grid: string;
  minimap: {
    background: string;
    mask: string;
    nodeStroke: string;
  };
}

export interface NodeCommonColors {
  container: {
    background: string;
    border: string;
    shadow: string;
  };
  footer: {
    background: string;
    border: string;
    text: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
}

export interface NodeTypeColors {
  header: string;
  headerHover?: string;
  text: string;
  ring: string;
}

export interface AgentBadgeColors {
  background: string;
  text: string;
}

export interface AgentNodeColors extends NodeTypeColors {
  badges: {
    llm: AgentBadgeColors;
    sequential: AgentBadgeColors;
    parallel: AgentBadgeColors;
    loop: AgentBadgeColors;
  };
}

export interface GroupNodeColors {
  header: string;
  headerActive: string;
  text: string;
  border: string;
  borderActive: string;
  dropZone: string;
}

export interface NodeColors {
  common: NodeCommonColors;
  agent: AgentNodeColors;
  prompt: NodeTypeColors;
  context: NodeTypeColors;
  tool: NodeTypeColors;
  agentTool: NodeTypeColors;
  variable: NodeTypeColors;
  process: NodeTypeColors;
  group: GroupNodeColors;
  probe: NodeTypeColors;
  outputFile: NodeTypeColors;
  label: NodeTypeColors;
  userInput: NodeTypeColors;
  start: NodeTypeColors;
  end: NodeTypeColors;
  teleport: {
    colors: string[];
  };
}

export interface HandleColors {
  input: string;
  output: string;
  link: string;
  tool: string;
  context: string;
  agentTool: string;
  process: string;
  probe: string;
  border: string;
}

export interface EdgeColors {
  default: string;
  hover: string;
  link: string;
  selected: string;
  connected: string;
}

export interface UIColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

export interface FormColors {
  background: string;
  text: string;
  border: string;
  placeholder: string;
  focus: {
    border: string;
    ring: string;
  };
  disabled: {
    background: string;
    text: string;
  };
  select: {
    background: string;
    text: string;
    optionBackground: string;
    optionText: string;
  };
  checkbox: {
    background: string;
    border: string;
    checked: string;
    checkmark: string;
  };
  slider: {
    track: string;
    thumb: string;
    active: string;
  };
}

export interface ScrollbarColors {
  track: string;
  thumb: string;
  thumbHover: string;
}

export interface TopologyColors {
  /** Colors for agent nodes in the Mermaid diagram */
  agentNode: {
    fill: string;
    stroke: string;
  };
  /** Colors for subgraph wrappers (SequentialAgent, ParallelAgent, LoopAgent) at different nesting depths */
  subgraph: {
    depth0: { fill: string; stroke: string; text: string };
    depth1: { fill: string; stroke: string; text: string };
    depth2: { fill: string; stroke: string; text: string };
    depth3: { fill: string; stroke: string; text: string };
  };
  /** Colors for UserInput nodes */
  userInput: {
    fill: string;
    stroke: string;
  };
  /** Colors for OutputFile nodes */
  outputFile: {
    fill: string;
    stroke: string;
  };
  /** Colors for Start node */
  start: {
    fill: string;
    stroke: string;
  };
  /** Colors for End node */
  end: {
    fill: string;
    stroke: string;
  };
}

export interface ThemeColors {
  canvas: CanvasColors;
  nodes: NodeColors;
  handles: HandleColors;
  edges: EdgeColors;
  ui: UIColors;
  form: FormColors;
  scrollbar: ScrollbarColors;
  topology: TopologyColors;
  state: StateColors;
  monaco: "vs" | "vs-dark";
}

export interface Theme {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  colors: ThemeColors;
}

export type ThemeId = "light" | "dark" | string;

// Alias for backward compatibility
export type AppTheme = Theme;
