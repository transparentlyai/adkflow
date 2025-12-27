import { useCallback } from "react";
import type { Node, ReactFlowInstance } from "@xyflow/react";
import { generateNodeId } from "@/lib/workflowHelpers";
import { builtinTypeToSchema } from "@/lib/builtinNodeHelpers";
import type { Agent, Prompt } from "@/lib/types";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import { getDefaultCustomNodeData } from "@/components/nodes/CustomNode";
import { getDefaultGroupData } from "@/components/nodes/GroupNode";
import { getDefaultAgentData } from "@/components/nodes/AgentNode";
import { getDefaultPromptData } from "@/components/nodes/PromptNode";
import { getDefaultContextData } from "@/components/nodes/ContextNode";
import { getDefaultInputProbeData } from "@/components/nodes/InputProbeNode";
import { getDefaultOutputProbeData } from "@/components/nodes/OutputProbeNode";
import { getDefaultLogProbeData } from "@/components/nodes/LogProbeNode";
import { getDefaultOutputFileData } from "@/components/nodes/OutputFileNode";
import { getDefaultToolData } from "@/components/nodes/ToolNode";
import { getDefaultAgentToolData } from "@/components/nodes/AgentToolNode";
import { getDefaultVariableData } from "@/components/nodes/VariableNode";
import { getDefaultProcessData } from "@/components/nodes/ProcessNode";
import { getDefaultLabelData } from "@/components/nodes/LabelNode";
import { getDefaultTeleportOutData } from "@/components/nodes/TeleportOutNode";
import { getDefaultTeleportInData } from "@/components/nodes/TeleportInNode";
import { getDefaultUserInputData } from "@/components/nodes/UserInputNode";
import { getDefaultStartData } from "@/components/nodes/StartNode";
import { getDefaultEndData } from "@/components/nodes/EndNode";

const SPACING = 350;

interface UseNodeCreationParams {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  rfInstance: ReactFlowInstance | null;
  // Position state and setters
  groupPosition: { x: number; y: number };
  setGroupPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  agentPosition: { x: number; y: number };
  setAgentPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  promptPosition: { x: number; y: number };
  setPromptPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  contextPosition: { x: number; y: number };
  setContextPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  inputProbePosition: { x: number; y: number };
  setInputProbePosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  outputProbePosition: { x: number; y: number };
  setOutputProbePosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  logProbePosition: { x: number; y: number };
  setLogProbePosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  outputFilePosition: { x: number; y: number };
  setOutputFilePosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  toolPosition: { x: number; y: number };
  setToolPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  agentToolPosition: { x: number; y: number };
  setAgentToolPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  variablePosition: { x: number; y: number };
  setVariablePosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  processPosition: { x: number; y: number };
  setProcessPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  labelPosition: { x: number; y: number };
  setLabelPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  teleportOutPosition: { x: number; y: number };
  setTeleportOutPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  teleportInPosition: { x: number; y: number };
  setTeleportInPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  userInputPosition: { x: number; y: number };
  setUserInputPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
}

