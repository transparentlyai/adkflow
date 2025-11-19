"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import Drawflow from "drawflow";
import "drawflow/dist/drawflow.min.css";
import { PromptData } from "@/components/PromptEditorModal";
import { getAgentNodeHTML, getDefaultAgentData } from "@/components/nodes/AgentNode";
import { getSubagentNodeHTML, getDefaultSubagentData } from "@/components/nodes/SubagentNode";
import { getPromptNodeHTML, getDefaultPromptData } from "@/components/nodes/PromptNode";
import { generateNodeId } from "@/lib/workflowHelpers";
import type { Agent, Subagent, Prompt, NodeData, Workflow } from "@/lib/types";

interface DrawflowCanvasProps {
  onWorkflowChange?: (workflow: any) => void;
  onOpenPromptEditor?: (promptData: PromptData) => void;
}

export interface DrawflowCanvasRef {
  addAgentNode: () => void;
  addSubagentNode: () => void;
  addPromptNode: () => void;
  clearCanvas: () => void;
  exportToWorkflow: () => any;
  importFromWorkflow: (workflow: Workflow) => void;
  getDrawflowData: () => any;
}

/**
 * DrawflowCanvas Component
 *
 * Integrates the Drawflow library to provide a visual node-based workflow editor.
 * Supports Agent, Subagent, and Prompt node types with connections.
 */
