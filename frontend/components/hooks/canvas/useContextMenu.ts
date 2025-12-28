import type { Node } from "@xyflow/react";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import type {
  ContextMenuState,
  TeleportNamePromptState,
} from "./useCanvasState";
import { useContextMenuEvents } from "./helpers/useContextMenuEvents";
import { useTeleportDialog } from "./helpers/useTeleportDialog";
import { useContextMenuSelect } from "./helpers/useContextMenuSelect";

interface UseContextMenuParams {
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  contextMenu: ContextMenuState | null;
  setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState | null>>;
  teleportNamePrompt: TeleportNamePromptState | null;
  setTeleportNamePrompt: React.Dispatch<
    React.SetStateAction<TeleportNamePromptState | null>
  >;
  teleportNameInput: string;
  setTeleportNameInput: React.Dispatch<React.SetStateAction<string>>;
  setMousePosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number } | null>
  >;
  isLocked?: boolean;
  // Node creation functions
  addGroupNode: (position?: { x: number; y: number }) => void;
  addLabelNode: (position?: { x: number; y: number }) => void;
  addBuiltinSchemaNode: (
    nodeType: string,
    position?: { x: number; y: number },
    configOverrides?: Record<string, unknown>,
    parentGroupId?: string,
  ) => string | null;
  addCustomNode: (
    schema: CustomNodeSchema,
    position?: { x: number; y: number },
  ) => string;
  // Creation request callbacks
  onRequestPromptCreation?: (position: { x: number; y: number }) => void;
  onRequestContextCreation?: (position: { x: number; y: number }) => void;
  onRequestToolCreation?: (position: { x: number; y: number }) => void;
  onRequestProcessCreation?: (position: { x: number; y: number }) => void;
  onRequestOutputFileCreation?: (position: { x: number; y: number }) => void;
}

export function useContextMenu({
  setNodes,
  contextMenu,
  setContextMenu,
  teleportNamePrompt,
  setTeleportNamePrompt,
  teleportNameInput,
  setTeleportNameInput,
  setMousePosition,
  isLocked,
  addGroupNode,
  addLabelNode,
  addBuiltinSchemaNode,
  addCustomNode,
  onRequestPromptCreation,
  onRequestContextCreation,
  onRequestToolCreation,
  onRequestProcessCreation,
  onRequestOutputFileCreation,
}: UseContextMenuParams) {
  // Context menu event handlers
  const {
    onPaneContextMenu,
    onNodeContextMenu,
    onSelectionContextMenu,
    onMouseMove,
    closeContextMenu,
  } = useContextMenuEvents({
    setContextMenu,
    setMousePosition,
    isLocked,
  });

  // Teleport dialog handlers
  const {
    handleTeleportNameSubmit,
    handleTeleportNameCancel,
    handleTeleportNameKeyDown,
  } = useTeleportDialog({
    teleportNamePrompt,
    teleportNameInput,
    setTeleportNamePrompt,
    setTeleportNameInput,
    addBuiltinSchemaNode,
  });

  // Context menu selection handlers
  const { addNodeWithParent, onContextMenuSelect, handleSelectCustomNode } =
    useContextMenuSelect({
      setNodes,
      contextMenu,
      setContextMenu,
      setTeleportNamePrompt,
      setTeleportNameInput,
      addGroupNode,
      addLabelNode,
      addBuiltinSchemaNode,
      addCustomNode,
      closeContextMenu,
      onRequestPromptCreation,
      onRequestContextCreation,
      onRequestToolCreation,
      onRequestProcessCreation,
      onRequestOutputFileCreation,
    });

  return {
    onPaneContextMenu,
    onNodeContextMenu,
    onSelectionContextMenu,
    onMouseMove,
    addNodeWithParent,
    onContextMenuSelect,
    closeContextMenu,
    handleTeleportNameSubmit,
    handleTeleportNameCancel,
    handleTeleportNameKeyDown,
    handleSelectCustomNode,
  };
}
