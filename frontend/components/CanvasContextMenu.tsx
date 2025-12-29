"use client";

import { useMemo } from "react";
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
  Lock,
  Unlock,
  Type,
  Wrench,
  Activity,
  Layout,
  List,
  Copy,
  Scissors,
  Clipboard,
  Trash2,
  ArrowRightFromLine,
  ArrowLeftToLine,
  MessageSquare,
  Play,
  Square,
  Puzzle,
} from "lucide-react";
import { formatShortcut } from "@/lib/utils";
import { type CustomNodeSchema } from "@/components/nodes/CustomNode";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  | "teleportIn"
  | "userInput"
  | "start"
  | "end";

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
  customNodeSchemas?: CustomNodeSchema[];
  onSelectCustom?: (schema: CustomNodeSchema) => void;
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
];

const menuGroups: MenuGroup[] = [
  {
    label: "Data",
    icon: <Database className="h-4 w-4" />,
    items: [
      { type: "context", label: "Context", icon: <Database className="h-4 w-4" /> },
      { type: "outputFile", label: "Output File", icon: <FileInput className="h-4 w-4" /> },
      { type: "userInput", label: "User Input", icon: <MessageSquare className="h-4 w-4" /> },
      { type: "variable", label: "Variable", icon: <Tag className="h-4 w-4" /> },
    ],
  },
  {
    label: "Tools",
    icon: <Wrench className="h-4 w-4" />,
    items: [
      { type: "tool", label: "Tool", icon: <Settings className="h-4 w-4" /> },
      { type: "agentTool", label: "Agent Tool", icon: <Terminal className="h-4 w-4" /> },
      { type: "process", label: "Process", icon: <Code className="h-4 w-4" /> },
    ],
  },
  {
    label: "Debug",
    icon: <Activity className="h-4 w-4" />,
    items: [
      { type: "inputProbe", label: "Input Probe", icon: <LogIn className="h-4 w-4" /> },
      { type: "outputProbe", label: "Output Probe", icon: <LogOut className="h-4 w-4" /> },
      { type: "logProbe", label: "Log Probe", icon: <List className="h-4 w-4" /> },
    ],
  },
  {
    label: "Canvas",
    icon: <Layout className="h-4 w-4" />,
    items: [
      { type: "group", label: "Group", icon: <SquareDashed className="h-4 w-4" /> },
      { type: "label", label: "Label", icon: <Type className="h-4 w-4" /> },
      { type: "teleportOut", label: "Output Connector", icon: <ArrowRightFromLine className="h-4 w-4" /> },
      { type: "teleportIn", label: "Input Connector", icon: <ArrowLeftToLine className="h-4 w-4" /> },
      { type: "start", label: "Start", icon: <Play className="h-4 w-4" /> },
      { type: "end", label: "End", icon: <Square className="h-4 w-4" /> },
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
  customNodeSchemas = [],
  onSelectCustom,
}: ContextMenuProps) {
  // Build custom node menu groups from schemas
  const customMenuGroups = useMemo(() => {
    const groups: Record<string, { label: string; items: CustomNodeSchema[] }> = {};

    for (const schema of customNodeSchemas) {
      const parts = schema.menu_location.split("/");
      const groupLabel = parts.slice(0, -1).join("/") || "Extensions";

      if (!groups[groupLabel]) {
        groups[groupLabel] = { label: groupLabel, items: [] };
      }
      groups[groupLabel].items.push(schema);
    }

    return Object.values(groups);
  }, [customNodeSchemas]);

  const handleItemClick = (type: NodeTypeOption) => {
    onSelect(type);
  };

  const filteredGroups = menuGroups.map((group) => ({
    ...group,
    items: insideGroup ? group.items.filter((item) => item.type !== "group") : group.items,
  }));

  return (
    <DropdownMenu open={true} onOpenChange={(open) => !open && onClose()}>
      {/* Invisible trigger positioned at click coordinates */}
      <DropdownMenuTrigger asChild>
        <div
          className="fixed h-0 w-0"
          style={{ left: x, top: y }}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={0}
        alignOffset={0}
        className="min-w-[10rem]"
      >
        {/* Edit actions - show when there's something to copy/paste/delete */}
        {(hasSelection || hasClipboard) && !isLocked && (
          <>
            <DropdownMenuLabel>Edit</DropdownMenuLabel>
            {hasSelection && onCopy && (
              <DropdownMenuItem onClick={onCopy}>
                <Copy className="mr-2 h-4 w-4 text-muted-foreground" />
                Copy
                <DropdownMenuShortcut>{formatShortcut("C")}</DropdownMenuShortcut>
              </DropdownMenuItem>
            )}
            {hasSelection && onCut && (
              <DropdownMenuItem onClick={onCut}>
                <Scissors className="mr-2 h-4 w-4 text-muted-foreground" />
                Cut
                <DropdownMenuShortcut>{formatShortcut("X")}</DropdownMenuShortcut>
              </DropdownMenuItem>
            )}
            {hasClipboard && onPaste && (
              <DropdownMenuItem onClick={onPaste}>
                <Clipboard className="mr-2 h-4 w-4 text-muted-foreground" />
                Paste
                <DropdownMenuShortcut>{formatShortcut("V")}</DropdownMenuShortcut>
              </DropdownMenuItem>
            )}
            {hasSelection && onDelete && (
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
                <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
          </>
        )}

        {!isLocked && (
          <>
            <DropdownMenuLabel>Add Node</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Top level items */}
            {topLevelItems.map((item) => (
              <DropdownMenuItem key={item.type} onClick={() => handleItemClick(item.type)}>
                <span className="mr-2 text-muted-foreground">{item.icon}</span>
                {item.label}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            {/* Submenu groups */}
            {filteredGroups.map((group) => (
              <DropdownMenuSub key={group.label}>
                <DropdownMenuSubTrigger>
                  <span className="mr-2 text-muted-foreground">{group.icon}</span>
                  {group.label}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {group.items.map((item) => (
                    <DropdownMenuItem key={item.type} onClick={() => handleItemClick(item.type)}>
                      <span className="mr-2 text-muted-foreground">{item.icon}</span>
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}

            {/* Extensions - single root submenu for all custom nodes */}
            {customMenuGroups.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Puzzle className="mr-2 h-4 w-4 text-muted-foreground" />
                  Extensions
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {customMenuGroups.map((group) => (
                    <DropdownMenuSub key={group.label}>
                      <DropdownMenuSubTrigger>
                        <Puzzle className="mr-2 h-4 w-4 text-muted-foreground" />
                        {group.label}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {group.items.map((schema) => (
                          <DropdownMenuItem
                            key={schema.unit_id}
                            onClick={() => onSelectCustom?.(schema)}
                          >
                            <Puzzle className="mr-2 h-4 w-4 text-muted-foreground" />
                            {schema.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
          </>
        )}

        {!isLocked && onToggleLock && <DropdownMenuSeparator />}
        {onToggleLock && (
          <DropdownMenuItem onClick={onToggleLock}>
            {isLocked ? (
              <Unlock className="mr-2 h-4 w-4 text-muted-foreground" />
            ) : (
              <Lock className="mr-2 h-4 w-4 text-muted-foreground" />
            )}
            {isLocked ? "Unlock Canvas" : "Lock Canvas"}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