const DrawflowCanvas = forwardRef<DrawflowCanvasRef, DrawflowCanvasProps>(
  ({ onWorkflowChange, onOpenPromptEditor }, ref) => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const drawflowRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Expose methods to parent components
    useImperativeHandle(ref, () => ({
      addAgentNode,
      addSubagentNode,
      addPromptNode,
      clearCanvas,
      exportToWorkflow,
      importFromWorkflow,
      getDrawflowData: () => drawflowRef.current?.export(),
    }));

    /**
     * Initialize Drawflow
     */
    useEffect(() => {
      if (canvasRef.current && !drawflowRef.current) {
        const id = canvasRef.current;
        const editor = new Drawflow(id);

        editor.reroute = true;
        editor.reroute_fix_curvature = true;
        editor.force_first_input = false;
        editor.editor_mode = "edit";

        editor.start();

        // Add custom styles
        addCustomStyles();

        // Store reference
        drawflowRef.current = editor;

        // Set up global window function for prompt editing
        if (typeof window !== 'undefined') {
          (window as any).editPrompt = (promptId: string) => {
            handleEditPrompt(promptId);
          };
        }

        console.log("Drawflow initialized successfully");

        // Set up event listeners
        editor.on("nodeCreated", (id: number) => {
          console.log("Node created:", id);
          notifyWorkflowChange();
        });

        editor.on("nodeRemoved", (id: number) => {
          console.log("Node removed:", id);
          notifyWorkflowChange();
        });

        editor.on("connectionCreated", (connection: any) => {
          console.log("Connection created:", connection);
          notifyWorkflowChange();
        });

        editor.on("connectionRemoved", (connection: any) => {
          console.log("Connection removed:", connection);
          notifyWorkflowChange();
        });

        // Handle double-click on nodes for editing
        editor.on("nodeSelected", (nodeId: number) => {
          console.log("Node selected:", nodeId);
        });
      }

      return () => {
        // Cleanup on unmount
        if (drawflowRef.current) {
          drawflowRef.current.clear();
          drawflowRef.current = null;
        }
        // Clean up global function
        if (typeof window !== 'undefined') {
          delete (window as any).editPrompt;
        }
      };
    }, []);

    /**
     * Handle edit prompt button click
     */
    const handleEditPrompt = (promptId: string) => {
      if (!drawflowRef.current || !onOpenPromptEditor) return;

      const exportData = drawflowRef.current.export();
      const nodes = exportData.drawflow.Home.data;

      // Find the prompt node
      for (const nodeId in nodes) {
        const node = nodes[nodeId];
        if (node.data && node.data.id === promptId && node.data.type === 'prompt') {
          const promptData: PromptData = {
            id: promptId,
            content: node.data.text || '',
            variables: []
          };
          onOpenPromptEditor(promptData);
          break;
        }
      }
    };

    /**
     * Add custom styles for nodes
     */
    const addCustomStyles = () => {
      if (typeof document === "undefined") return;

      const styleId = "drawflow-custom-styles";
      if (document.getElementById(styleId)) return;

      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .drawflow .drawflow-node {
          background: transparent;
          border: none;
          box-shadow: none;
          padding: 0;
        }

        .drawflow .drawflow-node.selected {
          box-shadow: 0 0 0 2px #4299e1;
        }

        .agent-node, .subagent-node, .prompt-node {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          min-width: 250px;
          max-width: 300px;
        }

        .node-header {
          color: white;
          padding: 12px;
          border-radius: 8px 8px 0 0;
          font-weight: 600;
        }

        .node-title {
          font-size: 16px;
          margin-bottom: 2px;
        }

        .node-subtitle {
          font-size: 12px;
          opacity: 0.9;
        }

        .node-body {
          padding: 12px;
          font-size: 13px;
        }

        .node-field {
          margin-bottom: 8px;
        }

        .node-field:last-child {
          margin-bottom: 0;
        }

        .field-label {
          font-weight: 600;
          color: #4a5568;
          margin-right: 4px;
        }

        .field-value {
          color: #2d3748;
        }

        .field-description {
          color: #4a5568;
          font-size: 12px;
          margin-top: 4px;
          line-height: 1.4;
        }

        .node-id {
          padding: 8px 12px;
          background: #f7fafc;
          border-top: 1px solid #e2e8f0;
          font-size: 11px;
          color: #718096;
          font-family: monospace;
          border-radius: 0 0 8px 8px;
        }

        .edit-prompt-btn {
          background: #48bb78;
          color: white;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          border: none;
          width: 100%;
          transition: background 0.2s;
        }

        .edit-prompt-btn:hover {
          background: #38a169;
        }

        .drawflow .drawflow-node .input {
          left: -10px;
          background: #4299e1;
          border: 2px solid white;
        }

        .drawflow .drawflow-node .output {
          right: -10px;
          background: #48bb78;
          border: 2px solid white;
        }

        .drawflow .connection .main-path {
          stroke: #4299e1;
          stroke-width: 3px;
        }

        .drawflow .connection .main-path:hover {
          stroke: #2b6cb0;
          stroke-width: 4px;
        }

        .drawflow-delete {
          background: #f56565 !important;
          color: white !important;
          border: none !important;
        }

        .truncate {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `;
      document.head.appendChild(style);
    };

    /**
     * Add an Agent node to the canvas
     */
    const addAgentNode = () => {
      if (!drawflowRef.current) return;

      const agentData: Agent = {
        id: generateNodeId("agent"),
        ...getDefaultAgentData(),
      } as Agent;

      const html = getAgentNodeHTML(agentData);

      const nodeData: NodeData = {
        type: "agent",
        ...agentData,
      };

      const nodeId = drawflowRef.current.addNode(
        "agent",
        1, // inputs
        1, // outputs
        150,
        100,
        "agent-node",
        nodeData,
        html
      );

      console.log("Added agent node:", nodeId, agentData);
    };

    /**
     * Add a Subagent node to the canvas
     */
    const addSubagentNode = () => {
      if (!drawflowRef.current) return;

      const subagentData: Subagent = {
        id: generateNodeId("subagent"),
        ...getDefaultSubagentData(),
      } as Subagent;

      const html = getSubagentNodeHTML(subagentData);

      const nodeData: NodeData = {
        type: "subagent",
        ...subagentData,
      };

      const nodeId = drawflowRef.current.addNode(
        "subagent",
        1, // inputs
        1, // outputs
        150,
        250,
        "subagent-node",
        nodeData,
        html
      );

      console.log("Added subagent node:", nodeId, subagentData);
    };

    /**
     * Add a Prompt node to the canvas
     */
    const addPromptNode = () => {
      if (!drawflowRef.current) return;

      const promptData: Prompt = {
        id: generateNodeId("prompt"),
        ...getDefaultPromptData(),
      } as Prompt;

      const html = getPromptNodeHTML(promptData);

      const nodeData: NodeData = {
        type: "prompt",
        ...promptData,
      };

      const nodeId = drawflowRef.current.addNode(
        "prompt",
        0, // inputs (prompts don't have inputs)
        1, // outputs
        150,
        400,
        "prompt-node",
        nodeData,
        html
      );

      console.log("Added prompt node:", nodeId, promptData);
    };

    /**
     * Clear the canvas
     */
    const clearCanvas = () => {
      if (!drawflowRef.current) return;
      drawflowRef.current.clear();
      console.log("Canvas cleared");
      notifyWorkflowChange();
    };

    /**
     * Export Drawflow data
     */
    const exportToWorkflow = () => {
      if (!drawflowRef.current) return null;
      return drawflowRef.current.export();
    };

    /**
     * Import workflow to Drawflow
     */
    const importFromWorkflow = (workflow: Workflow) => {
      if (!drawflowRef.current) return;

      // Clear existing canvas
      drawflowRef.current.clear();

      // This will be implemented in workflowHelpers
      console.log("Import workflow:", workflow);
      notifyWorkflowChange();
    };

    /**
     * Notify parent of workflow changes
     */
    const notifyWorkflowChange = () => {
      if (onWorkflowChange && drawflowRef.current) {
        const data = drawflowRef.current.export();
        onWorkflowChange(data);
      }
    };

    /**
     * Zoom controls
     */
    const zoomIn = () => {
      if (!drawflowRef.current) return;
      drawflowRef.current.zoom_in();
    };

    const zoomOut = () => {
      if (!drawflowRef.current) return;
      drawflowRef.current.zoom_out();
    };

    const zoomReset = () => {
      if (!drawflowRef.current) return;
      drawflowRef.current.zoom_reset();
    };

    return (
      <div className="w-full h-full relative" ref={containerRef}>
        {/* Drawflow container */}
        <div
          ref={canvasRef}
          id="drawflow"
          className="w-full h-full bg-gray-50"
        />

        {/* Zoom controls */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button
            onClick={zoomIn}
            className="px-3 py-2 bg-white border border-gray-300 rounded shadow hover:bg-gray-50 transition-colors"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={zoomOut}
            className="px-3 py-2 bg-white border border-gray-300 rounded shadow hover:bg-gray-50 transition-colors"
            title="Zoom Out"
          >
            -
          </button>
          <button
            onClick={zoomReset}
            className="px-3 py-2 bg-white border border-gray-300 rounded shadow hover:bg-gray-50 transition-colors"
            title="Reset Zoom"
          >
            100%
          </button>
        </div>
      </div>
    );
  }
);

DrawflowCanvas.displayName = "DrawflowCanvas";

export default DrawflowCanvas;
