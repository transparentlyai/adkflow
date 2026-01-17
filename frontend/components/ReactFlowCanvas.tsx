"use client";

import { useImperativeHandle, forwardRef, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  SelectionMode,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { CanvasActionsProvider } from "@/contexts/CanvasActionsContext";
import { ConnectionProvider } from "@/contexts/ConnectionContext";
import { useProject } from "@/contexts/ProjectContext";

import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import { builtinNodeSchemas } from "@/lib/builtinNodeHelpers";
import { getExtensionNodes } from "@/lib/api";
import CanvasContextMenu from "./CanvasContextMenu";
import { ReactFlowDialogs } from "./ReactFlowDialogs";
import { ReactFlowControls } from "./ReactFlowControls";
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
  useEdgeTabOpacity,
  useAltClickZoom,
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
  updateCallbackExecutionState: (
    callbackName: string,
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
    // Get project context for default model
    const { defaultModel } = useProject();

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
      edges,
      setNodes,
      setEdges,
      handleTypeRegistry,
      isLocked,
      linkEdgeColor: theme.colors.edges.link,
      callbackEdgeColor: theme.colors.edges.callback,
    });

    // Edge highlight based on node selection
    useEdgeHighlight(nodes, setEdges, {
      default: theme.colors.edges.default,
      connected: theme.colors.edges.connected,
    });

    // Edge opacity for handles on inactive tabs
    useEdgeTabOpacity(nodes, edges, setEdges);

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
      activeTabId: activeTabId ?? null,
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
      defaultModel,
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
      updateCallbackExecutionState,
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

    // Alt+Click zoom shortcut
    const { onNodeClick, onPaneClick } = useAltClickZoom();

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
      updateCallbackExecutionState,
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
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
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
            <ReactFlowControls
              isLocked={isLocked}
              onToggleLock={onToggleLock}
              snapToGrid={snapToGrid}
              onToggleSnapToGrid={() => setSnapToGrid(!snapToGrid)}
              theme={theme}
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
        <ReactFlowDialogs
          deleteConfirm={deleteConfirm}
          onDeleteConfirm={handleDeleteConfirm}
          onDeleteCancel={handleDeleteCancel}
          groupDeleteConfirm={groupDeleteConfirm}
          onGroupDeleteGroupOnly={handleGroupDeleteGroupOnly}
          onGroupDeleteAll={handleGroupDeleteAll}
          onGroupDeleteCancel={handleGroupDeleteCancel}
          teleportNamePrompt={teleportNamePrompt}
          teleportNameInput={teleportNameInput}
          onTeleportNameChange={setTeleportNameInput}
          onTeleportNameSubmit={handleTeleportNameSubmit}
          onTeleportNameCancel={handleTeleportNameCancel}
          theme={theme}
        />
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
