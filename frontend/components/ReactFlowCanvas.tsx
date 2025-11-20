"use client";

import {
  useCallback,
  useImperativeHandle,
  forwardRef,
  useState,
  useEffect,
} from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import MasterAgentNode from "./nodes/MasterAgentNode";
import AgentNode from "./nodes/AgentNode";
import PromptNode from "./nodes/PromptNode";

import { generateNodeId, workflowToReactFlow } from "@/lib/workflowHelpers";
import { getDefaultMasterAgentData } from "./nodes/MasterAgentNode";
import { getDefaultAgentData } from "./nodes/AgentNode";
import { getDefaultPromptData } from "./nodes/PromptNode";
import type { MasterAgent, Agent, Prompt, Workflow } from "@/lib/types";

// Register custom node types
const nodeTypes = {
  masterAgent: MasterAgentNode,
  agent: AgentNode,
  prompt: PromptNode,
} as any; // eslint-disable-line

interface ReactFlowCanvasProps {
  onWorkflowChange?: (data: { nodes: Node[]; edges: Edge[] }) => void;
  onOpenPromptEditor?: (promptId: string, filePath: string) => void;
}

export interface ReactFlowCanvasRef {
  addMasterAgentNode: () => void;
  addAgentNode: () => void;
  addPromptNode: (promptData?: { name: string; file_path: string }) => void;
  updatePromptNode: (promptId: string, content: string, filePath: string) => void;
  clearCanvas: () => void;
  exportToWorkflow: () => { nodes: Node[]; edges: Edge[] };
  importFromWorkflow: (workflow: Workflow) => void;
  restoreFromSession: (data: { nodes: Node[]; edges: Edge[] }) => void;
  getDrawflowData: () => { nodes: Node[]; edges: Edge[] };
}

/**
 * ReactFlowCanvas Component
 *
 * Main canvas component using React Flow for visual workflow editing.
 * Replaces the Drawflow-based canvas with native React Flow implementation.
 */
