"use client";

import { useImperativeHandle, forwardRef, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  ControlButton,
  MiniMap,
  SelectionMode,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { CanvasActionsProvider } from "@/contexts/CanvasActionsContext";
import { ConnectionProvider } from "@/contexts/ConnectionContext";
import { Lock, LockOpen, Grid3X3 } from "lucide-react";

import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import { builtinNodeSchemas } from "@/lib/builtinNodeHelpers";
import { getExtensionNodes } from "@/lib/api";
import CanvasContextMenu from "./CanvasContextMenu";
import ConfirmDialog from "./ConfirmDialog";
import GroupDeleteDialog from "./GroupDeleteDialog";
import TeleportNameDialog from "./TeleportNameDialog";
import type { NodeExecutionState } from "@/lib/types";

import {
  useCanvasState,
  useCanvasConfig,
  useConnectionHandlers,
  useCanvasHistory,
  useDeleteHandlers,
  useClipboardOperations,
  useKeyboardShortcuts,
  useNodeCreation,
  useContextMenu,
  useCanvasOperations,
  useExecutionState,
  useValidation,
  useEdgeHighlight,
  getMiniMapNodeColor,
  getCanvasStyles,
} from "./hooks/canvas";

interface ReactFlowCanvasProps {
  onWorkflowChange?: (data: { nodes: Node[]; edges: Edge[] }) => void;
  onRequestPromptCreation?: (position: { x: number; y: number }) => void;
  onRequestContextCreation?: (position: { x: number; y: number }) => void;
  onRequestToolCreation?: (position: { x: number; y: number }) => void;
  onRequestProcessCreation?: (position: { x: number; y: number }) => void;
  onRequestOutputFileCreation?: (position: { x: number; y: number }) => void;
  isLocked?: boolean;
  onToggleLock?: () => void;
  activeTabId?: string;
  onSave?: () => void;
}

export interface ReactFlowCanvasRef {
  // Layout nodes (non-schema-driven)
  addGroupNode: (position?: { x: number; y: number }) => void;
  addLabelNode: (position?: { x: number; y: number }) => void;
  // Schema-driven node creation
  addCustomNode: (
    schema: CustomNodeSchema,
    position?: { x: number; y: number },
  ) => string;
  addBuiltinSchemaNode: (
    nodeType: string,
    position?: { x: number; y: number },
    configOverrides?: Record<string, unknown>,
    parentGroupId?: string,
  ) => string | null;
  customNodeSchemas: CustomNodeSchema[];
  builtinNodeSchemas: readonly CustomNodeSchema[];
  clearCanvas: () => void;
  saveFlow: () => {
    nodes: Node[];
    edges: Edge[];
    viewport: { x: number; y: number; zoom: number };
  } | null;
  restoreFlow: (flow: {
    nodes: Node[];
    edges: Edge[];
    viewport: { x: number; y: number; zoom: number };
  }) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: () => void;
  focusNode: (nodeId: string) => void;
  updateNodeExecutionState: (
    agentName: string,
    state: NodeExecutionState,
  ) => void;
  updateToolExecutionState: (
    toolName: string,
    state: NodeExecutionState,
  ) => void;
  updateUserInputWaitingState: (nodeId: string, isWaiting: boolean) => void;
  clearExecutionState: () => void;
  highlightErrorNodes: (nodeErrors: Record<string, string[]>) => void;
  highlightWarningNodes: (nodeWarnings: Record<string, string[]>) => void;
  clearErrorHighlights: () => void;
}

/**
 * ReactFlowCanvas Component (Inner)
 *
 * Main canvas component using React Flow for visual workflow editing.
 * Replaces the Drawflow-based canvas with native React Flow implementation.
 */
const ReactFlowCanvasInner = forwardRef<
  ReactFlowCanvasRef,
  ReactFlowCanvasProps
>(
  (
    {
      onWorkflowChange,
      onRequestPromptCreation,
      onRequestContextCreation,
      onRequestToolCreation,
      onRequestProcessCreation,
      onRequestOutputFileCreation,
      isLocked,
      onToggleLock,
      activeTabId,
      onSave,
    },
    ref,
  ) => {
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
    } = state;

    // Load custom node schemas from backend
    useEffect(() => {
      async function loadCustomNodes() {
        try {
          const data = await getExtensionNodes();
          setCustomNodeSchemas(data.nodes as CustomNodeSchema[]);
        } catch (error) {
          console.log("[ReactFlowCanvas] No custom nodes available");
        }
      }
      loadCustomNodes();
    }, [setCustomNodeSchemas]);

    // Canvas configuration
    const {
      nodeTypes,
      defaultEdgeOptions,
      snapGridValue,
      handleTypeRegistry,
      theme,
    } = useCanvasConfig(nodes, customNodeSchemas);

    // History management
    const { saveSnapshot, handleUndo, handleRedo } = useCanvasHistory({
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
    const {
      onConnectStart,
      onConnectEnd,
      isValidConnection,
      onNodesChange,
      onEdgesChange,
      onConnect,
      onNodeDragStop,
    } = useConnectionHandlers({
      nodes,
      setNodes,
      setEdges,
      handleTypeRegistry,
      isLocked,
      linkEdgeColor: theme.colors.edges.link,
    });

    // Edge highlight based on node selection
    useEdgeHighlight(nodes, setEdges, {
      default: theme.colors.edges.default,
      connected: theme.colors.edges.connected,
    });

    // Delete handlers
    const {
      handleDeleteConfirm,
      handleDeleteCancel,
      handleGroupDeleteGroupOnly,
      handleGroupDeleteAll,
      handleGroupDeleteCancel,
      handleDelete,
    } = useDeleteHandlers({
      nodes,
      edges,
      setNodes,
      setEdges,
      deleteConfirm,
      setDeleteConfirm,
      groupDeleteConfirm,
      setGroupDeleteConfirm,
      saveSnapshot,
      isLocked,
    });

    // Clipboard operations
    const { handleCopy, handleCut, handlePaste, hasClipboard } =
      useClipboardOperations({
        nodes,
        edges,
        setNodes,
        setEdges,
        activeTabId,
        isLocked,
        mousePosition,
        saveSnapshot,
      });

    // Keyboard shortcuts
    useKeyboardShortcuts({
      isLocked,
      handleCopy,
      handleCut,
      handlePaste,
      handleDelete,
      handleUndo,
      handleRedo,
      onSave,
    });

    // Node creation
    const nodeCreation = useNodeCreation({
      nodes,
      setNodes,
      rfInstance,
      activeTabId,
      groupPosition: state.groupPosition,
      setGroupPosition: state.setGroupPosition,
      agentPosition: state.agentPosition,
      setAgentPosition: state.setAgentPosition,
      promptPosition: state.promptPosition,
      setPromptPosition: state.setPromptPosition,
      contextPosition: state.contextPosition,
      setContextPosition: state.setContextPosition,
      inputProbePosition: state.inputProbePosition,
      setInputProbePosition: state.setInputProbePosition,
      outputProbePosition: state.outputProbePosition,
      setOutputProbePosition: state.setOutputProbePosition,
      logProbePosition: state.logProbePosition,
      setLogProbePosition: state.setLogProbePosition,
      outputFilePosition: state.outputFilePosition,
      setOutputFilePosition: state.setOutputFilePosition,
      toolPosition: state.toolPosition,
      setToolPosition: state.setToolPosition,
      agentToolPosition: state.agentToolPosition,
      setAgentToolPosition: state.setAgentToolPosition,
      variablePosition: state.variablePosition,
      setVariablePosition: state.setVariablePosition,
      processPosition: state.processPosition,
      setProcessPosition: state.setProcessPosition,
      labelPosition: state.labelPosition,
      setLabelPosition: state.setLabelPosition,
      teleportOutPosition: state.teleportOutPosition,
      setTeleportOutPosition: state.setTeleportOutPosition,
      teleportInPosition: state.teleportInPosition,
      setTeleportInPosition: state.setTeleportInPosition,
      userInputPosition: state.userInputPosition,
      setUserInputPosition: state.setUserInputPosition,
    });

    // Context menu
    const {
      onPaneContextMenu,
      onNodeContextMenu,
      onSelectionContextMenu,
      onMouseMove,
      onContextMenuSelect,
      closeContextMenu,
      handleTeleportNameSubmit,
      handleTeleportNameCancel,
      handleTeleportNameKeyDown,
      handleSelectCustomNode,
    } = useContextMenu({
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
    });

    // Canvas operations
    const {
      clearCanvas,
      saveFlow,
      restoreFlow,
      zoomIn,
      zoomOut,
      fitViewHandler,
      focusNode,
    } = useCanvasOperations({
      nodes,
      setNodes,
      setEdges,
      rfInstance,
      resetPositions,
      customNodeSchemas,
    });

    // Execution state
    const {
      updateNodeExecutionState,
      updateToolExecutionState,
      clearExecutionState,
      updateUserInputWaitingState,
    } = useExecutionState({ setNodes });

    // Validation
    const { highlightErrorNodes, highlightWarningNodes, clearErrorHighlights } =
      useValidation({
        nodes,
        setNodes,
        duplicateErrorNodesRef,
      });

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      // Layout nodes (non-schema-driven)
      addGroupNode: nodeCreation.addGroupNode,
      addLabelNode: nodeCreation.addLabelNode,
      // Schema-driven node creation
      addCustomNode: nodeCreation.addCustomNode,
      addBuiltinSchemaNode: nodeCreation.addBuiltinSchemaNode,
      customNodeSchemas,
      builtinNodeSchemas,
      // Canvas operations
      clearCanvas,
      saveFlow,
      restoreFlow,
      zoomIn,
      zoomOut,
      fitView: fitViewHandler,
      focusNode,
      updateNodeExecutionState,
      updateToolExecutionState,
      updateUserInputWaitingState,
      clearExecutionState,
      highlightErrorNodes,
      highlightWarningNodes,
      clearErrorHighlights,
    }));

    return (
      <div
        className="w-full h-full"
        style={{ background: theme.colors.canvas.background }}
      >
        <style>{getCanvasStyles(theme)}</style>
        <CanvasActionsProvider
          value={{
            copySelectedNodes: handleCopy,
            cutSelectedNodes: handleCut,
            pasteNodes: handlePaste,
            hasClipboard,
            isLocked: !!isLocked,
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            isValidConnection={isValidConnection}
            onNodeDragStop={onNodeDragStop}
            onInit={setRfInstance}
            onPaneContextMenu={onPaneContextMenu}
            onNodeContextMenu={onNodeContextMenu}
            onSelectionContextMenu={onSelectionContextMenu}
            onMouseMove={onMouseMove}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            style={{ background: theme.colors.canvas.background }}
            defaultEdgeOptions={defaultEdgeOptions}
            edgesFocusable={true}
            edgesReconnectable={false}
            elevateEdgesOnSelect={false}
            connectionLineStyle={{
              strokeWidth: 1.5,
              stroke: theme.colors.edges.default,
            }}
            nodesDraggable={!isLocked}
            nodesConnectable={!isLocked}
            elementsSelectable={!isLocked}
            selectionMode={SelectionMode.Partial}
            snapToGrid={snapToGrid}
            snapGrid={snapGridValue}
            deleteKeyCode={null}
            onlyRenderVisibleElements={true}
            autoPanOnNodeDrag={true}
            autoPanOnConnect={true}
            autoPanSpeed={15}
          >
            {snapToGrid && (
              <Background color={theme.colors.canvas.grid} gap={16} />
            )}
            <Controls showInteractive={false}>
              <ControlButton
                className="lucide-btn"
                onClick={onToggleLock}
                title={isLocked ? "Unlock canvas" : "Lock canvas"}
              >
                {isLocked ? <Lock size={12} /> : <LockOpen size={12} />}
              </ControlButton>
              <ControlButton
                className="lucide-btn"
                onClick={() => setSnapToGrid(!snapToGrid)}
                title={
                  snapToGrid ? "Disable snap to grid" : "Enable snap to grid"
                }
              >
                <Grid3X3 size={12} style={{ opacity: snapToGrid ? 1 : 0.4 }} />
              </ControlButton>
            </Controls>
            <MiniMap
              nodeColor={(node) => getMiniMapNodeColor(node, theme)}
              bgColor={theme.colors.canvas.minimap.background}
              maskColor={theme.colors.canvas.minimap.mask}
              nodeStrokeColor={theme.colors.canvas.minimap.nodeStroke}
              nodeStrokeWidth={1}
              pannable
              zoomable
            />
          </ReactFlow>
        </CanvasActionsProvider>
        {contextMenu && (
          <CanvasContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onSelect={onContextMenuSelect}
            onClose={closeContextMenu}
            insideGroup={!!contextMenu.parentGroupId}
            isLocked={isLocked}
            onToggleLock={onToggleLock}
            hasSelection={
              nodes.some((n) => n.selected) || edges.some((e) => e.selected)
            }
            hasClipboard={hasClipboard}
            onCopy={handleCopy}
            onCut={handleCut}
            onPaste={() => handlePaste(contextMenu.flowPosition)}
            onDelete={handleDelete}
            customNodeSchemas={customNodeSchemas}
            onSelectCustom={handleSelectCustomNode}
          />
        )}
        <ConfirmDialog
          isOpen={!!deleteConfirm}
          title="Delete Selection"
          description={deleteConfirm?.message || ""}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
        <GroupDeleteDialog
          isOpen={!!groupDeleteConfirm}
          groupCount={groupDeleteConfirm?.groupIds.length || 0}
          childCount={groupDeleteConfirm?.childIds.length || 0}
          onCancel={handleGroupDeleteCancel}
          onDeleteGroupOnly={handleGroupDeleteGroupOnly}
          onDeleteAll={handleGroupDeleteAll}
        />

        {teleportNamePrompt && (
          <TeleportNameDialog
            type={teleportNamePrompt.type}
            value={teleportNameInput}
            onChange={setTeleportNameInput}
            onSubmit={handleTeleportNameSubmit}
            onCancel={handleTeleportNameCancel}
            theme={theme}
          />
        )}
      </div>
    );
  },
);

ReactFlowCanvasInner.displayName = "ReactFlowCanvasInner";

/**
 * ReactFlowCanvas Component (Wrapper)
 *
 * Wraps ReactFlowCanvasInner with ReactFlowProvider to enable useReactFlow hook
 */
const ReactFlowCanvas = forwardRef<ReactFlowCanvasRef, ReactFlowCanvasProps>(
  (props, ref) => {
    return (
      <ReactFlowProvider>
        <ConnectionProvider>
          <ReactFlowCanvasInner {...props} ref={ref} />
        </ConnectionProvider>
      </ReactFlowProvider>
    );
  },
);

ReactFlowCanvas.displayName = "ReactFlowCanvas";

export default ReactFlowCanvas;
