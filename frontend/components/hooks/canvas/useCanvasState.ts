import { useState, useRef } from "react";
import type { Node, Edge, ReactFlowInstance } from "@xyflow/react";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

export interface ContextMenuState {
  x: number;
  y: number;
  flowPosition: { x: number; y: number };
  parentGroupId?: string;
}

export interface DeleteConfirmState {
  nodeIds: string[];
  edgeIds: string[];
  message: string;
}

export interface GroupDeleteConfirmState {
  groupIds: string[];
  childIds: string[];
  otherNodeIds: string[];
  edgeIds: string[];
}

export interface TeleportNamePromptState {
  type: "teleportOut" | "teleportIn";
  position: { x: number; y: number };
  parentGroupId?: string;
}

export interface NodePositions {
  group: { x: number; y: number };
  agent: { x: number; y: number };
  prompt: { x: number; y: number };
  context: { x: number; y: number };
  inputProbe: { x: number; y: number };
  outputProbe: { x: number; y: number };
  logProbe: { x: number; y: number };
  outputFile: { x: number; y: number };
  tool: { x: number; y: number };
  agentTool: { x: number; y: number };
  variable: { x: number; y: number };
  process: { x: number; y: number };
  label: { x: number; y: number };
  teleportOut: { x: number; y: number };
  teleportIn: { x: number; y: number };
  userInput: { x: number; y: number };
}

const INITIAL_POSITIONS: NodePositions = {
  group: { x: 150, y: 100 },
  agent: { x: 150, y: 150 },
  prompt: { x: 150, y: 350 },
  context: { x: 150, y: 400 },
  inputProbe: { x: 150, y: 450 },
  outputProbe: { x: 150, y: 500 },
  logProbe: { x: 150, y: 550 },
  outputFile: { x: 150, y: 600 },
  tool: { x: 150, y: 650 },
  agentTool: { x: 150, y: 600 },
  variable: { x: 150, y: 650 },
  process: { x: 150, y: 700 },
  label: { x: 150, y: 750 },
  teleportOut: { x: 150, y: 800 },
  teleportIn: { x: 150, y: 850 },
  userInput: { x: 150, y: 900 },
};

export function useCanvasState() {
  // Core React Flow state
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [customNodeSchemas, setCustomNodeSchemas] = useState<
    CustomNodeSchema[]
  >([]);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(
    null,
  );

  // Group delete confirmation state (for groups with children)
  const [groupDeleteConfirm, setGroupDeleteConfirm] =
    useState<GroupDeleteConfirmState | null>(null);

  // Track mouse position for paste at cursor
  const [mousePosition, setMousePosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(false);

  // Teleporter name prompt dialog state
  const [teleportNamePrompt, setTeleportNamePrompt] =
    useState<TeleportNamePromptState | null>(null);
  const [teleportNameInput, setTeleportNameInput] = useState("");

  // Undo/redo history refs
  const undoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const redoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const maxHistorySize = 50;

  // Track previous content to avoid dirty state on selection changes
  const prevContentRef = useRef<string>("");

  // Track current duplicate error nodes (id -> message) to avoid unnecessary re-renders
  const duplicateErrorNodesRef = useRef<Map<string, string>>(new Map());

  // Node position tracking for new nodes
  const [groupPosition, setGroupPosition] = useState(INITIAL_POSITIONS.group);
  const [agentPosition, setAgentPosition] = useState(INITIAL_POSITIONS.agent);
  const [promptPosition, setPromptPosition] = useState(
    INITIAL_POSITIONS.prompt,
  );
  const [contextPosition, setContextPosition] = useState(
    INITIAL_POSITIONS.context,
  );
  const [inputProbePosition, setInputProbePosition] = useState(
    INITIAL_POSITIONS.inputProbe,
  );
  const [outputProbePosition, setOutputProbePosition] = useState(
    INITIAL_POSITIONS.outputProbe,
  );
  const [logProbePosition, setLogProbePosition] = useState(
    INITIAL_POSITIONS.logProbe,
  );
  const [outputFilePosition, setOutputFilePosition] = useState(
    INITIAL_POSITIONS.outputFile,
  );
  const [toolPosition, setToolPosition] = useState(INITIAL_POSITIONS.tool);
  const [agentToolPosition, setAgentToolPosition] = useState(
    INITIAL_POSITIONS.agentTool,
  );
  const [variablePosition, setVariablePosition] = useState(
    INITIAL_POSITIONS.variable,
  );
  const [processPosition, setProcessPosition] = useState(
    INITIAL_POSITIONS.process,
  );
  const [labelPosition, setLabelPosition] = useState(INITIAL_POSITIONS.label);
  const [teleportOutPosition, setTeleportOutPosition] = useState(
    INITIAL_POSITIONS.teleportOut,
  );
  const [teleportInPosition, setTeleportInPosition] = useState(
    INITIAL_POSITIONS.teleportIn,
  );
  const [userInputPosition, setUserInputPosition] = useState(
    INITIAL_POSITIONS.userInput,
  );

  const resetPositions = () => {
    setGroupPosition(INITIAL_POSITIONS.group);
    setAgentPosition(INITIAL_POSITIONS.agent);
    setPromptPosition(INITIAL_POSITIONS.prompt);
    setContextPosition(INITIAL_POSITIONS.context);
    setInputProbePosition(INITIAL_POSITIONS.inputProbe);
    setOutputProbePosition(INITIAL_POSITIONS.outputProbe);
    setLogProbePosition(INITIAL_POSITIONS.logProbe);
    setOutputFilePosition(INITIAL_POSITIONS.outputFile);
    setToolPosition(INITIAL_POSITIONS.tool);
    setAgentToolPosition(INITIAL_POSITIONS.agentTool);
    setVariablePosition(INITIAL_POSITIONS.variable);
    setProcessPosition(INITIAL_POSITIONS.process);
    setLabelPosition(INITIAL_POSITIONS.label);
    setTeleportOutPosition(INITIAL_POSITIONS.teleportOut);
    setTeleportInPosition(INITIAL_POSITIONS.teleportIn);
    setUserInputPosition(INITIAL_POSITIONS.userInput);
  };

  return {
    // Core state
    nodes,
    setNodes,
    edges,
    setEdges,
    rfInstance,
    setRfInstance,
    customNodeSchemas,
    setCustomNodeSchemas,

    // Context menu
    contextMenu,
    setContextMenu,

    // Delete confirmation
    deleteConfirm,
    setDeleteConfirm,
    groupDeleteConfirm,
    setGroupDeleteConfirm,

    // Mouse and grid
    mousePosition,
    setMousePosition,
    snapToGrid,
    setSnapToGrid,

    // Teleporter dialog
    teleportNamePrompt,
    setTeleportNamePrompt,
    teleportNameInput,
    setTeleportNameInput,

    // History refs
    undoStackRef,
    redoStackRef,
    maxHistorySize,
    prevContentRef,
    duplicateErrorNodesRef,

    // Position state
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
    resetPositions,
  };
}
