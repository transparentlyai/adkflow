import { useEffect } from "react";

interface UseKeyboardShortcutsParams {
  isLocked?: boolean;
  handleCopy: () => void;
  handleCut: () => void;
  handlePaste: (position?: { x: number; y: number }) => void;
  handleDelete: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
  onSave?: () => void;
}

export function useKeyboardShortcuts({
  isLocked,
  handleCopy,
  handleCut,
  handlePaste,
  handleDelete,
  handleUndo,
  handleRedo,
  onSave,
}: UseKeyboardShortcutsParams) {
  // Keyboard shortcuts using direct event listener to avoid race conditions
  // Check event.target immediately when the event fires, before any React state updates
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;

      // Check if the event originated from an editable element
      // This check happens synchronously at event time, avoiding race conditions
      const isEditing = (() => {
        if (!target) return false;

        // Standard editable elements
        const tagName = target.tagName.toLowerCase();
        if (tagName === "input" || tagName === "textarea") return true;

        // Contenteditable
        if (target.getAttribute("contenteditable") === "true") return true;

        // Inside Monaco editor or nodrag container
        if (target.closest(".monaco-editor") || target.closest(".nodrag"))
          return true;

        return false;
      })();

      // If editing, let the editor/input handle the event
      if (isEditing) return;

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Save: Ctrl/Cmd+S
      if (modifier && e.key.toLowerCase() === "s") {
        e.preventDefault();
        onSave?.();
        return;
      }

      // Copy: Ctrl/Cmd+C
      if (modifier && e.key.toLowerCase() === "c" && !e.shiftKey) {
        handleCopy();
        return;
      }

      // Cut: Ctrl/Cmd+X
      if (modifier && e.key.toLowerCase() === "x" && !isLocked) {
        handleCut();
        return;
      }

      // Paste: Ctrl/Cmd+V
      if (modifier && e.key.toLowerCase() === "v" && !isLocked) {
        handlePaste();
        return;
      }

      // Undo: Ctrl/Cmd+Z (without Shift)
      if (modifier && e.key.toLowerCase() === "z" && !e.shiftKey && !isLocked) {
        handleUndo();
        return;
      }

      // Redo: Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y
      if (modifier && !isLocked) {
        if (
          (e.key.toLowerCase() === "z" && e.shiftKey) ||
          e.key.toLowerCase() === "y"
        ) {
          handleRedo();
          return;
        }
      }

      // Delete: Delete or Backspace
      if ((e.key === "Delete" || e.key === "Backspace") && !isLocked) {
        handleDelete();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isLocked,
    handleCopy,
    handleCut,
    handlePaste,
    handleDelete,
    handleUndo,
    handleRedo,
    onSave,
  ]);
}
