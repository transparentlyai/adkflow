"use client";

import { useMemo } from "react";
import {
  Copy,
  Scissors,
  Clipboard,
  Trash2,
  Lock,
  Unlock,
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
import {
  type NodeTypeOption,
  type MenuNode,
  topLevelItems,
  menuGroups,
} from "@/components/context-menu/menu-config";

// Re-export NodeTypeOption for consumers
export type { NodeTypeOption } from "@/components/context-menu/menu-config";

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

// Recursive component to render extension menu items
function ExtensionMenuItems({
  node,
  onSelectCustom,
  isRoot = false,
}: {
  node: MenuNode;
  onSelectCustom?: (schema: CustomNodeSchema) => void;
  isRoot?: boolean;
}) {
  const childKeys = Object.keys(node.children);

  return (
    <>
      {/* Render child submenus */}
      {childKeys.map((key) => {
        const child = node.children[key];
        const hasChildren = Object.keys(child.children).length > 0;
        const hasItems = child.items.length > 0;

        if (!hasChildren && !hasItems) return null;

        return (
          <DropdownMenuSub key={key}>
            <DropdownMenuSubTrigger>
              <Puzzle className="mr-2 h-4 w-4 text-muted-foreground" />
              {child.label}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <ExtensionMenuItems
                node={child}
                onSelectCustom={onSelectCustom}
              />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        );
      })}

      {/* Render items at this level */}
      {node.items.map((schema) => (
        <DropdownMenuItem
          key={schema.unit_id}
          onClick={() => onSelectCustom?.(schema)}
        >
          <Puzzle className="mr-2 h-4 w-4 text-muted-foreground" />
          {schema.label}
        </DropdownMenuItem>
      ))}
    </>
  );
}

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
  // Build nested menu tree from schemas
  const customMenuTree = useMemo(() => {
    const root: MenuNode = { label: "Extensions", items: [], children: {} };

    for (const schema of customNodeSchemas) {
      const parts = (schema.menu_location || "Other").split("/");
      let current = root;

      // Navigate/create the tree path
      for (const part of parts) {
        if (!current.children[part]) {
          current.children[part] = { label: part, items: [], children: {} };
        }
        current = current.children[part];
      }

      // Add schema to the leaf node
      current.items.push(schema);
    }

    return root;
  }, [customNodeSchemas]);

  // Check if tree has any content
  const hasCustomNodes =
    Object.keys(customMenuTree.children).length > 0 ||
    customMenuTree.items.length > 0;

  const handleItemClick = (type: NodeTypeOption) => {
    onSelect(type);
  };

  const filteredGroups = menuGroups.map((group) => ({
    ...group,
    items: insideGroup
      ? group.items.filter((item) => item.type !== "group")
      : group.items,
  }));

  return (
    <DropdownMenu open={true} onOpenChange={(open) => !open && onClose()}>
      {/* Invisible trigger positioned at click coordinates */}
      <DropdownMenuTrigger asChild>
        <div className="fixed h-0 w-0" style={{ left: x, top: y }} />
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
                <DropdownMenuShortcut>
                  {formatShortcut("C")}
                </DropdownMenuShortcut>
              </DropdownMenuItem>
            )}
            {hasSelection && onCut && (
              <DropdownMenuItem onClick={onCut}>
                <Scissors className="mr-2 h-4 w-4 text-muted-foreground" />
                Cut
                <DropdownMenuShortcut>
                  {formatShortcut("X")}
                </DropdownMenuShortcut>
              </DropdownMenuItem>
            )}
            {hasClipboard && onPaste && (
              <DropdownMenuItem onClick={onPaste}>
                <Clipboard className="mr-2 h-4 w-4 text-muted-foreground" />
                Paste
                <DropdownMenuShortcut>
                  {formatShortcut("V")}
                </DropdownMenuShortcut>
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
              <DropdownMenuItem
                key={item.type}
                onClick={() => handleItemClick(item.type)}
              >
                <span className="mr-2 text-muted-foreground">{item.icon}</span>
                {item.label}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            {/* Submenu groups */}
            {filteredGroups.map((group) => (
              <DropdownMenuSub key={group.label}>
                <DropdownMenuSubTrigger>
                  <span className="mr-2 text-muted-foreground">
                    {group.icon}
                  </span>
                  {group.label}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {group.items.map((item) => (
                    <DropdownMenuItem
                      key={item.type}
                      onClick={() => handleItemClick(item.type)}
                    >
                      <span className="mr-2 text-muted-foreground">
                        {item.icon}
                      </span>
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}

            {/* Extensions - nested submenu tree for all custom nodes */}
            {hasCustomNodes && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Puzzle className="mr-2 h-4 w-4 text-muted-foreground" />
                  Extensions
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <ExtensionMenuItems
                    node={customMenuTree}
                    onSelectCustom={onSelectCustom}
                    isRoot
                  />
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
