"use client";

import {
  useCallback,
  useImperativeHandle,
  forwardRef,
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  ControlButton,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
  SelectionMode,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useClipboard } from "@/contexts/ClipboardContext";
import { CanvasActionsProvider } from "@/contexts/CanvasActionsContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Lock, LockOpen, Grid3X3 } from "lucide-react";

import GroupNode from "./nodes/GroupNode";
import AgentNode from "./nodes/AgentNode";
import PromptNode from "./nodes/PromptNode";
import ContextNode from "./nodes/ContextNode";
import InputProbeNode from "./nodes/InputProbeNode";
import OutputProbeNode from "./nodes/OutputProbeNode";
import LogProbeNode from "./nodes/LogProbeNode";
import OutputFileNode from "./nodes/OutputFileNode";
import ToolNode from "./nodes/ToolNode";
import AgentToolNode from "./nodes/AgentToolNode";
import VariableNode from "./nodes/VariableNode";
import ProcessNode from "./nodes/ProcessNode";
import LabelNode from "./nodes/LabelNode";
import TeleportOutNode, { getDefaultTeleportOutData } from "./nodes/TeleportOutNode";
import TeleportInNode, { getDefaultTeleportInData } from "./nodes/TeleportInNode";
import UserInputNode, { getDefaultUserInputData } from "./nodes/UserInputNode";
import StartNode, { getDefaultStartData } from "./nodes/StartNode";
import EndNode, { getDefaultEndData } from "./nodes/EndNode";

import { generateNodeId } from "@/lib/workflowHelpers";
import { sanitizeAgentName } from "@/lib/utils";
import CanvasContextMenu, { type NodeTypeOption } from "./CanvasContextMenu";
import ConfirmDialog from "./ConfirmDialog";
import GroupDeleteDialog from "./GroupDeleteDialog";
import { getDefaultGroupData } from "./nodes/GroupNode";
import { getDefaultAgentData, type AgentNodeData } from "./nodes/AgentNode";
import { getDefaultPromptData } from "./nodes/PromptNode";
import { getDefaultContextData } from "./nodes/ContextNode";
import { getDefaultInputProbeData } from "./nodes/InputProbeNode";
import { getDefaultOutputProbeData } from "./nodes/OutputProbeNode";
import { getDefaultLogProbeData } from "./nodes/LogProbeNode";
import { getDefaultOutputFileData } from "./nodes/OutputFileNode";
import { getDefaultToolData } from "./nodes/ToolNode";
import { getDefaultAgentToolData } from "./nodes/AgentToolNode";
import { getDefaultVariableData } from "./nodes/VariableNode";
import { getDefaultProcessData } from "./nodes/ProcessNode";
import { getDefaultLabelData } from "./nodes/LabelNode";
import type { Agent, Prompt, NodeExecutionState } from "@/lib/types";

