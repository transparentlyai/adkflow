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

import AgentNode from "./nodes/AgentNode";
import SubagentNode from "./nodes/SubagentNode";
import PromptNode from "./nodes/PromptNode";
import GroupNode from "./nodes/GroupNode";

import { generateNodeId, workflowToReactFlow } from "@/lib/workflowHelpers";
import { getDefaultAgentData } from "./nodes/AgentNode";
import { getDefaultSubagentData } from "./nodes/SubagentNode";
import { getDefaultPromptData } from "./nodes/PromptNode";
import type { Agent, Subagent, Prompt, Workflow } from "@/lib/types";

// Register custom node types
const nodeTypes = {
  agent: AgentNode,
  subagent: SubagentNode,
  prompt: PromptNode,
  group: GroupNode,
} as any; // eslint-disable-line

interface ReactFlowCanvasProps {
  onWorkflowChange?: (data: { nodes: Node[]; edges: Edge[] }) => void;
  onOpenPromptEditor?: (promptId: string) => void;
}

export interface ReactFlowCanvasRef {
  addAgentNode: () => void;
  addSubagentNode: () => void;
  addPromptNode: () => void;
  clearCanvas: () => void;
  exportToWorkflow: () => { nodes: Node[]; edges: Edge[] };
  importFromWorkflow: (workflow: Workflow) => void;
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
    const [agentPosition, setAgentPosition] = useState({ x: 150, y: 100 });
    const [subagentPosition, setSubagentPosition] = useState({ x: 150, y: 250 });
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
     * Add a Subagent node to the canvas
     */
    const addSubagentNode = useCallback(() => {
      const subagentId = generateNodeId("subagent");
      const subagent: Subagent = {
        id: subagentId,
        ...getDefaultSubagentData(),
      };

      const newNode: Node = {
        id: subagentId,
        type: "subagent",
        position: subagentPosition,
        data: { subagent },
      };

      setNodes((nds) => [...nds, newNode]);
      setSubagentPosition((pos) => ({ ...pos, x: pos.x + spacing }));
    }, [subagentPosition]);

    /**
     * Add a Prompt node to the canvas
     */
    const addPromptNode = useCallback(() => {
      const promptId = generateNodeId("prompt");
      const prompt: Prompt = {
        id: promptId,
        ...getDefaultPromptData(),
      };

      const newNode: Node = {
        id: promptId,
        type: "prompt",
        position: promptPosition,
        data: {
          prompt,
          onEdit: () => {
            if (onOpenPromptEditor) {
              onOpenPromptEditor(promptId);
            }
          },
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setPromptPosition((pos) => ({ ...pos, x: pos.x + spacing }));
    }, [promptPosition, onOpenPromptEditor]);

    /**
     * Clear the canvas
     */
    const clearCanvas = useCallback(() => {
      setNodes([]);
      setEdges([]);
      // Reset positions
      setAgentPosition({ x: 150, y: 100 });
      setSubagentPosition({ x: 150, y: 250 });
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
          return {
            ...node,
            data: {
              ...node.data,
              onEdit: () => {
                if (onOpenPromptEditor) {
                  onOpenPromptEditor(node.id);
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

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      addAgentNode,
      addSubagentNode,
      addPromptNode,
      clearCanvas,
      exportToWorkflow,
      importFromWorkflow,
      getDrawflowData: exportToWorkflow,
    }));

    return (
      <div className="w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          className="bg-gray-50"
        >
          <Background />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case "agent":
                  return "#2563eb"; // blue-600
                case "subagent":
                  return "#9333ea"; // purple-600
                case "prompt":
                  return "#16a34a"; // green-600
                case "group":
                  return "#3b82f6"; // blue-500
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