export function useNodeCreation({
  nodes,
  setNodes,
  rfInstance,
  groupPosition,
  setGroupPosition,
  agentPosition,
  setAgentPosition,
  promptPosition,
  setPromptPosition,
  contextPosition,
  setContextPosition,
  inputProbePosition,
  setInputProbePosition,
  outputProbePosition,
  setOutputProbePosition,
  logProbePosition,
  setLogProbePosition,
  outputFilePosition,
  setOutputFilePosition,
  toolPosition,
  setToolPosition,
  agentToolPosition,
  setAgentToolPosition,
  variablePosition,
  setVariablePosition,
  processPosition,
  setProcessPosition,
  labelPosition,
  setLabelPosition,
  teleportOutPosition,
  setTeleportOutPosition,
  teleportInPosition,
  setTeleportInPosition,
  userInputPosition,
  setUserInputPosition,
}: UseNodeCreationParams) {
  /**
   * Get the center of the current viewport in flow coordinates
   */
  const getViewportCenter = useCallback(() => {
    if (!rfInstance) {
      return { x: 400, y: 300 };
    }
    const { x, y, zoom } = rfInstance.getViewport();
    // Get the dimensions of the React Flow container
    const domNode = document.querySelector(".react-flow");
    if (!domNode) {
      return { x: 400, y: 300 };
    }
    const { width, height } = domNode.getBoundingClientRect();
    // Calculate center in flow coordinates
    const centerX = (-x + width / 2) / zoom;
    const centerY = (-y + height / 2) / zoom;
    return { x: centerX, y: centerY };
  }, [rfInstance]);

  const addGroupNode = useCallback(
    (position?: { x: number; y: number }) => {
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
        setGroupPosition((pos) => ({ ...pos, x: pos.x + SPACING }));
      }
    },
    [groupPosition, setNodes, setGroupPosition],
  );

  /**
   * Add an Agent node to the canvas
   */
  const addAgentNode = useCallback(
    (position?: { x: number; y: number }) => {
      const agentId = generateNodeId("agent");
      const defaultData = getDefaultAgentData();
      const agent: Agent = {
        id: agentId,
        ...defaultData,
      };

      const newNode: Node = {
        id: agentId,
        type: "agent",
        position: position || agentPosition,
        data: { agent, handleTypes: defaultData.handleTypes },
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setAgentPosition((pos) => ({ ...pos, x: pos.x + SPACING }));
      }
    },
    [agentPosition, setNodes, setAgentPosition],
  );

  /**
   * Add a Prompt node to the canvas
   */
  const addPromptNode = useCallback(
    (
      promptData?: { name: string; file_path: string },
      position?: { x: number; y: number },
    ) => {
      const promptId = generateNodeId("prompt");
      const defaultData = getDefaultPromptData();
      const prompt: Prompt = {
        id: promptId,
        ...(promptData || defaultData),
      };

      const newNode: Node = {
        id: promptId,
        type: "prompt",
        position: position || promptPosition,
        data: {
          prompt,
          content: "",
          handleTypes: defaultData.handleTypes,
        },
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setPromptPosition((pos) => ({ ...pos, x: pos.x + SPACING }));
      }
    },
    [promptPosition, setNodes, setPromptPosition],
  );

  /**
   * Add a Context node to the canvas
   */
  const addContextNode = useCallback(
    (
      contextData?: { name: string; file_path: string },
      position?: { x: number; y: number },
    ) => {
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
        setContextPosition((pos) => ({ ...pos, x: pos.x + SPACING }));
      }
    },
    [contextPosition, setNodes, setContextPosition],
  );

  /**
   * Add an Input Probe node to the canvas
   */
  const addInputProbeNode = useCallback(
    (position?: { x: number; y: number }) => {
      const inputProbeId = generateNodeId("inputProbe");

      const newNode: Node = {
        id: inputProbeId,
        type: "inputProbe",
        position: position || inputProbePosition,
        data: getDefaultInputProbeData(),
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setInputProbePosition((pos) => ({ ...pos, x: pos.x + SPACING }));
      }
    },
    [inputProbePosition, setNodes, setInputProbePosition],
  );

  /**
   * Add an Output Probe node to the canvas
   */
  const addOutputProbeNode = useCallback(
    (position?: { x: number; y: number }) => {
      const outputProbeId = generateNodeId("outputProbe");

      const newNode: Node = {
        id: outputProbeId,
        type: "outputProbe",
        position: position || outputProbePosition,
        data: getDefaultOutputProbeData(),
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setOutputProbePosition((pos) => ({ ...pos, x: pos.x + SPACING }));
      }
    },
    [outputProbePosition, setNodes, setOutputProbePosition],
  );

  /**
   * Add a Log Probe node to the canvas
   */
  const addLogProbeNode = useCallback(
    (position?: { x: number; y: number }) => {
      const logProbeId = generateNodeId("logProbe");

      const newNode: Node = {
        id: logProbeId,
        type: "logProbe",
        position: position || logProbePosition,
        data: getDefaultLogProbeData(),
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setLogProbePosition((pos) => ({ ...pos, x: pos.x + SPACING }));
      }
    },
    [logProbePosition, setNodes, setLogProbePosition],
  );

  /**
   * Add an OutputFile node to the canvas
   */
  const addOutputFileNode = useCallback(
    (
      outputFileData?: { name: string; file_path: string },
      position?: { x: number; y: number },
    ) => {
      const outputFileId = generateNodeId("outputFile");

      const newNode: Node = {
        id: outputFileId,
        type: "outputFile",
        position: position || outputFilePosition,
        data: outputFileData
          ? {
              ...getDefaultOutputFileData(),
              name: outputFileData.name,
              file_path: outputFileData.file_path,
            }
          : getDefaultOutputFileData(),
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setOutputFilePosition((pos) => ({ ...pos, x: pos.x + SPACING }));
      }
    },
    [outputFilePosition, setNodes, setOutputFilePosition],
  );

  /**
   * Add a Tool node to the canvas
   */
  const addToolNode = useCallback(
    (
      toolData?: { name: string; file_path: string },
      position?: { x: number; y: number },
    ) => {
      const toolId = generateNodeId("tool");

      const newNode: Node = {
        id: toolId,
        type: "tool",
        position: position || toolPosition,
        data: toolData
          ? {
              ...getDefaultToolData(),
              name: toolData.name,
              file_path: toolData.file_path,
            }
          : getDefaultToolData(),
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setToolPosition((pos) => ({ ...pos, x: pos.x + SPACING }));
      }
    },
    [toolPosition, setNodes, setToolPosition],
  );

  /**
   * Add an Agent Tool node to the canvas
   */
  const addAgentToolNode = useCallback(
    (position?: { x: number; y: number }) => {
      const agentToolId = generateNodeId("agentTool");

      const newNode: Node = {
        id: agentToolId,
        type: "agentTool",
        position: position || agentToolPosition,
        data: getDefaultAgentToolData(),
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setAgentToolPosition((pos) => ({ ...pos, x: pos.x + SPACING }));
      }
    },
    [agentToolPosition, setNodes, setAgentToolPosition],
  );

  /**
   * Add a Variable node to the canvas
   */
  const addVariableNode = useCallback(
    (position?: { x: number; y: number }) => {
      const variableId = generateNodeId("variable");

      const newNode: Node = {
        id: variableId,
        type: "variable",
        position: position || variablePosition,
        data: getDefaultVariableData(),
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setVariablePosition((pos) => ({ ...pos, x: pos.x + SPACING }));
      }
    },
    [variablePosition, setNodes, setVariablePosition],
  );

  /**
   * Add a Process node to the canvas
   */
  const addProcessNode = useCallback(
    (
      processData?: { name: string; file_path: string },
      position?: { x: number; y: number },
    ) => {
      const processId = generateNodeId("process");

      const newNode: Node = {
        id: processId,
        type: "process",
        position: position || processPosition,
        data: processData
          ? {
              ...getDefaultProcessData(),
              name: processData.name,
              file_path: processData.file_path,
            }
          : getDefaultProcessData(),
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setProcessPosition((pos) => ({ ...pos, x: pos.x + SPACING }));
      }
    },
    [processPosition, setNodes, setProcessPosition],
  );

  /**
   * Add a Label node to the canvas
   */
  const addLabelNode = useCallback(
    (position?: { x: number; y: number }) => {
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
        setLabelPosition((pos) => ({ ...pos, x: pos.x + SPACING }));
      }
    },
    [labelPosition, setNodes, setLabelPosition],
  );

  /**
   * Add a TeleportOut node to the canvas
   */
  const addTeleportOutNode = useCallback(
    (name: string, position?: { x: number; y: number }) => {
      const teleportId = generateNodeId("teleportOut");

      const newNode: Node = {
        id: teleportId,
        type: "teleportOut",
        position: position || teleportOutPosition,
        data: { ...getDefaultTeleportOutData(), name },
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setTeleportOutPosition((pos) => ({ ...pos, x: pos.x + SPACING }));
      }
    },
    [teleportOutPosition, setNodes, setTeleportOutPosition],
  );

  /**
   * Add a TeleportIn node to the canvas
   */
  const addTeleportInNode = useCallback(
    (name: string, position?: { x: number; y: number }) => {
      const teleportId = generateNodeId("teleportIn");

      const newNode: Node = {
        id: teleportId,
        type: "teleportIn",
        position: position || teleportInPosition,
        data: { ...getDefaultTeleportInData(), name },
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setTeleportInPosition((pos) => ({ ...pos, x: pos.x + SPACING }));
      }
    },
    [teleportInPosition, setNodes, setTeleportInPosition],
  );

  /**
   * Add a User Input node to the canvas
   */
  const addUserInputNode = useCallback(
    (position?: { x: number; y: number }) => {
      const userInputId = generateNodeId("userInput");

      const newNode: Node = {
        id: userInputId,
        type: "userInput",
        position: position || userInputPosition,
        data: getDefaultUserInputData(),
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setUserInputPosition((pos) => ({ ...pos, x: pos.x + SPACING }));
      }
    },
    [userInputPosition, setNodes, setUserInputPosition],
  );

  /**
   * Add a Start node to the canvas (only one allowed)
   */
  const addStartNode = useCallback(
    (position?: { x: number; y: number }) => {
      // Check if start node already exists
      const hasStart = nodes.some((n) => n.type === "start");
      if (hasStart) return;

      const startId = generateNodeId("start");
      const newNode: Node = {
        id: startId,
        type: "start",
        position: position || { x: 100, y: 200 },
        data: getDefaultStartData(),
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [nodes, setNodes],
  );

  /**
   * Add an End node to the canvas
   */
  const addEndNode = useCallback(
    (position?: { x: number; y: number }) => {
      const endId = generateNodeId("end");
      const newNode: Node = {
        id: endId,
        type: "end",
        position: position || { x: 400, y: 200 },
        data: getDefaultEndData(),
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes],
  );

  /**
   * Add a custom node to the canvas
   */
  const addCustomNode = useCallback(
    (schema: CustomNodeSchema, position?: { x: number; y: number }) => {
      const id = `custom_${schema.unit_id}_${Date.now()}`;
      const pos = position || getViewportCenter();

      const newNode: Node = {
        id,
        type: `custom:${schema.unit_id}`,
        position: pos,
        data: getDefaultCustomNodeData(schema) as unknown as Record<
          string,
          unknown
        >,
      };

      setNodes((nodes) => [...nodes, newNode]);
      return id;
    },
    [setNodes, getViewportCenter],
  );

  /**
   * Add a built-in schema-driven node to the canvas.
   * This is the new unified way to create built-in nodes using the schema architecture.
   *
   * @param nodeType - The built-in node type (e.g., "agent", "variable", "prompt")
   * @param position - Optional position on the canvas
   * @param configOverrides - Optional field values to override schema defaults
   * @param parentGroupId - Optional parent group ID to nest the node inside
   */
  const addBuiltinSchemaNode = useCallback(
    (
      nodeType: string,
      position?: { x: number; y: number },
      configOverrides?: Record<string, unknown>,
      parentGroupId?: string,
    ) => {
      const schema = builtinTypeToSchema[nodeType];
      if (!schema) {
        console.error(`Unknown built-in node type: ${nodeType}`);
        return null;
      }

      const id = generateNodeId(nodeType);
      const pos = position || getViewportCenter();
      const defaultData = getDefaultCustomNodeData(schema);

      // Apply any config overrides
      if (configOverrides) {
        Object.assign(defaultData.config, configOverrides);
      }

      const newNode: Node = {
        id,
        type: nodeType,
        position: pos,
        data: defaultData as unknown as Record<string, unknown>,
        // Add parent group relationship if specified
        ...(parentGroupId && {
          parentId: parentGroupId,
          extent: "parent" as const,
        }),
      };

      setNodes((nds) => {
        // If parented, ensure proper ordering (parent before children)
        if (parentGroupId) {
          const parentIndex = nds.findIndex((n) => n.id === parentGroupId);
          if (parentIndex !== -1) {
            return [
              ...nds.slice(0, parentIndex + 1),
              newNode,
              ...nds.slice(parentIndex + 1),
            ];
          }
        }
        return [...nds, newNode];
      });
      return id;
    },
    [setNodes, getViewportCenter],
  );

  return {
    getViewportCenter,
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
    addLabelNode,
    addTeleportOutNode,
    addTeleportInNode,
    addUserInputNode,
    addStartNode,
    addEndNode,
    addCustomNode,
    addBuiltinSchemaNode,
  };
}
