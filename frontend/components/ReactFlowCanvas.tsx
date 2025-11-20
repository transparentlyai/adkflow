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
  useReactFlow,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import SequentialAgentNode from "./nodes/SequentialAgentNode";
import ParallelAgentNode from "./nodes/ParallelAgentNode";
import LLMAgentNode from "./nodes/LLMAgentNode";
import LoopAgentNode from "./nodes/LoopAgentNode";
import AgentNode from "./nodes/AgentNode";
import PromptNode from "./nodes/PromptNode";
import ContextNode from "./nodes/ContextNode";
import InputProbeNode from "./nodes/InputProbeNode";
import OutputProbeNode from "./nodes/OutputProbeNode";
import ToolNode from "./nodes/ToolNode";
import AgentToolNode from "./nodes/AgentToolNode";
import VariableNode from "./nodes/VariableNode";

import { generateNodeId } from "@/lib/workflowHelpers";
import { getDefaultSequentialAgentData } from "./nodes/SequentialAgentNode";
import { getDefaultParallelAgentData } from "./nodes/ParallelAgentNode";
import { getDefaultLLMAgentData } from "./nodes/LLMAgentNode";
import { getDefaultLoopAgentData } from "./nodes/LoopAgentNode";
import { getDefaultAgentData } from "./nodes/AgentNode";
import { getDefaultPromptData } from "./nodes/PromptNode";
import { getDefaultContextData } from "./nodes/ContextNode";
import { getDefaultInputProbeData } from "./nodes/InputProbeNode";
import { getDefaultOutputProbeData } from "./nodes/OutputProbeNode";
import { getDefaultToolData } from "./nodes/ToolNode";
import { getDefaultAgentToolData } from "./nodes/AgentToolNode";
import { getDefaultVariableData } from "./nodes/VariableNode";
import type { SequentialAgent, ParallelAgent, LLMAgent, LoopAgent, Agent, Prompt } from "@/lib/types";

// Register custom node types
const nodeTypes = {
  sequentialAgent: SequentialAgentNode,
  parallelAgent: ParallelAgentNode,
  llmAgent: LLMAgentNode,
  loopAgent: LoopAgentNode,
  agent: AgentNode,
  prompt: PromptNode,
  context: ContextNode,
  inputProbe: InputProbeNode,
  outputProbe: OutputProbeNode,
  tool: ToolNode,
  agentTool: AgentToolNode,
  variable: VariableNode,
} as any; // eslint-disable-line

interface ReactFlowCanvasProps {
  onWorkflowChange?: (data: { nodes: Node[]; edges: Edge[] }) => void;
  onOpenPromptEditor?: (promptId: string, promptName: string, filePath: string) => void;
  onOpenContextEditor?: (contextId: string, contextName: string, filePath: string) => void;
}

export interface ReactFlowCanvasRef {
  addSequentialAgentNode: () => void;
  addParallelAgentNode: () => void;
  addLLMAgentNode: () => void;
  addLoopAgentNode: () => void;
  addAgentNode: () => void;
  addPromptNode: (promptData?: { name: string; file_path: string }) => void;
  addContextNode: (contextData?: { name: string; file_path: string }) => void;
  addInputProbeNode: () => void;
  addOutputProbeNode: () => void;
  addToolNode: () => void;
  addAgentToolNode: () => void;
  addVariableNode: () => void;
  updatePromptNode: (promptId: string, name: string, content: string, filePath: string) => void;
  updateContextNode: (contextId: string, name: string, content: string, filePath: string) => void;
  clearCanvas: () => void;
  saveFlow: () => { nodes: Node[]; edges: Edge[]; viewport: { x: number; y: number; zoom: number } } | null;
  restoreFlow: (flow: { nodes: Node[]; edges: Edge[]; viewport: { x: number; y: number; zoom: number } }) => void;
}

/**
 * ReactFlowCanvas Component
 *
 * Main canvas component using React Flow for visual workflow editing.
 * Replaces the Drawflow-based canvas with native React Flow implementation.
 */
