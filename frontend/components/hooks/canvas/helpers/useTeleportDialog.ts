import { useCallback } from "react";
import type { TeleportNamePromptState } from "./useDialogState";

interface UseTeleportDialogParams {
  teleportNamePrompt: TeleportNamePromptState | null;
  teleportNameInput: string;
  setTeleportNamePrompt: React.Dispatch<
    React.SetStateAction<TeleportNamePromptState | null>
  >;
  setTeleportNameInput: React.Dispatch<React.SetStateAction<string>>;
  addBuiltinSchemaNode: (
    nodeType: string,
    position?: { x: number; y: number },
    configOverrides?: Record<string, unknown>,
    parentGroupId?: string,
  ) => string | null;
}

export function useTeleportDialog({
  teleportNamePrompt,
  teleportNameInput,
  setTeleportNamePrompt,
  setTeleportNameInput,
  addBuiltinSchemaNode,
}: UseTeleportDialogParams) {
  // Handle teleporter name submission
  const handleTeleportNameSubmit = useCallback(() => {
    if (!teleportNamePrompt || !teleportNameInput.trim()) return;

    const { type, position, parentGroupId } = teleportNamePrompt;
    const name = teleportNameInput.trim();

    // Use schema-based creation with name config override
    const nodeType = type === "teleportOut" ? "teleportOut" : "teleportIn";
    addBuiltinSchemaNode(nodeType, position, { name }, parentGroupId);

    setTeleportNamePrompt(null);
    setTeleportNameInput("");
  }, [
    teleportNamePrompt,
    teleportNameInput,
    addBuiltinSchemaNode,
    setTeleportNamePrompt,
    setTeleportNameInput,
  ]);

  const handleTeleportNameCancel = useCallback(() => {
    setTeleportNamePrompt(null);
    setTeleportNameInput("");
  }, [setTeleportNamePrompt, setTeleportNameInput]);

  const handleTeleportNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleTeleportNameSubmit();
      } else if (e.key === "Escape") {
        handleTeleportNameCancel();
      }
    },
    [handleTeleportNameSubmit, handleTeleportNameCancel],
  );

  return {
    handleTeleportNameSubmit,
    handleTeleportNameCancel,
    handleTeleportNameKeyDown,
  };
}