const ReactFlowCanvas = forwardRef<ReactFlowCanvasRef, ReactFlowCanvasProps>(
  ({ onWorkflowChange, onOpenPromptEditor }, ref) => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    // Node position tracking for new nodes
    const [masterAgentPosition, setMasterAgentPosition] = useState({ x: 150, y: 100 });
    const [agentPosition, setAgentPosition] = useState({ x: 150, y: 250 });
    const [promptPosition, setPromptPosition] = useState({ x: 150, y: 400 });

    const spacing = 350;

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
      setEdges((eds) => addEdge(params, eds));
    }, []);

    // Notify parent of workflow changes
    useEffect(() => {
      if (onWorkflowChange) {
        onWorkflowChange({ nodes, edges });
      }
    }, [nodes, edges, onWorkflowChange]);

    // Handle keyboard shortcuts (Delete key)
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        // Delete or Backspace key
        if (event.key === "Delete" || event.key === "Backspace") {
          // Check if user is not typing in an input field
          const target = event.target as HTMLElement;
          if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
            return;
          }

          // Find selected nodes
          const selectedNodes = nodes.filter((node) => node.selected);
          if (selectedNodes.length === 0) return;

          event.preventDefault();

          // Confirm deletion
          const nodeCount = selectedNodes.length;
          const message = nodeCount === 1
            ? "Are you sure you want to delete this node?"
            : `Are you sure you want to delete ${nodeCount} nodes?`;

          if (!confirm(message)) {
            return;
          }

          // Get IDs of nodes to delete
          const nodeIdsToDelete = selectedNodes.map((node) => node.id);

          // Remove selected nodes
          setNodes((nds) => nds.filter((node) => !nodeIdsToDelete.includes(node.id)));

          // Remove edges connected to deleted nodes
          setEdges((eds) =>
            eds.filter(
              (edge) =>
                !nodeIdsToDelete.includes(edge.source) &&
                !nodeIdsToDelete.includes(edge.target)
            )
          );
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [nodes]);

    /**
     * Add a Master Agent node to the canvas
     */
    const addMasterAgentNode = useCallback(() => {
      const masterAgentId = generateNodeId("masterAgent");
      const masterAgent: MasterAgent = {
        id: masterAgentId,
        ...getDefaultMasterAgentData(),
      };

      const newNode: Node = {
        id: masterAgentId,
        type: "masterAgent",
        position: masterAgentPosition,
        data: { masterAgent },
      };

      setNodes((nds) => [...nds, newNode]);
      setMasterAgentPosition((pos) => ({ ...pos, x: pos.x + spacing }));
    }, [masterAgentPosition]);

    /**
     * Add an Agent node to the canvas
     */
    const addAgentNode = useCallback(() => {
      const agentId = generateNodeId("agent");
      const agent: Agent = {
        id: agentId,
        ...getDefaultAgentData(),
      };

      const newNode: Node = {
        id: agentId,
        type: "agent",
        position: agentPosition,
        data: { agent },
      };

      setNodes((nds) => [...nds, newNode]);
      setAgentPosition((pos) => ({ ...pos, x: pos.x + spacing }));
    }, [agentPosition]);

    /**
     * Add a Prompt node to the canvas
     */
    const addPromptNode = useCallback((promptData?: { name: string; file_path: string }) => {
      const promptId = generateNodeId("prompt");
      const prompt: Prompt = {
        id: promptId,
        ...(promptData || getDefaultPromptData()),
      };

      const newNode: Node = {
        id: promptId,
        type: "prompt",
        position: promptPosition,
        data: {
          prompt,
          onEdit: () => {
            if (onOpenPromptEditor) {
              onOpenPromptEditor(promptId, prompt.file_path);
            }
          },
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setPromptPosition((pos) => ({ ...pos, x: pos.x + spacing }));
    }, [promptPosition, onOpenPromptEditor]);


    /**
     * Update a Prompt node's data
     */
    const updatePromptNode = useCallback((promptId: string, content: string, filePath: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === promptId && node.type === "prompt" && node.data.prompt) {
            return {
              ...node,
              data: {
                ...node.data,
                prompt: {
                  ...node.data.prompt,
                  file_path: filePath,
                },
              },
            };
          }
          return node;
        })
      );
    }, []);

    /**
     * Clear the canvas
     */
    const clearCanvas = useCallback(() => {
      setNodes([]);
      setEdges([]);
      // Reset positions
      setMasterAgentPosition({ x: 150, y: 100 });
      setAgentPosition({ x: 150, y: 250 });
      setPromptPosition({ x: 150, y: 400 });
    }, []);

    /**
     * Export current canvas state
     */
    const exportToWorkflow = useCallback(() => {
      return { nodes, edges };
    }, [nodes, edges]);

    /**
     * Import workflow data (convert from Workflow to React Flow format)
     */
    const importFromWorkflow = useCallback((workflow: Workflow) => {
      const { nodes: importedNodes, edges: importedEdges } = workflowToReactFlow(workflow);

      // Set the onEdit handler for prompt nodes
      const updatedNodes = importedNodes.map((node) => {
        if (node.type === "prompt" && node.data.prompt) {
          const prompt = node.data.prompt as Prompt;
          return {
            ...node,
            data: {
              ...node.data,
              onEdit: () => {
                if (onOpenPromptEditor) {
                  onOpenPromptEditor(node.id, prompt.file_path);
                }
              },
            },
          };
        }
        return node;
      });

      setNodes(updatedNodes);
      setEdges(importedEdges);
    }, [onOpenPromptEditor]);

    /**
     * Restore session data directly (already in React Flow format)
     */
    const restoreFromSession = useCallback((data: { nodes: Node[]; edges: Edge[] }) => {
      // Set the onEdit handler for prompt nodes
      const updatedNodes = data.nodes.map((node) => {
        if (node.type === "prompt" && node.data.prompt) {
          const prompt = node.data.prompt as Prompt;
          return {
            ...node,
            data: {
              ...node.data,
              onEdit: () => {
                if (onOpenPromptEditor) {
                  onOpenPromptEditor(node.id, prompt.file_path);
                }
              },
            },
          };
        }
        return node;
      });

      setNodes(updatedNodes);
      setEdges(data.edges);
    }, [onOpenPromptEditor]);

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      addMasterAgentNode,
      addAgentNode,
      addPromptNode,
      updatePromptNode,
      clearCanvas,
      exportToWorkflow,
      importFromWorkflow,
      restoreFromSession,
      getDrawflowData: exportToWorkflow,
    }));

    return (
      <div className="w-full h-full" style={{ background: '#fafafa' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          colorMode="light"
          fitView
          attributionPosition="bottom-left"
          style={{ background: '#fafafa' }}
          defaultEdgeOptions={{
            style: { strokeWidth: 2.5, stroke: '#64748b' },
            animated: false,
          }}
        >
          <Background color="#d1d5db" gap={16} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case "masterAgent":
                  return "#2563eb"; // blue-600
                case "agent":
                  return "#9333ea"; // purple-600
                case "prompt":
                  return "#16a34a"; // green-600
                default:
                  return "#6b7280"; // gray-500
              }
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>
      </div>
    );
  }
);

ReactFlowCanvas.displayName = "ReactFlowCanvas";

export default ReactFlowCanvas;
