import { useCallback } from "react";
import type { Node } from "@xyflow/react";
import type { NodeTypeOption } from "@/components/CanvasContextMenu";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import type {
  ContextMenuState,
  TeleportNamePromptState,
} from "./useDialogState";

interface UseContextMenuSelectParams {
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  contextMenu: ContextMenuState | null;
  setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState | null>>;
  setTeleportNamePrompt: React.Dispatch<
    React.SetStateAction<TeleportNamePromptState | null>
  >;
  setTeleportNameInput: React.Dispatch<React.SetStateAction<string>>;
  addGroupNode: (position?: { x: number; y: number }) => void;
  addLabelNode: (position?: { x: number; y: number }) => void;
  addBuiltinSchemaNode: (
    nodeType: string,
    position?: { x: number; y: number },
    configOverrides?: Record<string, unknown>,
    parentGroupId?: string,
  ) => string | null;
  addCustomNode: (
    schema: CustomNodeSchema,
    position?: { x: number; y: number },
  ) => string;
  closeContextMenu: () => void;
  onRequestPromptCreation?: (position: { x: number; y: number }) => void;
  onRequestContextCreation?: (position: { x: number; y: number }) => void;
  onRequestToolCreation?: (position: { x: number; y: number }) => void;
  onRequestProcessCreation?: (position: { x: number; y: number }) => void;
  onRequestOutputFileCreation?: (position: { x: number; y: number }) => void;
}

export function useContextMenuSelect({
  setNodes,
  contextMenu,
  setContextMenu,
  setTeleportNamePrompt,
  setTeleportNameInput,
  addGroupNode,
  addLabelNode,
  addBuiltinSchemaNode,
  addCustomNode,
  closeContextMenu,
  onRequestPromptCreation,
  onRequestContextCreation,
  onRequestToolCreation,
  onRequestProcessCreation,
  onRequestOutputFileCreation,
}: UseContextMenuSelectParams) {
  // Helper to add node with optional parent
  const addNodeWithParent = useCallback(
    (
      addFn: (position?: { x: number; y: number }) => void,
      position: { x: number; y: number },
      parentGroupId?: string,
    ) => {
      addFn(position);
      if (parentGroupId) {
        // After adding, set the parent for the most recently added node
        setNodes((nds) => {
          const lastNode = nds[nds.length - 1];
          if (lastNode && lastNode.type !== "group") {
            const updatedNode = {
              ...lastNode,
              parentId: parentGroupId,
              extent: "parent" as const,
            };
            // Reorder: parents must come before children
            const otherNodes = nds.slice(0, -1);
            const parentIndex = otherNodes.findIndex(
              (n) => n.id === parentGroupId,
            );
            if (parentIndex !== -1) {
              return [
                ...otherNodes.slice(0, parentIndex + 1),
                updatedNode,
                ...otherNodes.slice(parentIndex + 1),
              ];
            }
            return [...otherNodes, updatedNode];
          }
          return nds;
        });
      }
    },
    [setNodes],
  );

  // Handle context menu node selection
  const onContextMenuSelect = useCallback(
    (nodeType: NodeTypeOption) => {
      if (!contextMenu) return;

      const position = contextMenu.flowPosition;
      const parentGroupId = contextMenu.parentGroupId;

      // Don't allow adding groups inside groups
      if (nodeType === "group" && parentGroupId) {
        setContextMenu(null);
        return;
      }

      // Node creation - all built-in nodes use schema-driven approach
      // except layout nodes (group, label) which have fundamentally different rendering
      switch (nodeType) {
        // Layout nodes (not schema-driven)
        case "group":
          addGroupNode(position);
          break;
        case "label":
          addNodeWithParent(addLabelNode, position, parentGroupId);
          break;

        // Teleport nodes require name prompt dialog
        case "teleportOut":
          setTeleportNamePrompt({
            type: "teleportOut",
            position,
            parentGroupId,
          });
          setTeleportNameInput("");
          break;
        case "teleportIn":
          setTeleportNamePrompt({
            type: "teleportIn",
            position,
            parentGroupId,
          });
          setTeleportNameInput("");
          break;

        // File-based nodes may require dialog
        case "prompt":
          onRequestPromptCreation
            ? onRequestPromptCreation(position)
            : addBuiltinSchemaNode(
                nodeType,
                position,
                undefined,
                parentGroupId,
              );
          break;
        case "context":
          onRequestContextCreation
            ? onRequestContextCreation(position)
            : addBuiltinSchemaNode(
                nodeType,
                position,
                undefined,
                parentGroupId,
              );
          break;
        case "tool":
          onRequestToolCreation
            ? onRequestToolCreation(position)
            : addBuiltinSchemaNode(
                nodeType,
                position,
                undefined,
                parentGroupId,
              );
          break;
        case "process":
          onRequestProcessCreation
            ? onRequestProcessCreation(position)
            : addBuiltinSchemaNode(
                nodeType,
                position,
                undefined,
                parentGroupId,
              );
          break;
        case "outputFile":
          onRequestOutputFileCreation
            ? onRequestOutputFileCreation(position)
            : addBuiltinSchemaNode(
                nodeType,
                position,
                undefined,
                parentGroupId,
              );
          break;

        // All other built-in nodes
        default:
          addBuiltinSchemaNode(nodeType, position, undefined, parentGroupId);
          break;
      }

      setContextMenu(null);
    },
    [
      contextMenu,
      addNodeWithParent,
      addGroupNode,
      addLabelNode,
      addBuiltinSchemaNode,
      setContextMenu,
      setTeleportNamePrompt,
      setTeleportNameInput,
      onRequestPromptCreation,
      onRequestContextCreation,
      onRequestToolCreation,
      onRequestProcessCreation,
      onRequestOutputFileCreation,
    ],
  );

  // Handle selecting a custom node from context menu
  const handleSelectCustomNode = useCallback(
    (schema: CustomNodeSchema) => {
      if (!contextMenu) return;
      addCustomNode(schema, contextMenu.flowPosition);
      closeContextMenu();
    },
    [contextMenu, addCustomNode, closeContextMenu],
  );

  return {
    addNodeWithParent,
    onContextMenuSelect,
    handleSelectCustomNode,
  };
}
