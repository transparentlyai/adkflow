"use client";

import { createPortal } from "react-dom";
import { Settings, Unlink } from "lucide-react";

interface LabelNodeContextMenuProps {
  position: { x: number; y: number };
  parentId: string | undefined;
  onClose: () => void;
  onSettings: () => void;
  onDetach: () => void;
}

/**
 * Context menu for LabelNode with settings and detach options.
 * Rendered via portal to ensure proper z-index stacking.
 */
export default function LabelNodeContextMenu({
  position,
  parentId,
  onClose,
  onSettings,
  onDetach,
}: LabelNodeContextMenuProps) {
  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className="fixed z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
        style={{
          left: Math.min(position.x, window.innerWidth - 160),
          top: Math.min(position.y, window.innerHeight - 100),
        }}
      >
        <button
          onClick={() => {
            onSettings();
            onClose();
          }}
          className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
        >
          <span className="mr-2 text-muted-foreground">
            <Settings className="h-4 w-4" />
          </span>
          Settings
        </button>
        {parentId && (
          <button
            onClick={() => {
              onDetach();
              onClose();
            }}
            className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
          >
            <span className="mr-2 text-muted-foreground">
              <Unlink className="h-4 w-4" />
            </span>
            Detach from Group
          </button>
        )}
      </div>
    </>,
    document.body,
  );
}