const ReactFlowCanvas = forwardRef<ReactFlowCanvasRef, ReactFlowCanvasProps>(
  ({ onWorkflowChange, onOpenPromptEditor, onOpenContextEditor }, ref) => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

    // Node position tracking for new nodes
    const [sequentialAgentPosition, setSequentialAgentPosition] = useState({ x: 150, y: 100 });
    const [parallelAgentPosition, setParallelAgentPosition] = useState({ x: 150, y: 150 });
    const [llmAgentPosition, setLLMAgentPosition] = useState({ x: 150, y: 200 });
    const [loopAgentPosition, setLoopAgentPosition] = useState({ x: 150, y: 250 });
    const [agentPosition, setAgentPosition] = useState({ x: 150, y: 300 });
    const [promptPosition, setPromptPosition] = useState({ x: 150, y: 350 });
    const [contextPosition, setContextPosition] = useState({ x: 150, y: 400 });
    const [inputProbePosition, setInputProbePosition] = useState({ x: 150, y: 450 });
    const [outputProbePosition, setOutputProbePosition] = useState({ x: 150, y: 500 });
    const [toolPosition, setToolPosition] = useState({ x: 150, y: 550 });
    const [agentToolPosition, setAgentToolPosition] = useState({ x: 150, y: 600 });
    const [variablePosition, setVariablePosition] = useState({ x: 150, y: 650 });

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

          // Find selected nodes and edges
          const selectedNodes = nodes.filter((node) => node.selected);
          const selectedEdges = edges.filter((edge) => edge.selected);

          if (selectedNodes.length === 0 && selectedEdges.length === 0) return;

          event.preventDefault();

          // Confirm deletion
          const nodeCount = selectedNodes.length;
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

          if (!confirm(message)) {
            return;
          }

          // Get IDs of nodes and edges to delete
          const nodeIdsToDelete = selectedNodes.map((node) => node.id);
          const edgeIdsToDelete = selectedEdges.map((edge) => edge.id);

          // Remove selected nodes
          if (nodeIdsToDelete.length > 0) {
            setNodes((nds) => nds.filter((node) => !nodeIdsToDelete.includes(node.id)));
          }

          // Remove selected edges and edges connected to deleted nodes
          setEdges((eds) =>
            eds.filter(
              (edge) =>
                !edgeIdsToDelete.includes(edge.id) &&
                !nodeIdsToDelete.includes(edge.source) &&
                !nodeIdsToDelete.includes(edge.target)
            )
          );
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [nodes, edges]);

    /**
     * Add a Sequential Agent node to the canvas
     */
    const addSequentialAgentNode = useCallback(() => {
      const sequentialAgentId = generateNodeId("sequentialAgent");
      const sequentialAgent: SequentialAgent = {
        id: sequentialAgentId,
        ...getDefaultSequentialAgentData(),
      } as SequentialAgent;

      const newNode: Node = {
        id: sequentialAgentId,
        type: "sequentialAgent",
        position: sequentialAgentPosition,
        data: { sequentialAgent },
      };

      setNodes((nds) => [...nds, newNode]);
      setSequentialAgentPosition((pos) => ({ ...pos, x: pos.x + spacing }));
    }, [sequentialAgentPosition]);

    /**
     * Add a Parallel Agent node to the canvas
     */
    const addParallelAgentNode = useCallback(() => {
      const parallelAgentId = generateNodeId("parallelAgent");
      const parallelAgent: ParallelAgent = {
        id: parallelAgentId,
        ...getDefaultParallelAgentData(),
      } as ParallelAgent;

      const newNode: Node = {
        id: parallelAgentId,
        type: "parallelAgent",
        position: parallelAgentPosition,
        data: { parallelAgent },
      };

      setNodes((nds) => [...nds, newNode]);
      setParallelAgentPosition((pos) => ({ ...pos, x: pos.x + spacing }));
    }, [parallelAgentPosition]);

    /**
     * Add an LLM Agent node to the canvas
     */
    const addLLMAgentNode = useCallback(() => {
      const llmAgentId = generateNodeId("llmAgent");
      const llmAgent: LLMAgent = {
        id: llmAgentId,
        ...getDefaultLLMAgentData(),
      } as LLMAgent;

      const newNode: Node = {
        id: llmAgentId,
        type: "llmAgent",
        position: llmAgentPosition,
        data: { llmAgent },
      };

      setNodes((nds) => [...nds, newNode]);
      setLLMAgentPosition((pos) => ({ ...pos, x: pos.x + spacing }));
    }, [llmAgentPosition]);

    /**
     * Add a Loop Agent node to the canvas
     */
    const addLoopAgentNode = useCallback(() => {
      const loopAgentId = generateNodeId("loopAgent");
      const loopAgent: LoopAgent = {
        id: loopAgentId,
        ...getDefaultLoopAgentData(),
      } as LoopAgent;

      const newNode: Node = {
        id: loopAgentId,
        type: "loopAgent",
        position: loopAgentPosition,
        data: { loopAgent },
      };

      setNodes((nds) => [...nds, newNode]);
      setLoopAgentPosition((pos) => ({ ...pos, x: pos.x + spacing }));
    }, [loopAgentPosition]);

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
              onOpenPromptEditor(promptId, prompt.name, prompt.file_path);
            }
          },
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setPromptPosition((pos) => ({ ...pos, x: pos.x + spacing }));
    }, [promptPosition, onOpenPromptEditor]);

    /**
     * Add a Context node to the canvas
     */
    const addContextNode = useCallback((contextData?: { name: string; file_path: string }) => {
      const contextId = generateNodeId("context");
      const context: Prompt = {
        id: contextId,
        ...(contextData || getDefaultContextData()),
      };

      const newNode: Node = {
        id: contextId,
        type: "context",
        position: contextPosition,
        data: {
          prompt: context,
          onEdit: () => {
            if (onOpenContextEditor) {
              onOpenContextEditor(contextId, context.name, context.file_path);
            }
          },
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setContextPosition((pos) => ({ ...pos, x: pos.x + spacing }));
    }, [contextPosition, onOpenContextEditor]);

    /**
     * Add an Input Probe node to the canvas
     */
    const addInputProbeNode = useCallback(() => {
      const inputProbeId = generateNodeId("inputProbe");

      const newNode: Node = {
        id: inputProbeId,
        type: "inputProbe",
        position: inputProbePosition,
        data: getDefaultInputProbeData(),
      };

      setNodes((nds) => [...nds, newNode]);
      setInputProbePosition((pos) => ({ ...pos, x: pos.x + spacing }));
    }, [inputProbePosition]);

    /**
     * Add an Output Probe node to the canvas
     */
    const addOutputProbeNode = useCallback(() => {
      const outputProbeId = generateNodeId("outputProbe");

      const newNode: Node = {
        id: outputProbeId,
        type: "outputProbe",
        position: outputProbePosition,
        data: getDefaultOutputProbeData(),
      };

      setNodes((nds) => [...nds, newNode]);
      setOutputProbePosition((pos) => ({ ...pos, x: pos.x + spacing }));
    }, [outputProbePosition]);

    /**
     * Add a Tool node to the canvas
     */
    const addToolNode = useCallback(() => {
      const toolId = generateNodeId("tool");

      const newNode: Node = {
        id: toolId,
        type: "tool",
        position: toolPosition,
        data: getDefaultToolData(),
      };

      setNodes((nds) => [...nds, newNode]);
      setToolPosition((pos) => ({ ...pos, x: pos.x + spacing }));
    }, [toolPosition]);

    /**
     * Add an Agent Tool node to the canvas
     */
    const addAgentToolNode = useCallback(() => {
      const agentToolId = generateNodeId("agentTool");

      const newNode: Node = {
        id: agentToolId,
        type: "agentTool",
        position: agentToolPosition,
        data: getDefaultAgentToolData(),
      };

      setNodes((nds) => [...nds, newNode]);
      setAgentToolPosition((pos) => ({ ...pos, x: pos.x + spacing }));
    }, [agentToolPosition]);

    /**
     * Add a Variable node to the canvas
     */
    const addVariableNode = useCallback(() => {
      const variableId = generateNodeId("variable");

      const newNode: Node = {
        id: variableId,
        type: "variable",
        position: variablePosition,
        data: getDefaultVariableData(),
      };

      setNodes((nds) => [...nds, newNode]);
      setVariablePosition((pos) => ({ ...pos, x: pos.x + spacing }));
    }, [variablePosition]);

    /**
     * Update a Prompt node's data
     */
    const updatePromptNode = useCallback((promptId: string, name: string, content: string, filePath: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === promptId && node.type === "prompt" && node.data.prompt) {
            return {
              ...node,
              data: {
                ...node.data,
                prompt: {
                  ...node.data.prompt,
                  name: name,
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
     * Update a Context node's data
     */
    const updateContextNode = useCallback((contextId: string, name: string, content: string, filePath: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === contextId && node.type === "context" && node.data.prompt) {
            return {
              ...node,
              data: {
                ...node.data,
                prompt: {
                  ...node.data.prompt,
                  name: name,
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
      setSequentialAgentPosition({ x: 150, y: 100 });
      setParallelAgentPosition({ x: 150, y: 150 });
      setLLMAgentPosition({ x: 150, y: 200 });
      setLoopAgentPosition({ x: 150, y: 250 });
      setAgentPosition({ x: 150, y: 300 });
      setPromptPosition({ x: 150, y: 350 });
      setContextPosition({ x: 150, y: 400 });
      setInputProbePosition({ x: 150, y: 450 });
      setOutputProbePosition({ x: 150, y: 500 });
      setToolPosition({ x: 150, y: 550 });
      setAgentToolPosition({ x: 150, y: 600 });
      setVariablePosition({ x: 150, y: 650 });
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

      // Set the onEdit handler for prompt and context nodes
      const updatedNodes = flow.nodes.map((node) => {
        if (node.type === "prompt" && node.data.prompt) {
          const prompt = node.data.prompt as Prompt;
          return {
            ...node,
            data: {
              ...node.data,
              onEdit: () => {
                if (onOpenPromptEditor) {
                  onOpenPromptEditor(node.id, prompt.name, prompt.file_path);
                }
              },
            },
          };
        }
        if (node.type === "context" && node.data.prompt) {
          const context = node.data.prompt as Prompt;
          return {
            ...node,
            data: {
              ...node.data,
              onEdit: () => {
                if (onOpenContextEditor) {
                  onOpenContextEditor(node.id, context.name, context.file_path);
                }
              },
            },
          };
        }
        return node;
      });

      const { x = 0, y = 0, zoom = 1 } = flow.viewport;
      setNodes(updatedNodes);
      setEdges(flow.edges || []);

      // Set viewport using the instance
      if (rfInstance) {
        rfInstance.setViewport({ x, y, zoom });
      }
    }, [rfInstance, onOpenPromptEditor, onOpenContextEditor]);

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      addSequentialAgentNode,
      addParallelAgentNode,
      addLLMAgentNode,
      addLoopAgentNode,
      addAgentNode,
      addPromptNode,
      addContextNode,
      addInputProbeNode,
      addOutputProbeNode,
      addToolNode,
      addAgentToolNode,
      addVariableNode,
      updatePromptNode,
      updateContextNode,
      clearCanvas,
      saveFlow,
      restoreFlow,
    }));

    return (
      <div className="w-full h-full" style={{ background: '#f7f9fb' }}>
        <style>{`
          .react-flow__edge.selected .react-flow__edge-path,
          .react-flow__edge:focus .react-flow__edge-path,
          .react-flow__edge:focus-visible .react-flow__edge-path {
            stroke: #3b82f6 !important;
            stroke-width: 3 !important;
          }
        `}</style>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setRfInstance}
          nodeTypes={nodeTypes}
          colorMode="light"
          fitView
          attributionPosition="bottom-left"
          style={{ background: '#f7f9fb' }}
          defaultEdgeOptions={{
            style: { strokeWidth: 2.5, stroke: '#64748b' },
            animated: false,
            selectable: true,
          }}
          edgesFocusable={true}
          edgesReconnectable={false}
          connectionLineStyle={{ strokeWidth: 2.5, stroke: '#64748b' }}
        >
          <Background color="#64748b" gap={16} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case "sequentialAgent":
                  return "#ea580c"; // orange-600
                case "parallelAgent":
                  return "#0d9488"; // teal-600
                case "llmAgent":
                  return "#4f46e5"; // indigo-600
                case "loopAgent":
                  return "#db2777"; // pink-600
                case "agent":
                  return "#9333ea"; // purple-600
                case "prompt":
                  return "#16a34a"; // green-600
                case "context":
                  return "#2563eb"; // blue-600
                case "inputProbe":
                  return "#374151"; // gray-700
                case "outputProbe":
                  return "#374151"; // gray-700
                case "tool":
                  return "#0891b2"; // cyan-600
                case "agentTool":
                  return "#d97706"; // amber-600
                case "variable":
                  return "#7c3aed"; // violet-600
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
