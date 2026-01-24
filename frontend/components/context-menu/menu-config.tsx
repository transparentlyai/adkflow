"use client";

import {
  Monitor,
  SquareDashed,
  FileText,
  Database,
  Tag,
  Settings,
  Terminal,
  LogIn,
  LogOut,
  FileInput,
  Code,
  Type,
  Wrench,
  Activity,
  Layout,
  List,
  ArrowRightFromLine,
  ArrowLeftToLine,
  MessageSquare,
  Play,
  Square,
  Zap,
  Eye,
  Layers,
} from "lucide-react";

export type NodeTypeOption =
  | "variable"
  | "group"
  | "agent"
  | "prompt"
  | "context"
  | "context_aggregator"
  | "inputProbe"
  | "outputProbe"
  | "logProbe"
  | "monitor"
  | "outputFile"
  | "tool"
  | "agentTool"
  | "shellTool"
  | "process"
  | "schema"
  | "label"
  | "teleportOut"
  | "teleportIn"
  | "userInput"
  | "start"
  | "end"
  | "callback";

export interface NodeOption {
  type: NodeTypeOption;
  label: string;
  icon: React.ReactNode;
}

export interface MenuGroup {
  label: string;
  icon: React.ReactNode;
  items: NodeOption[];
}

export const topLevelItems: NodeOption[] = [
  { type: "agent", label: "Agent", icon: <Monitor className="h-4 w-4" /> },
  { type: "prompt", label: "Prompt", icon: <FileText className="h-4 w-4" /> },
];

export const menuGroups: MenuGroup[] = [
  {
    label: "Data",
    icon: <Database className="h-4 w-4" />,
    items: [
      {
        type: "context",
        label: "Context",
        icon: <Database className="h-4 w-4" />,
      },
      {
        type: "context_aggregator",
        label: "Context Aggregator",
        icon: <Layers className="h-4 w-4" />,
      },
      {
        type: "outputFile",
        label: "Output File",
        icon: <FileInput className="h-4 w-4" />,
      },
      {
        type: "userInput",
        label: "User Input",
        icon: <MessageSquare className="h-4 w-4" />,
      },
      {
        type: "variable",
        label: "Variable",
        icon: <Tag className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Tools",
    icon: <Wrench className="h-4 w-4" />,
    items: [
      { type: "tool", label: "Tool", icon: <Settings className="h-4 w-4" /> },
      {
        type: "agentTool",
        label: "Agent Tool",
        icon: <Terminal className="h-4 w-4" />,
      },
      {
        type: "shellTool",
        label: "Shell Tool",
        icon: <Terminal className="h-4 w-4" />,
      },
      { type: "process", label: "Process", icon: <Code className="h-4 w-4" /> },
      {
        type: "callback",
        label: "Callback",
        icon: <Zap className="h-4 w-4" />,
      },
      { type: "schema", label: "Schema", icon: <Code className="h-4 w-4" /> },
    ],
  },
  {
    label: "Debug",
    icon: <Activity className="h-4 w-4" />,
    items: [
      {
        type: "inputProbe",
        label: "Input Probe",
        icon: <LogIn className="h-4 w-4" />,
      },
      {
        type: "outputProbe",
        label: "Output Probe",
        icon: <LogOut className="h-4 w-4" />,
      },
      {
        type: "logProbe",
        label: "Log Probe",
        icon: <List className="h-4 w-4" />,
      },
      {
        type: "monitor",
        label: "Monitor",
        icon: <Eye className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Canvas",
    icon: <Layout className="h-4 w-4" />,
    items: [
      {
        type: "group",
        label: "Group",
        icon: <SquareDashed className="h-4 w-4" />,
      },
      { type: "label", label: "Label", icon: <Type className="h-4 w-4" /> },
      {
        type: "teleportOut",
        label: "Output Connector",
        icon: <ArrowRightFromLine className="h-4 w-4" />,
      },
      {
        type: "teleportIn",
        label: "Input Connector",
        icon: <ArrowLeftToLine className="h-4 w-4" />,
      },
      { type: "start", label: "Start", icon: <Play className="h-4 w-4" /> },
      { type: "end", label: "End", icon: <Square className="h-4 w-4" /> },
    ],
  },
];

// Type for nested menu tree used for extension menu items
export type MenuNode = {
  label: string;
  items: import("@/components/nodes/CustomNode").CustomNodeSchema[];
  children: Record<string, MenuNode>;
};
