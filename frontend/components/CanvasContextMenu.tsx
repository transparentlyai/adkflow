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
  Code,
  Lock,
  Unlock,
} from "lucide-react";

export type NodeTypeOption =
  | "variable"
  | "group"
  | "agent"
  | "prompt"
  | "context"
  | "inputProbe"
  | "outputProbe"
  | "logProbe"
  | "tool"
  | "agentTool"
  | "process";

interface ContextMenuProps {
  x: number;
  y: number;
  onSelect: (nodeType: NodeTypeOption) => void;
  onClose: () => void;
  insideGroup?: boolean;
  isLocked?: boolean;
  onToggleLock?: () => void;
}

const nodeOptions: { type: NodeTypeOption; label: string; icon: React.ReactNode }[] = [
  {
    type: "agent",
    label: "Agent",
    icon: <Monitor className="h-4 w-4" />,
  },
  {
    type: "group",
    label: "Group",
    icon: <SquareDashed className="h-4 w-4" />,
  },
  {
    type: "prompt",
    label: "Prompt",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    type: "context",
    label: "Context",
    icon: <Database className="h-4 w-4" />,
  },
  {
    type: "variable",
    label: "Variable",
    icon: <Tag className="h-4 w-4" />,
  },
  {
    type: "tool",
    label: "Tool",
    icon: <Settings className="h-4 w-4" />,
  },
  {
    type: "agentTool",
    label: "Agent Tool",
    icon: <Terminal className="h-4 w-4" />,
  },
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
    icon: <Terminal className="h-4 w-4" />,
  },
  {
    type: "process",
    label: "Process",
    icon: <Code className="h-4 w-4" />,
  },
];

export default function CanvasContextMenu({ x, y, onSelect, onClose, insideGroup = false, isLocked, onToggleLock }: ContextMenuProps) {
  const filteredOptions = insideGroup ? nodeOptions.filter(opt => opt.type !== 'group') : nodeOptions;

  // Adjust position to keep menu in viewport
  const adjustedX = Math.min(x, window.innerWidth - 160);
  const adjustedY = Math.min(y, window.innerHeight - 320);

  return (
    <>
      {/* Backdrop to capture clicks outside */}
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      {/* Menu */}
      <div
        className="fixed z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
        style={{ left: adjustedX, top: adjustedY }}
      >
        {!isLocked && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Add Node
            </div>
            <div className="-mx-1 my-1 h-px bg-border" />
          </>
        )}
        {!isLocked && filteredOptions.map((option) => (
          <button
            key={option.type}
            onClick={() => onSelect(option.type)}
            className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
          >
            <span className="mr-2 text-muted-foreground">{option.icon}</span>
            {option.label}
          </button>
        ))}
        {!isLocked && onToggleLock && <div className="-mx-1 my-1 h-px bg-border" />}
        {onToggleLock && (
          <button
            onClick={() => {
              onToggleLock();
              onClose();
            }}
            className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
          >
            <span className="mr-2 text-muted-foreground">
              {isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            </span>
            {isLocked ? "Unlock Canvas" : "Lock Canvas"}
          </button>
        )}
      </div>
    </>
  );
}
