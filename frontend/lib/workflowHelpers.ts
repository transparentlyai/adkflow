/**
 * Helper functions for workflow manipulation and conversion
 * React Flow version
 */

import type { Node, Edge } from "@xyflow/react";
import type {
  Workflow,
  Agent,
  Prompt,
  WorkflowConnection,
} from "@/lib/types";

/**
 * Create an empty workflow
 */
export function createEmptyWorkflow(name: string = "Untitled Workflow"): Workflow {
  return {
    name,
    description: "",
    agents: [],
    prompts: [],
    connections: [],
    metadata: {},
  };
}

/**
 * Generate a unique ID for nodes
 */
export function generateNodeId(prefix: string = "node"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new Agent node
 */
export function createAgent(name: string = "New Agent"): Agent {
  return {
    id: generateNodeId("agent"),
    name,
    type: "sequential",
    model: "gemini-2.0-flash-exp",
    temperature: 0.7,
    tools: [],
    subagents: [],
    description: "",
  };
}

/**
 * Create a new Prompt node
 */
export function createPrompt(name: string = "New Prompt", file_path: string = ""): Prompt {
  return {
    id: generateNodeId("prompt"),
    name,
    file_path,
  };
}

/**
 * Convert React Flow data to Workflow format
 */
export function reactFlowToWorkflow(
  nodes: Node[],
  edges: Edge[],
  workflowName: string
): Workflow {
  const workflow: Workflow = {
    name: workflowName,
    version: "1.0.0",
    description: "",
    variables: {},
    prompts: [],
    agents: [],
    connections: [],
    metadata: {},
  };

  const agents: Agent[] = [];
  const prompts: Prompt[] = [];
  const connections: WorkflowConnection[] = [];

  // Extract nodes
  nodes.forEach((node) => {
    const nodeData = node.data as any; // eslint-disable-line

    if (node.type === "agent" && nodeData.agent) {
      agents.push(nodeData.agent as Agent);
    } else if (node.type === "prompt" && nodeData.prompt) {
      prompts.push(nodeData.prompt as Prompt);
    }
  });

  // Extract edges as connections
  edges.forEach((edge) => {
    const fromHandle = edge.sourceHandle || "output";
    const toHandle = edge.targetHandle || "input";
    connections.push({
      from_path: `${edge.source}.${fromHandle}`,
      to_path: `${edge.target}.${toHandle}`,
    });
  });

  workflow.agents = agents;
  workflow.prompts = prompts;
  workflow.connections = connections;

  return workflow;
}

/**
 * Convert Workflow to React Flow format
 */
export function workflowToReactFlow(workflow: Workflow): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  let agentX = 150;
  let agentY = 100;
  let promptX = 150;
  let promptY = 400;

  const spacing = 350;

  // Add agent nodes
  workflow.agents.forEach((agent) => {
    nodes.push({
      id: agent.id,
      type: "agent",
      position: { x: agentX, y: agentY },
      data: { agent },
    });
    agentX += spacing;
  });

  // Add prompt nodes
  workflow.prompts.forEach((prompt) => {
    nodes.push({
      id: prompt.id,
      type: "prompt",
      position: { x: promptX, y: promptY },
      data: {
        prompt,
        onEdit: () => {
          // This will be handled by the canvas component
          console.log("Edit prompt:", prompt.id);
        },
      },
    });
    promptX += spacing;
  });

  // Add connections as edges
  workflow.connections.forEach((connection, index) => {
    // Parse from_path and to_path (format: "nodeId.handle")
    const fromParts = connection.from_path.split(".");
    const toParts = connection.to_path.split(".");

    const sourceNode = fromParts[0];
    const targetNode = toParts[0];
    const sourceHandle = fromParts.length > 1 ? fromParts.slice(1).join(".") : undefined;
    const targetHandle = toParts.length > 1 ? toParts.slice(1).join(".") : undefined;

    edges.push({
      id: `e-${sourceNode}-${targetNode}-${index}`,
      source: sourceNode,
      target: targetNode,
      sourceHandle: sourceHandle,
      targetHandle: targetHandle,
    });
  });

  return { nodes, edges };
}

/**
 * Validate workflow before sending to backend
 */
export function validateWorkflowLocally(workflow: Workflow): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check workflow name
  if (!workflow.name || workflow.name.trim() === "") {
    errors.push("Workflow name is required");
  }

  // Check for at least one agent
  if (workflow.agents.length === 0) {
    errors.push("Workflow must contain at least one agent");
  }

  // Validate workflow agents
  workflow.agents.forEach((agent, index) => {
    if (!agent.name || agent.name.trim() === "") {
      errors.push(`Agent ${index + 1}: Name is required`);
    }
    if (!agent.id) {
      errors.push(`Agent ${index + 1}: ID is required`);
    }
  });

  // Validate prompts
  workflow.prompts.forEach((prompt, index) => {
    if (!prompt.id) {
      errors.push(`Prompt ${index + 1}: ID is required`);
    }
    if (!prompt.file_path) {
      errors.push(`Prompt ${index + 1}: File path is required`);
    }
  });

  // Validate connections
  workflow.connections.forEach((conn, index) => {
    if (!conn.from_path || !conn.to_path) {
      errors.push(`Connection ${index + 1}: Invalid connection paths`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Deep clone a workflow
 */
export function cloneWorkflow(workflow: Workflow): Workflow {
  return JSON.parse(JSON.stringify(workflow));
}

/**
 * Find a node by ID in the workflow
 */
export function findNodeById(
  workflow: Workflow,
  nodeId: string
): Agent | Prompt | null {
  // Check agents
  const agent = workflow.agents.find((a) => a.id === nodeId);
  if (agent) return agent;

  // Check prompts
  const prompt = workflow.prompts.find((p) => p.id === nodeId);
  if (prompt) return prompt;

  return null;
}

/**
 * Get node type from node ID or data
 */
export function getNodeType(nodeId: string): "group" | "agent" | "prompt" | "context" | "inputProbe" | "outputProbe" | "tool" | "agentTool" | "variable" | null {
  if (nodeId.startsWith("group_")) return "group";
  if (nodeId.startsWith("agent_")) return "agent";
  if (nodeId.startsWith("prompt_")) return "prompt";
  if (nodeId.startsWith("context_")) return "context";
  if (nodeId.startsWith("inputProbe_")) return "inputProbe";
  if (nodeId.startsWith("outputProbe_")) return "outputProbe";
  if (nodeId.startsWith("tool_")) return "tool";
  if (nodeId.startsWith("agentTool_")) return "agentTool";
  if (nodeId.startsWith("variable_")) return "variable";
  return null;
}
