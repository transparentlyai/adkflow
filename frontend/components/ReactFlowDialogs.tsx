/**
 * ReactFlowDialogs - Dialog components for ReactFlowCanvas
 *
 * Renders confirmation dialogs for delete operations and teleport naming.
 */

import ConfirmDialog from "./ConfirmDialog";
import GroupDeleteDialog from "./GroupDeleteDialog";
import TeleportNameDialog from "./TeleportNameDialog";
import type {
  DeleteConfirmState,
  GroupDeleteConfirmState,
  TeleportNamePromptState,
} from "./hooks/canvas";
import type { Theme } from "@/lib/themes/types";

interface ReactFlowDialogsProps {
  deleteConfirm: DeleteConfirmState | null;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  groupDeleteConfirm: GroupDeleteConfirmState | null;
  onGroupDeleteGroupOnly: () => void;
  onGroupDeleteAll: () => void;
  onGroupDeleteCancel: () => void;
  teleportNamePrompt: TeleportNamePromptState | null;
  teleportNameInput: string;
  onTeleportNameChange: (value: string) => void;
  onTeleportNameSubmit: () => void;
  onTeleportNameCancel: () => void;
  theme: Theme;
}

export function ReactFlowDialogs({
  deleteConfirm,
  onDeleteConfirm,
  onDeleteCancel,
  groupDeleteConfirm,
  onGroupDeleteGroupOnly,
  onGroupDeleteAll,
  onGroupDeleteCancel,
  teleportNamePrompt,
  teleportNameInput,
  onTeleportNameChange,
  onTeleportNameSubmit,
  onTeleportNameCancel,
  theme,
}: ReactFlowDialogsProps) {
  return (
    <>
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Selection"
        description={deleteConfirm?.message || ""}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={onDeleteConfirm}
        onCancel={onDeleteCancel}
      />
      <GroupDeleteDialog
        isOpen={!!groupDeleteConfirm}
        groupCount={groupDeleteConfirm?.groupIds.length || 0}
        childCount={groupDeleteConfirm?.childIds.length || 0}
        onCancel={onGroupDeleteCancel}
        onDeleteGroupOnly={onGroupDeleteGroupOnly}
        onDeleteAll={onGroupDeleteAll}
      />
      {teleportNamePrompt && (
        <TeleportNameDialog
          type={teleportNamePrompt.type}
          value={teleportNameInput}
          onChange={onTeleportNameChange}
          onSubmit={onTeleportNameSubmit}
          onCancel={onTeleportNameCancel}
          theme={theme}
        />
      )}
    </>
  );
}