// Register custom node types
const nodeTypes = {
  group: GroupNode,
  agent: AgentNode,
  prompt: PromptNode,
  context: ContextNode,
  inputProbe: InputProbeNode,
  outputProbe: OutputProbeNode,
  logProbe: LogProbeNode,
  outputFile: OutputFileNode,
  tool: ToolNode,
  agentTool: AgentToolNode,
  variable: VariableNode,
  process: ProcessNode,
  label: LabelNode,
  teleportOut: TeleportOutNode,
  teleportIn: TeleportInNode,
  userInput: UserInputNode,
  start: StartNode,
  end: EndNode,
} as any; // eslint-disable-line

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
  addGroupNode: (position?: { x: number; y: number }) => void;
  addAgentNode: (position?: { x: number; y: number }) => void;
  addPromptNode: (promptData?: { name: string; file_path: string }, position?: { x: number; y: number }) => void;
  addContextNode: (contextData?: { name: string; file_path: string }, position?: { x: number; y: number }) => void;
  addInputProbeNode: (position?: { x: number; y: number }) => void;
  addOutputProbeNode: (position?: { x: number; y: number }) => void;
  addLogProbeNode: (position?: { x: number; y: number }) => void;
  addOutputFileNode: (outputFileData?: { name: string; file_path: string }, position?: { x: number; y: number }) => void;
  addToolNode: (toolData?: { name: string; file_path: string }, position?: { x: number; y: number }) => void;
  addAgentToolNode: (position?: { x: number; y: number }) => void;
  addVariableNode: (position?: { x: number; y: number }) => void;
  addProcessNode: (processData?: { name: string; file_path: string }, position?: { x: number; y: number }) => void;
  addTeleportOutNode: (name: string, position?: { x: number; y: number }) => void;
  addTeleportInNode: (name: string, position?: { x: number; y: number }) => void;
  addUserInputNode: (position?: { x: number; y: number }) => void;
  addStartNode: (position?: { x: number; y: number }) => void;
  addEndNode: (position?: { x: number; y: number }) => void;
  clearCanvas: () => void;
  saveFlow: () => { nodes: Node[]; edges: Edge[]; viewport: { x: number; y: number; zoom: number } } | null;
  restoreFlow: (flow: { nodes: Node[]; edges: Edge[]; viewport: { x: number; y: number; zoom: number } }) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: () => void;
  focusNode: (nodeId: string) => void;
  updateNodeExecutionState: (agentName: string, state: NodeExecutionState) => void;
  updateToolExecutionState: (toolName: string, state: NodeExecutionState) => void;
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
const ReactFlowCanvasInner = forwardRef<ReactFlowCanvasRef, ReactFlowCanvasProps>(
  ({ onWorkflowChange, onRequestPromptCreation, onRequestContextCreation, onRequestToolCreation, onRequestProcessCreation, onRequestOutputFileCreation, isLocked, onToggleLock, activeTabId, onSave }, ref) => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
    const { screenToFlowPosition } = useReactFlow();
    const { clipboard, copy, hasClipboard } = useClipboard();
    const { theme } = useTheme();

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; flowPosition: { x: number; y: number }; parentGroupId?: string } | null>(null);

    // Delete confirmation state
    const [deleteConfirm, setDeleteConfirm] = useState<{
      nodeIds: string[];
      edgeIds: string[];
      message: string;
    } | null>(null);

    // Group delete confirmation state (for groups with children)
    const [groupDeleteConfirm, setGroupDeleteConfirm] = useState<{
      groupIds: string[];
      childIds: string[];
      otherNodeIds: string[];
      edgeIds: string[];
    } | null>(null);

    // Track mouse position for paste at cursor
    const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
    const [snapToGrid, setSnapToGrid] = useState(false);

    // Teleporter name prompt dialog state
    const [teleportNamePrompt, setTeleportNamePrompt] = useState<{
      type: "teleportOut" | "teleportIn";
      position: { x: number; y: number };
      parentGroupId?: string;
    } | null>(null);
    const [teleportNameInput, setTeleportNameInput] = useState("");

    // Undo/redo history
    const undoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
    const redoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
    const maxHistorySize = 50;

    // Node position tracking for new nodes
    const [groupPosition, setGroupPosition] = useState({ x: 150, y: 100 });
    const [agentPosition, setAgentPosition] = useState({ x: 150, y: 150 });
    const [promptPosition, setPromptPosition] = useState({ x: 150, y: 350 });
    const [contextPosition, setContextPosition] = useState({ x: 150, y: 400 });
    const [inputProbePosition, setInputProbePosition] = useState({ x: 150, y: 450 });
    const [outputProbePosition, setOutputProbePosition] = useState({ x: 150, y: 500 });
    const [logProbePosition, setLogProbePosition] = useState({ x: 150, y: 550 });
    const [outputFilePosition, setOutputFilePosition] = useState({ x: 150, y: 600 });
    const [toolPosition, setToolPosition] = useState({ x: 150, y: 650 });
    const [agentToolPosition, setAgentToolPosition] = useState({ x: 150, y: 600 });
    const [variablePosition, setVariablePosition] = useState({ x: 150, y: 650 });
    const [processPosition, setProcessPosition] = useState({ x: 150, y: 700 });
    const [labelPosition, setLabelPosition] = useState({ x: 150, y: 750 });
    const [teleportOutPosition, setTeleportOutPosition] = useState({ x: 150, y: 800 });
    const [teleportInPosition, setTeleportInPosition] = useState({ x: 150, y: 850 });
    const [userInputPosition, setUserInputPosition] = useState({ x: 150, y: 900 });

    const spacing = 350;

    // Memoized props for ReactFlow to prevent unnecessary re-renders
    const defaultEdgeOptions = useMemo(() => ({
      style: { strokeWidth: 1.5, stroke: theme.colors.edges.default },
      animated: false,
      selectable: true,
    }), [theme.colors.edges.default]);

    const snapGridValue = useMemo(() => [16, 16] as [number, number], []);

    // Handle node changes (drag, select, etc.)
    const onNodesChange = useCallback(
      (changes: NodeChange[]) => {
        setNodes((nds) => applyNodeChanges(changes, nds));
      },
      []
    );

    // Handle edge changes
    const onEdgesChange = useCallback(
      (changes: EdgeChange[]) => {
        setEdges((eds) => applyEdgeChanges(changes, eds));
      },
      []
    );

    // Handle new connections
    const onConnect = useCallback((params: Connection) => {
      if (isLocked) return;

      // Check if this is a link connection (from link handles)
      const isLinkConnection =
        params.sourceHandle?.startsWith('link-') &&
        params.targetHandle?.startsWith('link-');

      if (isLinkConnection) {
        // Gray dotted edge for link connections between agents
        const edgeWithStyle = {
          ...params,
          type: 'default',
          style: { strokeWidth: 2, stroke: theme.colors.edges.link, strokeDasharray: '5 5' },
        };
        setEdges((eds) => addEdge(edgeWithStyle, eds));
      } else if (params.sourceHandle?.startsWith('link-') || params.targetHandle?.startsWith('link-')) {
        // Prevent mixing link handles with regular handles
        return;
      } else {
        setEdges((eds) => addEdge(params, eds));
      }
    }, [isLocked, theme.colors.edges.link]);

    // Auto-parent/detach nodes from Group on drag stop (handles multi-selection)
    const onNodeDragStop = useCallback(
      (_event: React.MouseEvent, _draggedNode: Node, draggedNodes: Node[]) => {
        if (isLocked) return;

        // Filter out group nodes - they can't be parented
        const nodesToProcess = draggedNodes.filter((n) => n.type !== "group");
        if (nodesToProcess.length === 0) return;

        const groupNodes = nodes.filter((n) => n.type === "group");

        setNodes((nds) => {
          let updatedNodes = nds.map((node) => {
            // Only process nodes that were dragged
            const draggedVersion = nodesToProcess.find((d) => d.id === node.id);
            if (!draggedVersion) return node;

            const nodeWidth = node.measured?.width ?? 200;
            const nodeHeight = node.measured?.height ?? 100;

            // Calculate absolute position
            let absoluteX = node.position.x;
            let absoluteY = node.position.y;

            if (node.parentId) {
              const parentNode = nds.find((n) => n.id === node.parentId);
              if (parentNode) {
                absoluteX += parentNode.position.x;
                absoluteY += parentNode.position.y;
              }
            }

            const centerX = absoluteX + nodeWidth / 2;
            const centerY = absoluteY + nodeHeight / 2;

            // Find target group for this node
            let targetGroup: Node | null = null;
            for (const group of groupNodes) {
              const groupWidth = group.measured?.width ?? (group.style?.width as number) ?? 300;
              const groupHeight = group.measured?.height ?? (group.style?.height as number) ?? 200;

              const isInside =
                centerX >= group.position.x &&
                centerX <= group.position.x + groupWidth &&
                centerY >= group.position.y &&
                centerY <= group.position.y + groupHeight;

              if (isInside) {
                targetGroup = group;
                break;
              }
            }

            // Attach to group
            if (targetGroup && targetGroup.id !== node.parentId) {
              const relativeX = absoluteX - targetGroup.position.x;
              const relativeY = absoluteY - targetGroup.position.y;

              return {
                ...node,
                parentId: targetGroup.id,
                extent: "parent" as const,
                position: { x: Math.max(10, relativeX), y: Math.max(40, relativeY) },
              };
            }
            // Detach from group - only if node is contracted (extent: "parent")
            // Expanded nodes (extent: undefined) should stay attached even if visually outside
            else if (!targetGroup && node.parentId && node.extent === "parent") {
              const parentNode = nds.find((n) => n.id === node.parentId);
              const newAbsoluteX = parentNode
                ? node.position.x + parentNode.position.x
                : node.position.x;
              const newAbsoluteY = parentNode
                ? node.position.y + parentNode.position.y
                : node.position.y;

              const { parentId, extent, ...rest } = node;
              return {
                ...rest,
                position: { x: newAbsoluteX, y: newAbsoluteY },
              };
            }

            return node;
          });

          // Parent nodes must come before children in React Flow
          updatedNodes = updatedNodes.sort((a, b) => {
            const aHasParent = !!a.parentId;
            const bHasParent = !!b.parentId;
            if (aHasParent && !bHasParent) return 1;
            if (!aHasParent && bHasParent) return -1;
            return 0;
          });

          return updatedNodes;
        });
      },
      [nodes, isLocked]
    );

    // Helper to strip non-content properties for comparison
    const getContentHash = useCallback((nodes: Node[], edges: Edge[]) => {
      const strippedNodes = nodes.map(({ selected, dragging, ...rest }) => rest);
      return JSON.stringify({ nodes: strippedNodes, edges });
    }, []);

    // Track previous content to avoid dirty state on selection changes
    const prevContentRef = useRef<string>("");

    // Notify parent of workflow changes (only for actual content changes, not selection)
    useEffect(() => {
      if (onWorkflowChange) {
        const currentContent = getContentHash(nodes, edges);
        if (prevContentRef.current && prevContentRef.current !== currentContent) {
          onWorkflowChange({ nodes, edges });
        }
        prevContentRef.current = currentContent;
      }
    }, [nodes, edges, onWorkflowChange, getContentHash]);

    // Save current state to undo stack before modifying operations
    const saveSnapshot = useCallback(() => {
      const snapshot = { nodes: [...nodes], edges: [...edges] };
      undoStackRef.current.push(snapshot);
      if (undoStackRef.current.length > maxHistorySize) {
        undoStackRef.current.shift();
      }
      // Clear redo stack when new action is performed
      redoStackRef.current = [];
    }, [nodes, edges]);

    // Undo last action
    const handleUndo = useCallback(() => {
      if (undoStackRef.current.length === 0) return;

      // Save current state to redo stack
      redoStackRef.current.push({ nodes: [...nodes], edges: [...edges] });

      // Restore previous state
      const previousState = undoStackRef.current.pop()!;
      setNodes(previousState.nodes);
      setEdges(previousState.edges);
    }, [nodes, edges]);

    // Redo last undone action
    const handleRedo = useCallback(() => {
      if (redoStackRef.current.length === 0) return;

      // Save current state to undo stack
      undoStackRef.current.push({ nodes: [...nodes], edges: [...edges] });

      // Restore next state
      const nextState = redoStackRef.current.pop()!;
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
    }, [nodes, edges]);

    // Handle delete confirmation
    const handleDeleteConfirm = useCallback(() => {
      if (!deleteConfirm) return;

      // Save state for undo before modifying
      saveSnapshot();

      const { nodeIds, edgeIds } = deleteConfirm;

      // Remove selected nodes
      if (nodeIds.length > 0) {
        setNodes((nds) => nds.filter((node) => !nodeIds.includes(node.id)));
      }

      // Remove selected edges and edges connected to deleted nodes
      setEdges((eds) =>
        eds.filter(
          (edge) =>
            !edgeIds.includes(edge.id) &&
            !nodeIds.includes(edge.source) &&
            !nodeIds.includes(edge.target)
        )
      );

      setDeleteConfirm(null);
    }, [deleteConfirm, saveSnapshot]);

    const handleDeleteCancel = useCallback(() => {
      setDeleteConfirm(null);
    }, []);

    // Handle group delete - delete group only (unparent children)
    const handleGroupDeleteGroupOnly = useCallback(() => {
      if (!groupDeleteConfirm) return;

      // Save state for undo before modifying
      saveSnapshot();

      const { groupIds, otherNodeIds, edgeIds } = groupDeleteConfirm;

      setNodes((nds) => {
        // Find group positions for converting child positions to absolute
        const groupPositions = new Map<string, { x: number; y: number }>();
        for (const node of nds) {
          if (groupIds.includes(node.id)) {
            groupPositions.set(node.id, node.position);
          }
        }

        return nds
          .filter((node) => !groupIds.includes(node.id) && !otherNodeIds.includes(node.id))
          .map((node) => {
            // Unparent children of deleted groups
            if (node.parentId && groupIds.includes(node.parentId)) {
              const parentPos = groupPositions.get(node.parentId);
              return {
                ...node,
                parentId: undefined,
                extent: undefined,
                position: parentPos
                  ? { x: node.position.x + parentPos.x, y: node.position.y + parentPos.y }
                  : node.position,
              };
            }
            return node;
          });
      });

      // Remove selected edges and edges connected to deleted nodes (groups and other nodes, not children)
      const deletedNodeIds = [...groupIds, ...otherNodeIds];
      setEdges((eds) =>
        eds.filter(
          (edge) =>
            !edgeIds.includes(edge.id) &&
            !deletedNodeIds.includes(edge.source) &&
            !deletedNodeIds.includes(edge.target)
        )
      );

      setGroupDeleteConfirm(null);
    }, [groupDeleteConfirm, saveSnapshot]);

    // Handle group delete - delete all (group + children)
    const handleGroupDeleteAll = useCallback(() => {
      if (!groupDeleteConfirm) return;

      // Save state for undo before modifying
      saveSnapshot();

      const { groupIds, childIds, otherNodeIds, edgeIds } = groupDeleteConfirm;
      const allNodeIds = [...groupIds, ...childIds, ...otherNodeIds];

      setNodes((nds) => nds.filter((node) => !allNodeIds.includes(node.id)));

      // Remove selected edges and edges connected to any deleted nodes
      setEdges((eds) =>
        eds.filter(
          (edge) =>
            !edgeIds.includes(edge.id) &&
            !allNodeIds.includes(edge.source) &&
            !allNodeIds.includes(edge.target)
        )
      );

      setGroupDeleteConfirm(null);
    }, [groupDeleteConfirm, saveSnapshot]);

    const handleGroupDeleteCancel = useCallback(() => {
      setGroupDeleteConfirm(null);
    }, []);

    // Copy selected nodes and edges to clipboard
    const handleCopy = useCallback(() => {
      if (!activeTabId) return;
      copy(nodes, edges, activeTabId);
    }, [nodes, edges, activeTabId, copy]);

    // Cut selected nodes and edges (copy + delete)
    const handleCut = useCallback(() => {
      if (!activeTabId || isLocked) return;

      // Get selected deletable nodes (exclude locked)
      const selectedNodes = nodes.filter((n) => n.selected && !(n.data as { isNodeLocked?: boolean })?.isNodeLocked);
      if (selectedNodes.length === 0) return;

      // Save state for undo before modifying
      saveSnapshot();

      // Copy first (copies all selected, including locked) - clipboard auto-includes children
      copy(nodes, edges, activeTabId);

      // Expand selection to include children of selected groups
      const selectedIds = new Set(selectedNodes.map((n) => n.id));
      const expandedNodes = [...selectedNodes];

      for (const node of nodes) {
        if (node.parentId && selectedIds.has(node.parentId) && !selectedIds.has(node.id)) {
          // Include child if it's not locked
          if (!(node.data as { isNodeLocked?: boolean })?.isNodeLocked) {
            expandedNodes.push(node);
            selectedIds.add(node.id);
          }
        }
      }

      // Then delete expanded selection
      const nodeIds = expandedNodes.map((n) => n.id);
      setNodes((nds) => nds.filter((node) => !nodeIds.includes(node.id)));

      // Remove edges connected to deleted nodes
      setEdges((eds) =>
        eds.filter(
          (edge) =>
            !nodeIds.includes(edge.source) &&
            !nodeIds.includes(edge.target)
        )
      );
    }, [nodes, edges, activeTabId, isLocked, copy, saveSnapshot, setNodes, setEdges]);

    // Paste nodes and edges from clipboard at cursor position
    const handlePaste = useCallback((pastePosition?: { x: number; y: number }) => {
      if (!clipboard || clipboard.nodes.length === 0) return;
      if (isLocked) return;

      // Save state for undo before modifying
      saveSnapshot();

      // Create ID mapping: old ID -> new ID
      const idMap = new Map<string, string>();
      clipboard.nodes.forEach((node) => {
        const prefix = node.id.split("_")[0] || "node";
        idMap.set(node.id, generateNodeId(prefix));
      });

      // Identify top-level nodes (no parent or parent not in clipboard)
      const topLevelNodes = clipboard.nodes.filter(
        (n) => !n.parentId || !idMap.has(n.parentId)
      );

      // Calculate the bounding box center of top-level nodes only
      const minX = Math.min(...topLevelNodes.map((n) => n.position.x));
      const minY = Math.min(...topLevelNodes.map((n) => n.position.y));
      const maxX = Math.max(...topLevelNodes.map((n) => n.position.x));
      const maxY = Math.max(...topLevelNodes.map((n) => n.position.y));
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      // Use provided position, tracked mouse position, or fallback to offset
      let targetPosition: { x: number; y: number };
      if (pastePosition) {
        targetPosition = pastePosition;
      } else if (mousePosition) {
        targetPosition = screenToFlowPosition(mousePosition);
      } else {
        // Fallback: offset from original position
        targetPosition = { x: centerX + 50, y: centerY + 50 };
      }

      // Calculate offset to move nodes so their center is at target position
      const offsetX = targetPosition.x - centerX;
      const offsetY = targetPosition.y - centerY;

      // Create new nodes with new IDs
      // Only apply offset to top-level nodes; children keep their relative positions
      const newNodes: Node[] = clipboard.nodes.map((node) => {
        const hasParentInClipboard = node.parentId && idMap.has(node.parentId);
        return {
          ...node,
          id: idMap.get(node.id)!,
          position: hasParentInClipboard
            ? node.position // Keep relative position for children
            : {
                x: node.position.x + offsetX,
                y: node.position.y + offsetY,
              },
          selected: true,
          // Preserve parent relationship and extent, or clear if parent not in selection
          parentId: hasParentInClipboard
            ? idMap.get(node.parentId!)
            : undefined,
          extent: hasParentInClipboard ? node.extent : undefined,
        };
      });

      // Sort nodes: parents must come before children in React Flow
      const sortedNewNodes = newNodes.sort((a, b) => {
        const aHasParent = !!a.parentId;
        const bHasParent = !!b.parentId;
        if (aHasParent && !bHasParent) return 1;
        if (!aHasParent && bHasParent) return -1;
        return 0;
      });

      // Create new edges with updated source/target IDs
      const newEdges: Edge[] = clipboard.edges.map((edge) => ({
        ...edge,
        id: generateNodeId("edge"),
        source: idMap.get(edge.source)!,
        target: idMap.get(edge.target)!,
        selected: false,
      }));

      // Deselect existing nodes, add new ones
      setNodes((nds) => [
        ...nds.map((n) => ({ ...n, selected: false })),
        ...sortedNewNodes,
      ]);
      setEdges((eds) => [...eds, ...newEdges]);
    }, [clipboard, isLocked, mousePosition, screenToFlowPosition, saveSnapshot]);

    // Handle delete action (used by keyboard shortcut and context menu)
    const handleDelete = useCallback(() => {
      if (isLocked) return;

      // Find selected nodes and edges, excluding locked nodes
      const selectedNodes = nodes.filter((node) => node.selected);
      const deletableNodes = selectedNodes.filter((node) => !(node.data as { isNodeLocked?: boolean })?.isNodeLocked);
      const lockedNodeCount = selectedNodes.length - deletableNodes.length;
      const selectedEdges = edges.filter((edge) => edge.selected);

      if (deletableNodes.length === 0 && selectedEdges.length === 0) return;

      // Check if any selected deletable node is a group with children
      const selectedGroupIds = deletableNodes.filter((n) => n.type === "group").map((n) => n.id);
      const childrenOfSelectedGroups = nodes.filter((n) => n.parentId && selectedGroupIds.includes(n.parentId));

      if (childrenOfSelectedGroups.length > 0) {
        // Show group delete dialog with options
        const otherNodeIds = deletableNodes.filter((n) => n.type !== "group").map((n) => n.id);
        setGroupDeleteConfirm({
          groupIds: selectedGroupIds,
          childIds: childrenOfSelectedGroups.map((n) => n.id),
          otherNodeIds,
          edgeIds: selectedEdges.map((edge) => edge.id),
        });
      } else {
        // Build confirmation message for regular delete
        const nodeCount = deletableNodes.length;
        const edgeCount = selectedEdges.length;

        let message = "";
        if (nodeCount > 0 && edgeCount > 0) {
          message = `Are you sure you want to delete ${nodeCount} node${nodeCount !== 1 ? "s" : ""} and ${edgeCount} connection${edgeCount !== 1 ? "s" : ""}?`;
        } else if (nodeCount > 0) {
          message = nodeCount === 1
            ? "Are you sure you want to delete this node?"
            : `Are you sure you want to delete ${nodeCount} nodes?`;
        } else {
          message = edgeCount === 1
            ? "Are you sure you want to delete this connection?"
            : `Are you sure you want to delete ${edgeCount} connections?`;
        }

        if (lockedNodeCount > 0) {
          message += ` (${lockedNodeCount} locked node${lockedNodeCount !== 1 ? "s" : ""} will be skipped)`;
        }

        // Store data for confirmation dialog
        setDeleteConfirm({
          nodeIds: deletableNodes.map((node) => node.id),
          edgeIds: selectedEdges.map((edge) => edge.id),
          message,
        });
      }
    }, [nodes, edges, isLocked]);

    // Keyboard shortcuts using direct event listener to avoid race conditions
    // Check event.target immediately when the event fires, before any React state updates
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;

        // Check if the event originated from an editable element
        // This check happens synchronously at event time, avoiding race conditions
        const isEditing = (() => {
          if (!target) return false;

          // Standard editable elements
          const tagName = target.tagName.toLowerCase();
          if (tagName === "input" || tagName === "textarea") return true;

          // Contenteditable
          if (target.getAttribute("contenteditable") === "true") return true;

          // Inside Monaco editor or nodrag container
          if (target.closest(".monaco-editor") || target.closest(".nodrag")) return true;

          return false;
        })();

        // If editing, let the editor/input handle the event
        if (isEditing) return;

        const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
        const modifier = isMac ? e.metaKey : e.ctrlKey;

        // Save: Ctrl/Cmd+S
        if (modifier && e.key.toLowerCase() === "s") {
          e.preventDefault();
          onSave?.();
          return;
        }

        // Copy: Ctrl/Cmd+C
        if (modifier && e.key.toLowerCase() === "c" && !e.shiftKey) {
          handleCopy();
          return;
        }

        // Cut: Ctrl/Cmd+X
        if (modifier && e.key.toLowerCase() === "x" && !isLocked) {
          handleCut();
          return;
        }

        // Paste: Ctrl/Cmd+V
        if (modifier && e.key.toLowerCase() === "v" && !isLocked) {
          handlePaste();
          return;
        }

        // Undo: Ctrl/Cmd+Z (without Shift)
        if (modifier && e.key.toLowerCase() === "z" && !e.shiftKey && !isLocked) {
          handleUndo();
          return;
        }

        // Redo: Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y
        if (modifier && !isLocked) {
          if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") {
            handleRedo();
            return;
          }
        }

        // Delete: Delete or Backspace
        if ((e.key === "Delete" || e.key === "Backspace") && !isLocked) {
          handleDelete();
          return;
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isLocked, handleCopy, handleCut, handlePaste, handleDelete, handleUndo, handleRedo, onSave]);

    const addGroupNode = useCallback((position?: { x: number; y: number }) => {
      const groupId = generateNodeId("group");

      const newNode: Node = {
        id: groupId,
        type: "group",
        position: position || groupPosition,
        data: getDefaultGroupData(),
        style: { width: 300, height: 200 },
        dragHandle: ".group-drag-handle",
      };

      // Group nodes must come before their children, so prepend
      setNodes((nds) => [newNode, ...nds]);
      if (!position) {
        setGroupPosition((pos) => ({ ...pos, x: pos.x + spacing }));
      }
    }, [groupPosition]);

    /**
     * Add an Agent node to the canvas
     */
    const addAgentNode = useCallback((position?: { x: number; y: number }) => {
      const agentId = generateNodeId("agent");
      const agent: Agent = {
        id: agentId,
        ...getDefaultAgentData(),
      };

      const newNode: Node = {
        id: agentId,
        type: "agent",
        position: position || agentPosition,
        data: { agent },
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setAgentPosition((pos) => ({ ...pos, x: pos.x + spacing }));
      }
    }, [agentPosition]);

    /**
     * Add a Prompt node to the canvas
     */
    const addPromptNode = useCallback((promptData?: { name: string; file_path: string }, position?: { x: number; y: number }) => {
      const promptId = generateNodeId("prompt");
      const prompt: Prompt = {
        id: promptId,
        ...(promptData || getDefaultPromptData()),
      };

      const newNode: Node = {
        id: promptId,
        type: "prompt",
        position: position || promptPosition,
        data: {
          prompt,
          content: "",
        },
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setPromptPosition((pos) => ({ ...pos, x: pos.x + spacing }));
      }
    }, [promptPosition]);

    /**
     * Add a Context node to the canvas
     */
    const addContextNode = useCallback((contextData?: { name: string; file_path: string }, position?: { x: number; y: number }) => {
      const contextId = generateNodeId("context");
      const context: Prompt = {
        id: contextId,
        ...(contextData || getDefaultContextData()),
      };

      const newNode: Node = {
        id: contextId,
        type: "context",
        position: position || contextPosition,
        data: {
          prompt: context,
          content: "",
        },
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setContextPosition((pos) => ({ ...pos, x: pos.x + spacing }));
      }
    }, [contextPosition]);

    /**
     * Add an Input Probe node to the canvas
     */
    const addInputProbeNode = useCallback((position?: { x: number; y: number }) => {
      const inputProbeId = generateNodeId("inputProbe");

      const newNode: Node = {
        id: inputProbeId,
        type: "inputProbe",
        position: position || inputProbePosition,
        data: getDefaultInputProbeData(),
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setInputProbePosition((pos) => ({ ...pos, x: pos.x + spacing }));
      }
    }, [inputProbePosition]);

    /**
     * Add an Output Probe node to the canvas
     */
    const addOutputProbeNode = useCallback((position?: { x: number; y: number }) => {
      const outputProbeId = generateNodeId("outputProbe");

      const newNode: Node = {
        id: outputProbeId,
        type: "outputProbe",
        position: position || outputProbePosition,
        data: getDefaultOutputProbeData(),
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setOutputProbePosition((pos) => ({ ...pos, x: pos.x + spacing }));
      }
    }, [outputProbePosition]);

    /**
     * Add a Log Probe node to the canvas
     */
    const addLogProbeNode = useCallback((position?: { x: number; y: number }) => {
      const logProbeId = generateNodeId("logProbe");

      const newNode: Node = {
        id: logProbeId,
        type: "logProbe",
        position: position || logProbePosition,
        data: getDefaultLogProbeData(),
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setLogProbePosition((pos) => ({ ...pos, x: pos.x + spacing }));
      }
    }, [logProbePosition]);

    /**
     * Add an OutputFile node to the canvas
     */
    const addOutputFileNode = useCallback((outputFileData?: { name: string; file_path: string }, position?: { x: number; y: number }) => {
      const outputFileId = generateNodeId("outputFile");

      const newNode: Node = {
        id: outputFileId,
        type: "outputFile",
        position: position || outputFilePosition,
        data: outputFileData
          ? { ...getDefaultOutputFileData(), name: outputFileData.name, file_path: outputFileData.file_path }
          : getDefaultOutputFileData(),
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setOutputFilePosition((pos) => ({ ...pos, x: pos.x + spacing }));
      }
    }, [outputFilePosition]);

    /**
     * Add a Tool node to the canvas
     */
    const addToolNode = useCallback((toolData?: { name: string; file_path: string }, position?: { x: number; y: number }) => {
      const toolId = generateNodeId("tool");

      const newNode: Node = {
        id: toolId,
        type: "tool",
        position: position || toolPosition,
        data: toolData ? { ...getDefaultToolData(), name: toolData.name, file_path: toolData.file_path } : getDefaultToolData(),
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setToolPosition((pos) => ({ ...pos, x: pos.x + spacing }));
      }
    }, [toolPosition]);

    /**
     * Add an Agent Tool node to the canvas
     */
    const addAgentToolNode = useCallback((position?: { x: number; y: number }) => {
      const agentToolId = generateNodeId("agentTool");

      const newNode: Node = {
        id: agentToolId,
        type: "agentTool",
        position: position || agentToolPosition,
        data: getDefaultAgentToolData(),
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setAgentToolPosition((pos) => ({ ...pos, x: pos.x + spacing }));
      }
    }, [agentToolPosition]);

    /**
     * Add a Variable node to the canvas
     */
    const addVariableNode = useCallback((position?: { x: number; y: number }) => {
      const variableId = generateNodeId("variable");

      const newNode: Node = {
        id: variableId,
        type: "variable",
        position: position || variablePosition,
        data: getDefaultVariableData(),
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setVariablePosition((pos) => ({ ...pos, x: pos.x + spacing }));
      }
    }, [variablePosition]);

    /**
     * Add a Process node to the canvas
     */
    const addProcessNode = useCallback((processData?: { name: string; file_path: string }, position?: { x: number; y: number }) => {
      const processId = generateNodeId("process");

      const newNode: Node = {
        id: processId,
        type: "process",
        position: position || processPosition,
        data: processData ? { ...getDefaultProcessData(), name: processData.name, file_path: processData.file_path } : getDefaultProcessData(),
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setProcessPosition((pos) => ({ ...pos, x: pos.x + spacing }));
      }
    }, [processPosition]);

    /**
     * Add a Label node to the canvas
     */
    const addLabelNode = useCallback((position?: { x: number; y: number }) => {
      const labelId = generateNodeId("label");

      const newNode: Node = {
        id: labelId,
        type: "label",
        position: position || labelPosition,
        data: getDefaultLabelData(),
        style: { width: 100, height: 30 },
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setLabelPosition((pos) => ({ ...pos, x: pos.x + spacing }));
      }
    }, [labelPosition]);

    /**
     * Add a TeleportOut node to the canvas
     */
    const addTeleportOutNode = useCallback((name: string, position?: { x: number; y: number }) => {
      const teleportId = generateNodeId("teleportOut");

      const newNode: Node = {
        id: teleportId,
        type: "teleportOut",
        position: position || teleportOutPosition,
        data: { ...getDefaultTeleportOutData(), name },
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setTeleportOutPosition((pos) => ({ ...pos, x: pos.x + spacing }));
      }
    }, [teleportOutPosition]);

    /**
     * Add a TeleportIn node to the canvas
     */
    const addTeleportInNode = useCallback((name: string, position?: { x: number; y: number }) => {
      const teleportId = generateNodeId("teleportIn");

      const newNode: Node = {
        id: teleportId,
        type: "teleportIn",
        position: position || teleportInPosition,
        data: { ...getDefaultTeleportInData(), name },
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setTeleportInPosition((pos) => ({ ...pos, x: pos.x + spacing }));
      }
    }, [teleportInPosition]);

    /**
     * Add a User Input node to the canvas
     */
    const addUserInputNode = useCallback((position?: { x: number; y: number }) => {
      const userInputId = generateNodeId("userInput");

      const newNode: Node = {
        id: userInputId,
        type: "userInput",
        position: position || userInputPosition,
        data: getDefaultUserInputData(),
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setUserInputPosition((pos) => ({ ...pos, x: pos.x + spacing }));
      }
    }, [userInputPosition]);

    /**
     * Add a Start node to the canvas (only one allowed)
     */
    const addStartNode = useCallback((position?: { x: number; y: number }) => {
      // Check if start node already exists
      const hasStart = nodes.some(n => n.type === "start");
      if (hasStart) return;

      const startId = generateNodeId("start");
      const newNode: Node = {
        id: startId,
        type: "start",
        position: position || { x: 100, y: 200 },
        data: getDefaultStartData(),
      };

      setNodes((nds) => [...nds, newNode]);
    }, [nodes]);

    /**
     * Add an End node to the canvas
     */
    const addEndNode = useCallback((position?: { x: number; y: number }) => {
      const endId = generateNodeId("end");
      const newNode: Node = {
        id: endId,
        type: "end",
        position: position || { x: 400, y: 200 },
        data: getDefaultEndData(),
      };

      setNodes((nds) => [...nds, newNode]);
    }, []);

    // Handle right-click on canvas pane
    const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      const flowPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setContextMenu({ x: event.clientX, y: event.clientY, flowPosition });
    }, [screenToFlowPosition]);

    // Handle right-click on a node (specifically for groups)
    const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
      if (isLocked) return;
      if (node.type !== 'group') return;

      event.preventDefault();
      const flowPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      // Store position relative to the group
      const relativePosition = {
        x: flowPosition.x - node.position.x,
        y: flowPosition.y - node.position.y,
      };
      setContextMenu({ x: event.clientX, y: event.clientY, flowPosition: relativePosition, parentGroupId: node.id });
    }, [screenToFlowPosition, isLocked]);

    // Handle right-click on selection box
    const onSelectionContextMenu = useCallback((event: React.MouseEvent) => {
      event.preventDefault();
      const flowPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setContextMenu({ x: event.clientX, y: event.clientY, flowPosition });
    }, [screenToFlowPosition]);

    // Track mouse position for paste at cursor
    const onMouseMove = useCallback((event: React.MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    }, []);

    // Helper to add node with optional parent
    const addNodeWithParent = useCallback((
      addFn: (position?: { x: number; y: number }) => void,
      position: { x: number; y: number },
      parentGroupId?: string
    ) => {
      addFn(position);
      if (parentGroupId) {
        // After adding, set the parent for the most recently added node
        setNodes((nds) => {
          const lastNode = nds[nds.length - 1];
          if (lastNode && lastNode.type !== 'group') {
            const updatedNode = {
              ...lastNode,
              parentId: parentGroupId,
              extent: 'parent' as const,
            };
            // Reorder: parents must come before children
            const otherNodes = nds.slice(0, -1);
            const parentIndex = otherNodes.findIndex(n => n.id === parentGroupId);
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
    }, []);

    // Handle context menu node selection
    const onContextMenuSelect = useCallback((nodeType: NodeTypeOption) => {
      if (!contextMenu) return;

      const position = contextMenu.flowPosition;
      const parentGroupId = contextMenu.parentGroupId;

      // Don't allow adding groups inside groups
      if (nodeType === 'group' && parentGroupId) {
        setContextMenu(null);
        return;
      }

      switch (nodeType) {
        case 'variable':
          addNodeWithParent(addVariableNode, position, parentGroupId);
          break;
        case 'group':
          addGroupNode(position);
          break;
        case 'agent':
          addNodeWithParent(addAgentNode, position, parentGroupId);
          break;
        case 'prompt':
          if (onRequestPromptCreation) {
            onRequestPromptCreation(position);
          }
          break;
        case 'context':
          if (onRequestContextCreation) {
            onRequestContextCreation(position);
          }
          break;
        case 'inputProbe':
          addNodeWithParent(addInputProbeNode, position, parentGroupId);
          break;
        case 'outputProbe':
          addNodeWithParent(addOutputProbeNode, position, parentGroupId);
          break;
        case 'logProbe':
          addNodeWithParent(addLogProbeNode, position, parentGroupId);
          break;
        case 'outputFile':
          if (onRequestOutputFileCreation) {
            onRequestOutputFileCreation(position);
          }
          break;
        case 'tool':
          if (onRequestToolCreation) {
            onRequestToolCreation(position);
          }
          break;
        case 'agentTool':
          addNodeWithParent(addAgentToolNode, position, parentGroupId);
          break;
        case 'process':
          if (onRequestProcessCreation) {
            onRequestProcessCreation(position);
          }
          break;
        case 'label':
          addNodeWithParent(addLabelNode, position, parentGroupId);
          break;
        case 'teleportOut':
          setTeleportNamePrompt({ type: "teleportOut", position, parentGroupId });
          setTeleportNameInput("");
          break;
        case 'teleportIn':
          setTeleportNamePrompt({ type: "teleportIn", position, parentGroupId });
          setTeleportNameInput("");
          break;
        case 'userInput':
          addNodeWithParent(addUserInputNode, position, parentGroupId);
          break;
        case 'start':
          addStartNode(position);
          break;
        case 'end':
          addNodeWithParent(addEndNode, position, parentGroupId);
          break;
      }

      setContextMenu(null);
    }, [
      contextMenu,
      addNodeWithParent,
      addVariableNode,
      addGroupNode,
      addAgentNode,
      addInputProbeNode,
      addOutputProbeNode,
      addLogProbeNode,
      addAgentToolNode,
      addLabelNode,
      addUserInputNode,
      addStartNode,
      addEndNode,
      onRequestPromptCreation,
      onRequestContextCreation,
      onRequestToolCreation,
      onRequestProcessCreation,
      onRequestOutputFileCreation,
    ]);

    // Close context menu
    const closeContextMenu = useCallback(() => {
      setContextMenu(null);
    }, []);

    // Handle teleporter name submission
    const handleTeleportNameSubmit = useCallback(() => {
      if (!teleportNamePrompt || !teleportNameInput.trim()) return;

      const { type, position, parentGroupId } = teleportNamePrompt;
      const name = teleportNameInput.trim();

      if (type === "teleportOut") {
        if (parentGroupId) {
          // Add to parent group
          const teleportId = generateNodeId("teleportOut");
          const newNode: Node = {
            id: teleportId,
            type: "teleportOut",
            position,
            data: { ...getDefaultTeleportOutData(), name },
            parentId: parentGroupId,
            extent: "parent" as const,
          };
          setNodes((nds) => [...nds, newNode]);
        } else {
          addTeleportOutNode(name, position);
        }
      } else {
        if (parentGroupId) {
          // Add to parent group
          const teleportId = generateNodeId("teleportIn");
          const newNode: Node = {
            id: teleportId,
            type: "teleportIn",
            position,
            data: { ...getDefaultTeleportInData(), name },
            parentId: parentGroupId,
            extent: "parent" as const,
          };
          setNodes((nds) => [...nds, newNode]);
        } else {
          addTeleportInNode(name, position);
        }
      }

      setTeleportNamePrompt(null);
      setTeleportNameInput("");
    }, [teleportNamePrompt, teleportNameInput, addTeleportOutNode, addTeleportInNode, setNodes]);

    const handleTeleportNameCancel = useCallback(() => {
      setTeleportNamePrompt(null);
      setTeleportNameInput("");
    }, []);

    const handleTeleportNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleTeleportNameSubmit();
      } else if (e.key === "Escape") {
        handleTeleportNameCancel();
      }
    }, [handleTeleportNameSubmit, handleTeleportNameCancel]);

    /**
     * Clear the canvas
     */
    const clearCanvas = useCallback(() => {
      setNodes([]);
      setEdges([]);
      // Reset positions
      setGroupPosition({ x: 150, y: 100 });
      setAgentPosition({ x: 150, y: 150 });
      setPromptPosition({ x: 150, y: 200 });
      setContextPosition({ x: 150, y: 250 });
      setInputProbePosition({ x: 150, y: 300 });
      setOutputProbePosition({ x: 150, y: 350 });
      setLogProbePosition({ x: 150, y: 400 });
      setToolPosition({ x: 150, y: 450 });
      setAgentToolPosition({ x: 150, y: 450 });
      setVariablePosition({ x: 150, y: 500 });
      setProcessPosition({ x: 150, y: 550 });
      setTeleportOutPosition({ x: 150, y: 600 });
      setTeleportInPosition({ x: 150, y: 650 });
      setUserInputPosition({ x: 150, y: 700 });
    }, []);

    /**
     * Save flow using React Flow's native toObject method
     */
    const saveFlow = useCallback(() => {
      if (rfInstance) {
        return rfInstance.toObject();
      }
      return null;
    }, [rfInstance]);

    /**
     * Restore flow using React Flow's native restore pattern
     */
    const restoreFlow = useCallback((flow: { nodes: Node[]; edges: Edge[]; viewport: { x: number; y: number; zoom: number } }) => {
      if (!flow) return;

      // Ensure group nodes have dragHandle set
      const processedNodes = (flow.nodes || []).map((node) => {
        if (node.type === "group") {
          return { ...node, dragHandle: ".group-drag-handle" };
        }
        return node;
      });

      setNodes(processedNodes);
      setEdges(flow.edges || []);

      // Restore viewport after nodes are rendered
      if (rfInstance && flow.viewport) {
        requestAnimationFrame(() => {
          rfInstance.setViewport(flow.viewport);
        });
      }
    }, [rfInstance]);

    // Zoom methods
    const zoomIn = useCallback(() => {
      if (rfInstance) {
        rfInstance.zoomIn();
      }
    }, [rfInstance]);

    const zoomOut = useCallback(() => {
      if (rfInstance) {
        rfInstance.zoomOut();
      }
    }, [rfInstance]);

    const fitViewHandler = useCallback(() => {
      if (rfInstance) {
        rfInstance.fitView({ padding: 0.1 });
      }
    }, [rfInstance]);

    const focusNode = useCallback((nodeId: string) => {
      if (!rfInstance) return;
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      // Center on node with some zoom
      const x = node.position.x + (node.measured?.width ?? 100) / 2;
      const y = node.position.y + (node.measured?.height ?? 50) / 2;
      rfInstance.setCenter(x, y, { zoom: 1.5, duration: 300 });

      // Select the node
      setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === nodeId })));
    }, [rfInstance, nodes, setNodes]);

    // Update node execution state for real-time highlighting
    const updateNodeExecutionState = useCallback((agentName: string, state: NodeExecutionState) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.type !== "agent") return node;
          const data = node.data as unknown as AgentNodeData;
          const nodeName = data.agent?.name || "";
          const sanitized = sanitizeAgentName(nodeName);
          if (
            nodeName.toLowerCase() === agentName.toLowerCase() ||
            sanitized === agentName
          ) {
            return {
              ...node,
              data: {
                ...data,
                executionState: state,
              } as unknown as Record<string, unknown>,
            };
          }
          return node;
        })
      );
    }, [setNodes]);

    // Update tool execution state for real-time highlighting
    const updateToolExecutionState = useCallback((toolName: string, state: NodeExecutionState) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.type !== "tool") return node;
          const data = node.data as Record<string, unknown>;
          const nodeName = (data.name as string) || "";
          if (nodeName.toLowerCase() === toolName.toLowerCase()) {
            return {
              ...node,
              data: {
                ...data,
                executionState: state,
              },
            };
          }
          return node;
        })
      );
    }, [setNodes]);

    // Clear all execution states (when run completes)
    const clearExecutionState = useCallback(() => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.type === "agent") {
            const data = node.data as unknown as AgentNodeData;
            if (data.executionState && data.executionState !== "idle") {
              return {
                ...node,
                data: { ...data, executionState: "idle" as NodeExecutionState },
              };
            }
          } else if (node.type === "tool") {
            const data = node.data as Record<string, unknown>;
            if (data.executionState && data.executionState !== "idle") {
              return {
                ...node,
                data: { ...data, executionState: "idle" as NodeExecutionState },
              };
            }
          } else if (node.type === "userInput") {
            const data = node.data as Record<string, unknown>;
            if (data.isWaitingForInput) {
              return {
                ...node,
                data: { ...data, isWaitingForInput: false },
              };
            }
          }
          return node;
        })
      );
    }, [setNodes]);

    // Update user input node waiting state for glow effect
    const updateUserInputWaitingState = useCallback((nodeId: string, isWaiting: boolean) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId && node.type === "userInput") {
            return {
              ...node,
              data: { ...node.data, isWaitingForInput: isWaiting },
            };
          }
          return node;
        })
      );
    }, [setNodes]);

    // Highlight nodes with validation errors and their messages
    const highlightErrorNodes = useCallback(
      (nodeErrors: Record<string, string[]>) => {
        setNodes((nds) =>
          nds.map((node) => {
            if (nodeErrors[node.id]) {
              return {
                ...node,
                data: {
                  ...node.data,
                  hasValidationError: true,
                  validationErrors: nodeErrors[node.id],
                },
              };
            }
            return node;
          })
        );
      },
      [setNodes]
    );

    // Highlight nodes with validation warnings and their messages
    const highlightWarningNodes = useCallback(
      (nodeWarnings: Record<string, string[]>) => {
        setNodes((nds) =>
          nds.map((node) => {
            if (nodeWarnings[node.id]) {
              return {
                ...node,
                data: {
                  ...node.data,
                  hasValidationWarning: true,
                  validationWarnings: nodeWarnings[node.id],
                },
              };
            }
            return node;
          })
        );
      },
      [setNodes]
    );

    // Clear validation error and warning highlights
    const clearErrorHighlights = useCallback(() => {
      setNodes((nds) =>
        nds.map((node) => {
          const data = node.data as Record<string, unknown>;
          if (
            data.hasValidationError ||
            data.hasValidationWarning ||
            data.validationErrors ||
            data.validationWarnings
          ) {
            const {
              hasValidationError,
              hasValidationWarning,
              validationErrors,
              validationWarnings,
              ...restData
            } = data;
            return { ...node, data: restData };
          }
          return node;
        })
      );
    }, [setNodes]);

    // Track current duplicate error nodes (id -> message) to avoid unnecessary re-renders
    const duplicateErrorNodesRef = useRef<Map<string, string>>(new Map());

    // Real-time validation for duplicate names
    useEffect(() => {
      // File-based node types that can share names if pointing to same file/content
      const fileBasedTypes = new Set(["prompt", "context", "tool", "process", "agentTool"]);
      // Node types that always require unique names
      const uniqueNameTypes = new Set(["agent", "variable"]);

      // Helper to extract name and file info from a node
      const getNodeInfo = (node: Node): { name: string; filePath: string | null; content: string | null } | null => {
        const data = node.data as Record<string, unknown>;
        const nodeType = node.type || "";

        if (!fileBasedTypes.has(nodeType) && !uniqueNameTypes.has(nodeType)) {
          return null;
        }

        let name = "";
        let filePath: string | null = null;
        let content: string | null = null;

        if (nodeType === "agent") {
          const agentData = data.agent as { name?: string } | undefined;
          name = agentData?.name || "";
        } else if (nodeType === "prompt" || nodeType === "context") {
          const promptData = data.prompt as { name?: string; file_path?: string } | undefined;
          name = promptData?.name || "";
          filePath = promptData?.file_path || null;
          content = (data.content as string) || null;
        } else if (nodeType === "tool" || nodeType === "process" || nodeType === "agentTool") {
          name = (data.name as string) || "";
          filePath = (data.file_path as string) || null;
          content = (data.code as string) || null;
        } else if (nodeType === "variable") {
          name = (data.name as string) || "";
        }

        if (!name) return null;

        return { name, filePath, content };
      };

      // Group nodes by name
      const nameToNodes = new Map<string, Array<{ id: string; type: string; filePath: string | null; content: string | null }>>();

      for (const node of nodes) {
        const info = getNodeInfo(node);
        if (!info) continue;

        const existing = nameToNodes.get(info.name) || [];
        existing.push({
          id: node.id,
          type: node.type || "",
          filePath: info.filePath,
          content: info.content,
        });
        nameToNodes.set(info.name, existing);
      }

      // Find nodes with duplicate errors and their messages
      const newErrorNodes = new Map<string, string>();

      for (const [, nodeInfos] of nameToNodes) {
        if (nodeInfos.length <= 1) continue;

        // Check if any are unique-name types (always an error)
        const uniqueNodes = nodeInfos.filter((n) => uniqueNameTypes.has(n.type));
        const fileNodes = nodeInfos.filter((n) => fileBasedTypes.has(n.type));

        if (uniqueNodes.length > 0) {
          // All nodes with this name are errors (unique-name types can't share)
          const msg = "Duplicate name: name must be unique";
          for (const n of nodeInfos) {
            newErrorNodes.set(n.id, msg);
          }
          continue;
        }

        // All are file-based - check if they point to same resource
        if (fileNodes.length > 1) {
          const first = fileNodes[0];
          const allSame = fileNodes.every(
            (n) => n.filePath === first.filePath && n.content === first.content
          );

          if (!allSame) {
            // Different resources - all are errors
            const msg = "Duplicate name: same name but different content";
            for (const n of fileNodes) {
              newErrorNodes.set(n.id, msg);
            }
          }
        }
      }

      // Check if error map changed
      const prevMap = duplicateErrorNodesRef.current;
      const mapChanged =
        newErrorNodes.size !== prevMap.size ||
        [...newErrorNodes].some(([id, msg]) => prevMap.get(id) !== msg);

      if (!mapChanged) return;

      // Update ref
      duplicateErrorNodesRef.current = newErrorNodes;

      // Update nodes with error messages
      setNodes((nds) =>
        nds.map((node) => {
          const data = node.data as Record<string, unknown>;
          const errorMsg = newErrorNodes.get(node.id);
          const currentMsg = data.duplicateNameError as string | undefined;

          if (errorMsg !== currentMsg) {
            if (errorMsg) {
              return { ...node, data: { ...data, duplicateNameError: errorMsg } };
            } else {
              const { duplicateNameError, ...restData } = data;
              return { ...node, data: restData };
            }
          }
          return node;
        })
      );
    }, [nodes, setNodes]);

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      addGroupNode,
      addAgentNode,
      addPromptNode,
      addContextNode,
      addInputProbeNode,
      addOutputProbeNode,
      addLogProbeNode,
      addOutputFileNode,
      addToolNode,
      addAgentToolNode,
      addVariableNode,
      addProcessNode,
      addTeleportOutNode,
      addTeleportInNode,
      addUserInputNode,
      addStartNode,
      addEndNode,
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
      <div className="w-full h-full" style={{ background: theme.colors.canvas.background }}>
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
            connectionLineStyle={{ strokeWidth: 1.5, stroke: theme.colors.edges.default }}
            nodesDraggable={!isLocked}
            nodesConnectable={!isLocked}
            elementsSelectable={!isLocked}
            selectionMode={SelectionMode.Partial}
            snapToGrid={snapToGrid}
            snapGrid={snapGridValue}
            deleteKeyCode={null}
            onlyRenderVisibleElements={true}
          >
            {snapToGrid && <Background color={theme.colors.canvas.grid} gap={16} />}
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
                title={snapToGrid ? "Disable snap to grid" : "Enable snap to grid"}
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
            hasSelection={nodes.some((n) => n.selected) || edges.some((e) => e.selected)}
            hasClipboard={hasClipboard}
            onCopy={handleCopy}
            onCut={handleCut}
            onPaste={() => handlePaste(contextMenu.flowPosition)}
            onDelete={handleDelete}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ pointerEvents: 'auto' }}>
            <div
              className="absolute inset-0 bg-black bg-opacity-50"
              onClick={handleTeleportNameCancel}
            />
            <div
              className="relative rounded-lg shadow-xl p-6"
              style={{
                width: '400px',
                maxWidth: '90vw',
                backgroundColor: theme.colors.nodes.common.container.background,
                border: `1px solid ${theme.colors.nodes.common.container.border}`
              }}
            >
              <h3
                className="text-lg font-semibold mb-4"
                style={{ color: theme.colors.nodes.common.text.primary }}
              >
                {teleportNamePrompt.type === "teleportOut" ? "New Output Connector" : "New Input Connector"}
              </h3>
              <p
                className="text-sm mb-4"
                style={{ color: theme.colors.nodes.common.text.secondary }}
              >
                Enter a name for this connector. Connectors with matching names will be linked.
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
  }
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
        <ReactFlowCanvasInner {...props} ref={ref} />
      </ReactFlowProvider>
    );
  }
);

ReactFlowCanvas.displayName = "ReactFlowCanvas";

export default ReactFlowCanvas;
