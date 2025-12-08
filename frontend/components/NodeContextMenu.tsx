"use client";

import { createPortal } from "react-dom";
import { Lock, Unlock, Unlink } from "lucide-react";

interface NodeContextMenuProps {
  x: number;
  y: number;
  isLocked: boolean;
  onToggleLock: () => void;
  onClose: () => void;
  onDetach?: () => void;
}

export default function NodeContextMenu({ x, y, isLocked, onToggleLock, onClose, onDetach }: NodeContextMenuProps) {
  const adjustedX = Math.min(x, window.innerWidth - 160);
  const adjustedY = Math.min(y, window.innerHeight - 100);

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
        style={{ left: adjustedX, top: adjustedY }}
      >
        <button
          onClick={() => {
            onToggleLock();
            onClose();
          }}
          className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
        >
          <span className="mr-2 text-muted-foreground">
            {isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </span>
          {isLocked ? "Unlock Node" : "Lock Node"}
        </button>
        {onDetach && (
          <button
            onClick={() => {
              onDetach();
              onClose();
            }}
            className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
          >
            <span className="mr-2 text-muted-foreground">
              <Unlink className="h-4 w-4" />
            </span>
            Detach from Group
          </button>
        )}
      </div>
    </>,
    document.body
  );
}
