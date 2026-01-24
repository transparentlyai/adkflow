import type { Node, Edge } from "@xyflow/react";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import { useCanvasState } from "./useCanvasState";
import { useCanvasConfig } from "./useCanvasConfig";
import { useConnectionHandlers } from "./useConnectionHandlers";
import { useCanvasHistory } from "./useCanvasHistory";
import { useDeleteHandlers } from "./useDeleteHandlers";
import { useClipboardOperations } from "./useClipboardOperations";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useNodeCreation } from "./useNodeCreation";
import { useContextMenu } from "./useContextMenu";
import { useCanvasOperations } from "./useCanvasOperations";
import { useExecutionState } from "./useExecutionState";
import { useValidation } from "./useValidation";
import { useEdgeHighlight } from "./useEdgeHighlight";
import { useEdgeTabOpacity } from "./useEdgeTabOpacity";
import { useAltClickZoom } from "./useAltClickZoom";
import { useCustomNodeSchemasLoader } from "./useCustomNodeSchemasLoader";

interface UseCanvasSetupParams {
  onWorkflowChange?: (data: { nodes: Node[]; edges: Edge[] }) => void;
  onRequestPromptCreation?: (position: { x: number; y: number }) => void;
  onRequestContextCreation?: (position: { x: number; y: number }) => void;
  onRequestToolCreation?: (position: { x: number; y: number }) => void;
  onRequestProcessCreation?: (position: { x: number; y: number }) => void;
  onRequestOutputFileCreation?: (position: { x: number; y: number }) => void;
  isLocked?: boolean;
  activeTabId?: string;
  onSave?: () => void;
  defaultModel?: string;
}

/**
 * Master hook that sets up all canvas functionality.
 * Consolidates all individual canvas hooks into a single cohesive setup.
 */
export function useCanvasSetup({
  onWorkflowChange,
  onRequestPromptCreation,
  onRequestContextCreation,
  onRequestToolCreation,
  onRequestProcessCreation,
  onRequestOutputFileCreation,
  isLocked,
  activeTabId,
  onSave,
  defaultModel,
}: UseCanvasSetupParams) {
  // Core canvas state
  const state = useCanvasState();
  const {
    nodes,
    setNodes,
    edges,
    setEdges,
    rfInstance,
    setRfInstance,
    customNodeSchemas,
    setCustomNodeSchemas,
    contextMenu,
    setContextMenu,
    deleteConfirm,
    setDeleteConfirm,
    groupDeleteConfirm,
    setGroupDeleteConfirm,
    mousePosition,
    setMousePosition,
    snapToGrid,
    setSnapToGrid,
    teleportNamePrompt,
    setTeleportNamePrompt,
    teleportNameInput,
    setTeleportNameInput,
    undoStackRef,
    redoStackRef,
    maxHistorySize,
    prevContentRef,
    duplicateErrorNodesRef,
    resetPositions,
    groupPosition,
    setGroupPosition,
    labelPosition,
    setLabelPosition,
  } = state;

  // Load custom node schemas from backend
  useCustomNodeSchemasLoader(setCustomNodeSchemas);

  // Canvas configuration
  const config = useCanvasConfig(nodes, customNodeSchemas);
  const { theme, handleTypeRegistry } = config;

  // History management
  const history = useCanvasHistory({
    nodes,
    edges,
    setNodes,
    setEdges,
    undoStackRef,
    redoStackRef,
    maxHistorySize,
    prevContentRef,
    onWorkflowChange,
  });

  // Connection handlers
  const connectionHandlers = useConnectionHandlers({
    nodes,
    edges,
    setNodes,
    setEdges,
    handleTypeRegistry,
    isLocked,
    linkEdgeColor: theme.colors.edges.link,
    callbackEdgeColor: theme.colors.edges.callback,
  });

  // Edge effects
  useEdgeHighlight(nodes, setEdges, {
    default: theme.colors.edges.default,
    connected: theme.colors.edges.connected,
  });
  useEdgeTabOpacity(nodes, edges, setEdges);

  // Delete handlers
  const deleteHandlers = useDeleteHandlers({
    nodes,
    edges,
    setNodes,
    setEdges,
    deleteConfirm,
    setDeleteConfirm,
    groupDeleteConfirm,
    setGroupDeleteConfirm,
    saveSnapshot: history.saveSnapshot,
    isLocked,
  });

  // Clipboard operations
  const clipboard = useClipboardOperations({
    nodes,
    edges,
    setNodes,
    setEdges,
    activeTabId,
    isLocked,
    mousePosition,
    saveSnapshot: history.saveSnapshot,
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    isLocked,
    handleCopy: clipboard.handleCopy,
    handleCut: clipboard.handleCut,
    handlePaste: clipboard.handlePaste,
    handleDelete: deleteHandlers.handleDelete,
    handleUndo: history.handleUndo,
    handleRedo: history.handleRedo,
    onSave,
  });

  // Node creation
  const nodeCreation = useNodeCreation({
    nodes,
    setNodes,
    rfInstance,
    activeTabId: activeTabId ?? null,
    groupPosition,
    setGroupPosition,
    labelPosition,
    setLabelPosition,
  });

  // Context menu
  const contextMenuHandlers = useContextMenu({
    setNodes,
    contextMenu,
    setContextMenu,
    teleportNamePrompt,
    setTeleportNamePrompt,
    teleportNameInput,
    setTeleportNameInput,
    setMousePosition,
    isLocked,
    addGroupNode: nodeCreation.addGroupNode,
    addLabelNode: nodeCreation.addLabelNode,
    addBuiltinSchemaNode: nodeCreation.addBuiltinSchemaNode,
    addCustomNode: nodeCreation.addCustomNode,
    onRequestPromptCreation,
    onRequestContextCreation,
    onRequestToolCreation,
    onRequestProcessCreation,
    onRequestOutputFileCreation,
    defaultModel,
  });

  // Canvas operations
  const canvasOperations = useCanvasOperations({
    nodes,
    setNodes,
    setEdges,
    rfInstance,
    resetPositions,
    customNodeSchemas,
  });

  // Execution state
  const executionState = useExecutionState({ setNodes });

  // Validation
  const validation = useValidation({
    nodes,
    setNodes,
    duplicateErrorNodesRef,
  });

  // Alt+Click zoom shortcut
  const altClickZoom = useAltClickZoom();

  return {
    // State
    nodes,
    edges,
    setRfInstance,
    customNodeSchemas,
    contextMenu,
    deleteConfirm,
    groupDeleteConfirm,
    snapToGrid,
    setSnapToGrid,
    teleportNamePrompt,
    teleportNameInput,
    setTeleportNameInput,

    // Config
    config,

    // Handlers
    connectionHandlers,
    deleteHandlers,
    clipboard,
    contextMenuHandlers,
    altClickZoom,

    // Operations
    nodeCreation,
    canvasOperations,
    executionState,
    validation,
  };
}
