/**
 * Theme system types for ADKFlow
 */

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
  link: string;
  selected: string;
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

export interface ThemeColors {
  canvas: CanvasColors;
  nodes: NodeColors;
  handles: HandleColors;
  edges: EdgeColors;
  ui: UIColors;
  form: FormColors;
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
