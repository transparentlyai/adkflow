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
  // Legacy add functions (for backward compatibility)
  addGroupNode: (position?: { x: number; y: number }) => void;
  addAgentNode: (position?: { x: number; y: number }) => void;
  addPromptNode: (
    promptData?: { name: string; file_path: string },
    position?: { x: number; y: number },
  ) => void;
  addContextNode: (
    contextData?: { name: string; file_path: string },
    position?: { x: number; y: number },
  ) => void;
  addInputProbeNode: (position?: { x: number; y: number }) => void;
  addOutputProbeNode: (position?: { x: number; y: number }) => void;
  addLogProbeNode: (position?: { x: number; y: number }) => void;
  addOutputFileNode: (
    outputFileData?: { name: string; file_path: string },
    position?: { x: number; y: number },
  ) => void;
  addToolNode: (
    toolData?: { name: string; file_path: string },
    position?: { x: number; y: number },
  ) => void;
  addAgentToolNode: (position?: { x: number; y: number }) => void;
  addVariableNode: (position?: { x: number; y: number }) => void;
  addProcessNode: (
    processData?: { name: string; file_path: string },
    position?: { x: number; y: number },
  ) => void;
  addTeleportOutNode: (
    name: string,
    position?: { x: number; y: number },
  ) => void;
  addTeleportInNode: (
    name: string,
    position?: { x: number; y: number },
  ) => void;
  addUserInputNode: (position?: { x: number; y: number }) => void;
  addStartNode: (position?: { x: number; y: number }) => void;
  addEndNode: (position?: { x: number; y: number }) => void;
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
      // Legacy add functions
      addGroupNode: nodeCreation.addGroupNode,
      addAgentNode: nodeCreation.addAgentNode,
      addPromptNode: nodeCreation.addPromptNode,
      addContextNode: nodeCreation.addContextNode,
      addInputProbeNode: nodeCreation.addInputProbeNode,
      addOutputProbeNode: nodeCreation.addOutputProbeNode,
      addLogProbeNode: nodeCreation.addLogProbeNode,
      addOutputFileNode: nodeCreation.addOutputFileNode,
      addToolNode: nodeCreation.addToolNode,
      addAgentToolNode: nodeCreation.addAgentToolNode,
      addVariableNode: nodeCreation.addVariableNode,
      addProcessNode: nodeCreation.addProcessNode,
      addTeleportOutNode: nodeCreation.addTeleportOutNode,
      addTeleportInNode: nodeCreation.addTeleportInNode,
      addUserInputNode: nodeCreation.addUserInputNode,
      addStartNode: nodeCreation.addStartNode,
      addEndNode: nodeCreation.addEndNode,
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
        <style>{`
          .react-flow__node-group {
            background: transparent !important;
            box-shadow: none !important;
            border: none !important;
            pointer-events: none !important;
          }
          .react-flow__node-group .group-drag-handle,
          .react-flow__node-group .react-flow__resize-control {
            pointer-events: auto !important;
          }
          .react-flow__edge .react-flow__edge-path {
            transition: stroke 0.15s ease, stroke-width 0.15s ease;
          }
          .react-flow__edge:hover .react-flow__edge-path {
            stroke: ${theme.colors.edges.hover} !important;
            stroke-width: 2.5 !important;
          }
          .react-flow__edge.selected .react-flow__edge-path,
          .react-flow__edge:focus .react-flow__edge-path,
          .react-flow__edge:focus-visible .react-flow__edge-path {
            stroke: ${theme.colors.edges.selected} !important;
            stroke-width: 3 !important;
          }
          .react-flow__controls-button.lucide-btn svg {
            fill: none !important;
            stroke: currentColor !important;
            stroke-width: 2px;
            width: 12px;
            height: 12px;
          }
        `}</style>
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
            elevateEdgesOnSelect={true}
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
              nodeColor={(node) => {
                switch (node.type) {
                  case "group":
                    return theme.colors.nodes.group.header;
                  case "agent":
                    return theme.colors.nodes.agent.header;
                  case "prompt":
                    return theme.colors.nodes.prompt.header;
                  case "context":
                    return theme.colors.nodes.context.header;
                  case "inputProbe":
                  case "outputProbe":
                  case "logProbe":
                    return theme.colors.nodes.probe.header;
                  case "outputFile":
                    return theme.colors.nodes.outputFile.header;
                  case "tool":
                    return theme.colors.nodes.tool.header;
                  case "agentTool":
                    return theme.colors.nodes.agentTool.header;
                  case "variable":
                    return theme.colors.nodes.variable.header;
                  case "process":
                    return theme.colors.nodes.process.header;
                  case "label":
                    return theme.colors.nodes.label.header;
                  case "userInput":
                    return theme.colors.nodes.userInput.header;
                  case "start":
                    return theme.colors.nodes.start.header;
                  case "end":
                    return theme.colors.nodes.end.header;
                  default:
                    return theme.colors.nodes.label.header;
                }
              }}
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

        {/* Teleporter Name Prompt Dialog */}
        {teleportNamePrompt && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ pointerEvents: "auto" }}
          >
            <div
              className="absolute inset-0 bg-black bg-opacity-50"
              onClick={handleTeleportNameCancel}
            />
            <div
              className="relative rounded-lg shadow-xl p-6"
              style={{
                width: "400px",
                maxWidth: "90vw",
                backgroundColor: theme.colors.nodes.common.container.background,
                border: `1px solid ${theme.colors.nodes.common.container.border}`,
              }}
            >
              <h3
                className="text-lg font-semibold mb-4"
                style={{ color: theme.colors.nodes.common.text.primary }}
              >
                {teleportNamePrompt.type === "teleportOut"
                  ? "New Output Connector"
                  : "New Input Connector"}
              </h3>
              <p
                className="text-sm mb-4"
                style={{ color: theme.colors.nodes.common.text.secondary }}
              >
                Enter a name for this connector. Connectors with matching names
                will be linked.
              </p>
              <input
                type="text"
                value={teleportNameInput}
                onChange={(e) => setTeleportNameInput(e.target.value)}
                onKeyDown={handleTeleportNameKeyDown}
                className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 mb-4"
                style={{
                  backgroundColor: theme.colors.nodes.common.footer.background,
                  border: `1px solid ${theme.colors.nodes.common.container.border}`,
                  color: theme.colors.nodes.common.text.primary,
                }}
                placeholder="Connector name"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleTeleportNameCancel}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{
                    border: `1px solid ${theme.colors.nodes.common.container.border}`,
                    color: theme.colors.nodes.common.text.secondary,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleTeleportNameSubmit}
                  disabled={!teleportNameInput.trim()}
                  className="px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: theme.colors.nodes.agent.header,
                    color: theme.colors.nodes.agent.text,
                  }}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
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
