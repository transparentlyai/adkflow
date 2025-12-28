import { useState, useRef } from "react";
import type { Node, Edge, ReactFlowInstance } from "@xyflow/react";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import { useDialogState } from "./helpers/useDialogState";
import { useNodePositionState } from "./helpers/useNodePositionState";

// Re-export types from helpers for backward compatibility
export type {
  ContextMenuState,
  DeleteConfirmState,
  GroupDeleteConfirmState,
  TeleportNamePromptState,
} from "./helpers/useDialogState";

export type { NodePositions } from "./helpers/useNodePositionState";

export function useCanvasState() {
  // Core React Flow state
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [customNodeSchemas, setCustomNodeSchemas] = useState<
    CustomNodeSchema[]
  >([]);

  // Track mouse position for paste at cursor
  const [mousePosition, setMousePosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(false);

  // Undo/redo history refs
  const undoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const redoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const maxHistorySize = 50;

  // Track previous content to avoid dirty state on selection changes
  const prevContentRef = useRef<string>("");

  // Track current duplicate error nodes (id -> message) to avoid unnecessary re-renders
  const duplicateErrorNodesRef = useRef<Map<string, string>>(new Map());

  // Dialog states from helper hook
  const dialogState = useDialogState();

  // Node position states from helper hook
  const positionState = useNodePositionState();

  return {
    // Core state
    nodes,
    setNodes,
    edges,
    setEdges,
    rfInstance,
    setRfInstance,
    customNodeSchemas,
    setCustomNodeSchemas,

    // Context menu
    contextMenu: dialogState.contextMenu,
    setContextMenu: dialogState.setContextMenu,

    // Delete confirmation
    deleteConfirm: dialogState.deleteConfirm,
    setDeleteConfirm: dialogState.setDeleteConfirm,
    groupDeleteConfirm: dialogState.groupDeleteConfirm,
    setGroupDeleteConfirm: dialogState.setGroupDeleteConfirm,

    // Mouse and grid
    mousePosition,
    setMousePosition,
    snapToGrid,
    setSnapToGrid,

    // Teleporter dialog
    teleportNamePrompt: dialogState.teleportNamePrompt,
    setTeleportNamePrompt: dialogState.setTeleportNamePrompt,
    teleportNameInput: dialogState.teleportNameInput,
    setTeleportNameInput: dialogState.setTeleportNameInput,

    // History refs
    undoStackRef,
    redoStackRef,
    maxHistorySize,
    prevContentRef,
    duplicateErrorNodesRef,

    // Position state - spread from helper
    ...positionState,
  };
}
