"use client";

import { forwardRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  SelectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { CanvasActionsProvider } from "@/contexts/CanvasActionsContext";
import { ConnectionProvider } from "@/contexts/ConnectionContext";
import { useProject } from "@/contexts/ProjectContext";

import CanvasContextMenu from "./CanvasContextMenu";
import { ReactFlowDialogs } from "./ReactFlowDialogs";
import { ReactFlowControls } from "./ReactFlowControls";

import {
  useCanvasSetup,
  useCanvasImperativeHandle,
  getCanvasStyles,
} from "./hooks/canvas";

import type {
  ReactFlowCanvasProps,
  ReactFlowCanvasRef,
} from "./ReactFlowCanvas.types";

// Re-export types for external consumers
export type {
  ReactFlowCanvasProps,
  ReactFlowCanvasRef,
} from "./ReactFlowCanvas.types";

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
    const { defaultModel } = useProject();

    // Set up all canvas functionality
    const canvas = useCanvasSetup({
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
    });

    const { theme, nodeTypes, defaultEdgeOptions, snapGridValue } =
      canvas.config;

    // Expose methods to parent via ref
    useCanvasImperativeHandle({
      ref,
      nodeCreation: canvas.nodeCreation,
      canvasOperations: canvas.canvasOperations,
      executionState: canvas.executionState,
      validation: canvas.validation,
      customNodeSchemas: canvas.customNodeSchemas,
    });

    const { nodes, edges, contextMenu } = canvas;
    const { handleCopy, handleCut, handlePaste, hasClipboard } =
      canvas.clipboard;
    const conn = canvas.connectionHandlers;
    const ctxMenu = canvas.contextMenuHandlers;
    const del = canvas.deleteHandlers;

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
            onNodesChange={conn.onNodesChange}
            onEdgesChange={conn.onEdgesChange}
            onConnect={conn.onConnect}
            onConnectStart={conn.onConnectStart}
            onConnectEnd={conn.onConnectEnd}
            isValidConnection={conn.isValidConnection}
            onNodeDragStop={conn.onNodeDragStop}
            onInit={canvas.setRfInstance}
            onPaneContextMenu={ctxMenu.onPaneContextMenu}
            onNodeContextMenu={ctxMenu.onNodeContextMenu}
            onSelectionContextMenu={ctxMenu.onSelectionContextMenu}
            onNodeClick={canvas.altClickZoom.onNodeClick}
            onPaneClick={canvas.altClickZoom.onPaneClick}
            onMouseMove={ctxMenu.onMouseMove}
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
            snapToGrid={canvas.snapToGrid}
            snapGrid={snapGridValue}
            deleteKeyCode={null}
            onlyRenderVisibleElements={true}
            autoPanOnNodeDrag={true}
            autoPanOnConnect={true}
            autoPanSpeed={15}
          >
            {canvas.snapToGrid && (
              <Background color={theme.colors.canvas.grid} gap={16} />
            )}
            <ReactFlowControls
              isLocked={isLocked}
              onToggleLock={onToggleLock}
              snapToGrid={canvas.snapToGrid}
              onToggleSnapToGrid={() =>
                canvas.setSnapToGrid(!canvas.snapToGrid)
              }
              theme={theme}
            />
          </ReactFlow>
        </CanvasActionsProvider>
        {contextMenu && (
          <CanvasContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onSelect={ctxMenu.onContextMenuSelect}
            onClose={ctxMenu.closeContextMenu}
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
            onDelete={del.handleDelete}
            customNodeSchemas={canvas.customNodeSchemas}
            onSelectCustom={ctxMenu.handleSelectCustomNode}
          />
        )}
        <ReactFlowDialogs
          deleteConfirm={canvas.deleteConfirm}
          onDeleteConfirm={del.handleDeleteConfirm}
          onDeleteCancel={del.handleDeleteCancel}
          groupDeleteConfirm={canvas.groupDeleteConfirm}
          onGroupDeleteGroupOnly={del.handleGroupDeleteGroupOnly}
          onGroupDeleteAll={del.handleGroupDeleteAll}
          onGroupDeleteCancel={del.handleGroupDeleteCancel}
          teleportNamePrompt={canvas.teleportNamePrompt}
          teleportNameInput={canvas.teleportNameInput}
          onTeleportNameChange={canvas.setTeleportNameInput}
          onTeleportNameSubmit={ctxMenu.handleTeleportNameSubmit}
          onTeleportNameCancel={ctxMenu.handleTeleportNameCancel}
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
