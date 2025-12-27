import { useCallback } from "react";
import type { Node } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import type { NodeTypeOption } from "@/components/CanvasContextMenu";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import type {
  ContextMenuState,
  TeleportNamePromptState,
} from "./useCanvasState";

interface UseContextMenuParams {
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  contextMenu: ContextMenuState | null;
  setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState | null>>;
  teleportNamePrompt: TeleportNamePromptState | null;
  setTeleportNamePrompt: React.Dispatch<
    React.SetStateAction<TeleportNamePromptState | null>
  >;
  teleportNameInput: string;
  setTeleportNameInput: React.Dispatch<React.SetStateAction<string>>;
  setMousePosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number } | null>
  >;
  isLocked?: boolean;
  // Node creation functions
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
  // Creation request callbacks
  onRequestPromptCreation?: (position: { x: number; y: number }) => void;
  onRequestContextCreation?: (position: { x: number; y: number }) => void;
  onRequestToolCreation?: (position: { x: number; y: number }) => void;
  onRequestProcessCreation?: (position: { x: number; y: number }) => void;
  onRequestOutputFileCreation?: (position: { x: number; y: number }) => void;
}

export function useContextMenu({
  setNodes,
  contextMenu,
  setContextMenu,
  teleportNamePrompt,
  setTeleportNamePrompt,
  teleportNameInput,
  setTeleportNameInput,
  setMousePosition,
  isLocked,
  addGroupNode,
  addLabelNode,
  addBuiltinSchemaNode,
  addCustomNode,
  onRequestPromptCreation,
  onRequestContextCreation,
  onRequestToolCreation,
  onRequestProcessCreation,
  onRequestOutputFileCreation,
}: UseContextMenuParams) {
  const { screenToFlowPosition } = useReactFlow();

  // Handle right-click on canvas pane
  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setContextMenu({ x: event.clientX, y: event.clientY, flowPosition });
    },
    [screenToFlowPosition, setContextMenu],
  );

  // Handle right-click on a node (specifically for groups)
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (isLocked) return;
      if (node.type !== "group") return;

      event.preventDefault();
      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      // Store position relative to the group
      const relativePosition = {
        x: flowPosition.x - node.position.x,
        y: flowPosition.y - node.position.y,
      };
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        flowPosition: relativePosition,
        parentGroupId: node.id,
      });
    },
    [screenToFlowPosition, isLocked, setContextMenu],
  );

  // Handle right-click on selection box
  const onSelectionContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setContextMenu({ x: event.clientX, y: event.clientY, flowPosition });
    },
    [screenToFlowPosition, setContextMenu],
  );

  // Track mouse position for paste at cursor
  const onMouseMove = useCallback(
    (event: React.MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    },
    [setMousePosition],
  );

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
  // Uses schema-driven approach for most nodes, legacy for layout/special nodes
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

        // Teleport nodes require name prompt dialog, but use schema for node data
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

        // File-based nodes require name/file dialog before creation
        case "prompt":
          if (onRequestPromptCreation) {
            onRequestPromptCreation(position);
          } else {
            addBuiltinSchemaNode(nodeType, position, undefined, parentGroupId);
          }
          break;
        case "context":
          if (onRequestContextCreation) {
            onRequestContextCreation(position);
          } else {
            addBuiltinSchemaNode(nodeType, position, undefined, parentGroupId);
          }
          break;
        case "tool":
          if (onRequestToolCreation) {
            onRequestToolCreation(position);
          } else {
            addBuiltinSchemaNode(nodeType, position, undefined, parentGroupId);
          }
          break;
        case "process":
          if (onRequestProcessCreation) {
            onRequestProcessCreation(position);
          } else {
            addBuiltinSchemaNode(nodeType, position, undefined, parentGroupId);
          }
          break;
        case "outputFile":
          if (onRequestOutputFileCreation) {
            onRequestOutputFileCreation(position);
          } else {
            addBuiltinSchemaNode(nodeType, position, undefined, parentGroupId);
          }
          break;

        // All other built-in nodes use schema-driven creation
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

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, [setContextMenu]);

  // Handle teleporter name submission
  const handleTeleportNameSubmit = useCallback(() => {
    if (!teleportNamePrompt || !teleportNameInput.trim()) return;

    const { type, position, parentGroupId } = teleportNamePrompt;
    const name = teleportNameInput.trim();

    // Use schema-based creation with name config override
    const nodeType = type === "teleportOut" ? "teleportOut" : "teleportIn";
    addBuiltinSchemaNode(nodeType, position, { name }, parentGroupId);

    setTeleportNamePrompt(null);
    setTeleportNameInput("");
  }, [
    teleportNamePrompt,
    teleportNameInput,
    addBuiltinSchemaNode,
    setTeleportNamePrompt,
    setTeleportNameInput,
  ]);

  const handleTeleportNameCancel = useCallback(() => {
    setTeleportNamePrompt(null);
    setTeleportNameInput("");
  }, [setTeleportNamePrompt, setTeleportNameInput]);

  const handleTeleportNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleTeleportNameSubmit();
      } else if (e.key === "Escape") {
        handleTeleportNameCancel();
      }
    },
    [handleTeleportNameSubmit, handleTeleportNameCancel],
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
    onPaneContextMenu,
    onNodeContextMenu,
    onSelectionContextMenu,
    onMouseMove,
    addNodeWithParent,
    onContextMenuSelect,
    closeContextMenu,
    handleTeleportNameSubmit,
    handleTeleportNameCancel,
    handleTeleportNameKeyDown,
    handleSelectCustomNode,
  };
}
