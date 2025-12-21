"use client";

import { useState } from "react";
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
  FileOutput,
  Code,
  Lock,
  Unlock,
  Type,
  ChevronRight,
  Wrench,
  Activity,
  Layout,
  List,
  Copy,
  Scissors,
  Clipboard,
  Trash2,
  GitBranch,
  ArrowRightFromLine,
  ArrowLeftToLine,
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
  | "outputFile"
  | "tool"
  | "agentTool"
  | "process"
  | "label"
  | "teleportOut"
  | "teleportIn";

interface ContextMenuProps {
  x: number;
  y: number;
  onSelect: (nodeType: NodeTypeOption) => void;
  onClose: () => void;
  insideGroup?: boolean;
  isLocked?: boolean;
  onToggleLock?: () => void;
  hasSelection?: boolean;
  hasClipboard?: boolean;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onDelete?: () => void;
}

interface NodeOption {
  type: NodeTypeOption;
  label: string;
  icon: React.ReactNode;
}

interface MenuGroup {
  label: string;
  icon: React.ReactNode;
  items: NodeOption[];
}

const topLevelItems: NodeOption[] = [
  { type: "agent", label: "Agent", icon: <Monitor className="h-4 w-4" /> },
  { type: "prompt", label: "Prompt", icon: <FileText className="h-4 w-4" /> },
  { type: "context", label: "Context", icon: <Database className="h-4 w-4" /> },
];

const menuGroups: MenuGroup[] = [
  {
    label: "Tools",
    icon: <Wrench className="h-4 w-4" />,
    items: [
      { type: "tool", label: "Tool", icon: <Settings className="h-4 w-4" /> },
      { type: "agentTool", label: "Agent Tool", icon: <Terminal className="h-4 w-4" /> },
      { type: "process", label: "Process", icon: <Code className="h-4 w-4" /> },
      { type: "variable", label: "Variable", icon: <Tag className="h-4 w-4" /> },
    ],
  },
  {
    label: "Probes",
    icon: <Activity className="h-4 w-4" />,
    items: [
      { type: "inputProbe", label: "Input Probe", icon: <LogIn className="h-4 w-4" /> },
      { type: "outputProbe", label: "Output Probe", icon: <LogOut className="h-4 w-4" /> },
      { type: "logProbe", label: "Log Probe", icon: <List className="h-4 w-4" /> },
      { type: "outputFile", label: "Output File", icon: <FileOutput className="h-4 w-4" /> },
    ],
  },
  {
    label: "Layout",
    icon: <Layout className="h-4 w-4" />,
    items: [
      { type: "group", label: "Group", icon: <SquareDashed className="h-4 w-4" /> },
      { type: "label", label: "Label", icon: <Type className="h-4 w-4" /> },
    ],
  },
  {
    label: "Connectors",
    icon: <GitBranch className="h-4 w-4" />,
    items: [
      { type: "teleportOut", label: "Output Connector", icon: <ArrowRightFromLine className="h-4 w-4" /> },
      { type: "teleportIn", label: "Input Connector", icon: <ArrowLeftToLine className="h-4 w-4" /> },
    ],
  },
];

export default function CanvasContextMenu({
  x,
  y,
  onSelect,
  onClose,
  insideGroup = false,
  isLocked,
  onToggleLock,
  hasSelection,
  hasClipboard,
  onCopy,
  onCut,
  onPaste,
  onDelete,
}: ContextMenuProps) {
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  const adjustedX = Math.min(x, window.innerWidth - 160);
  const adjustedY = Math.min(y, window.innerHeight - 200);

  const handleItemClick = (type: NodeTypeOption) => {
    onSelect(type);
  };

  const filteredGroups = menuGroups.map((group) => ({
    ...group,
    items: insideGroup ? group.items.filter((item) => item.type !== "group") : group.items,
  }));

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className="fixed z-50 min-w-[10rem] overflow-visible rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
        style={{ left: adjustedX, top: adjustedY }}
      >
        {/* Edit actions - show when there's something to copy/paste/delete */}
        {(hasSelection || hasClipboard) && !isLocked && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Edit
            </div>
            {hasSelection && onCopy && (
              <button
                onClick={() => {
                  onCopy();
                  onClose();
                }}
                className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
              >
                <span className="mr-2 text-muted-foreground">
                  <Copy className="h-4 w-4" />
                </span>
                Copy
                <span className="ml-auto text-xs text-muted-foreground">⌘C</span>
              </button>
            )}
            {hasSelection && onCut && (
              <button
                onClick={() => {
                  onCut();
                  onClose();
                }}
                className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
              >
                <span className="mr-2 text-muted-foreground">
                  <Scissors className="h-4 w-4" />
                </span>
                Cut
                <span className="ml-auto text-xs text-muted-foreground">⌘X</span>
              </button>
            )}
            {hasClipboard && onPaste && (
              <button
                onClick={() => {
                  onPaste();
                  onClose();
                }}
                className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
              >
                <span className="mr-2 text-muted-foreground">
                  <Clipboard className="h-4 w-4" />
                </span>
                Paste
                <span className="ml-auto text-xs text-muted-foreground">⌘V</span>
              </button>
            )}
            {hasSelection && onDelete && (
              <button
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-destructive hover:text-destructive"
              >
                <span className="mr-2">
                  <Trash2 className="h-4 w-4" />
                </span>
                Delete
                <span className="ml-auto text-xs text-muted-foreground">⌫</span>
              </button>
            )}
            <div className="-mx-1 my-1 h-px bg-border" />
          </>
        )}

        {!isLocked && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Add Node
            </div>
            <div className="-mx-1 my-1 h-px bg-border" />

            {/* Top level items */}
            {topLevelItems.map((item) => (
              <button
                key={item.type}
                onClick={() => handleItemClick(item.type)}
                className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
              >
                <span className="mr-2 text-muted-foreground">{item.icon}</span>
                {item.label}
              </button>
            ))}

            <div className="-mx-1 my-1 h-px bg-border" />

            {/* Submenu groups */}
            {filteredGroups.map((group) => (
              <div
                key={group.label}
                className="relative"
                onMouseEnter={() => setOpenSubmenu(group.label)}
                onMouseLeave={() => setOpenSubmenu(null)}
              >
                <button className="relative flex w-full cursor-default select-none items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground">
                  <span className="flex items-center">
                    <span className="mr-2 text-muted-foreground">{group.icon}</span>
                    {group.label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>

                {openSubmenu === group.label && (
                  <>
                    {/* Invisible bridge to prevent mouseLeave when moving to submenu */}
                    <div className="absolute left-full top-0 h-full w-2" />
                    <div
                      className="absolute left-full top-0 z-50 min-w-[9rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                      style={{ marginLeft: 8 }}
                    >
                      {group.items.map((item) => (
                        <button
                          key={item.type}
                          onClick={() => handleItemClick(item.type)}
                          className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                        >
                          <span className="mr-2 text-muted-foreground">{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </>
        )}

        {!isLocked && onToggleLock && <div className="-mx-1 my-1 h-px bg-border" />}
        {onToggleLock && (
          <button
            onClick={() => {
              onToggleLock();
              onClose();
            }}
            className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
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
