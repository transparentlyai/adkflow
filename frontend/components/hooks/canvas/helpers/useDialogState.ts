import { useState } from "react";

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

export function useDialogState() {
  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(
    null,
  );

  // Group delete confirmation state (for groups with children)
  const [groupDeleteConfirm, setGroupDeleteConfirm] =
    useState<GroupDeleteConfirmState | null>(null);

  // Teleporter name prompt dialog state
  const [teleportNamePrompt, setTeleportNamePrompt] =
    useState<TeleportNamePromptState | null>(null);
  const [teleportNameInput, setTeleportNameInput] = useState("");

  return {
    contextMenu,
    setContextMenu,
    deleteConfirm,
    setDeleteConfirm,
    groupDeleteConfirm,
    setGroupDeleteConfirm,
    teleportNamePrompt,
    setTeleportNamePrompt,
    teleportNameInput,
    setTeleportNameInput,
  };
}
