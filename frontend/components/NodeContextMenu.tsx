"use client";

import { createPortal } from "react-dom";
import { Lock, Unlock, Unlink, Copy, Scissors, Clipboard } from "lucide-react";
import { formatShortcut } from "@/lib/utils";

interface NodeContextMenuProps {
  x: number;
  y: number;
  isLocked: boolean;
  onToggleLock: () => void;
  onClose: () => void;
  onDetach?: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  hasClipboard?: boolean;
  isCanvasLocked?: boolean;
}

export default function NodeContextMenu({
  x,
  y,
  isLocked,
  onToggleLock,
  onClose,
  onDetach,
  onCopy,
  onCut,
  onPaste,
  hasClipboard,
  isCanvasLocked,
}: NodeContextMenuProps) {
  const adjustedX = Math.min(x, window.innerWidth - 160);
  const adjustedY = Math.min(y, window.innerHeight - 200);

  const menuItemClass =
    "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground";
  const disabledClass =
    "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none opacity-50";

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
        {onCopy && (
          <button
            onClick={() => {
              onCopy();
              onClose();
            }}
            className={menuItemClass}
          >
            <span className="mr-2 text-muted-foreground">
              <Copy className="h-4 w-4" />
            </span>
            Copy
            <span className="ml-auto text-xs text-muted-foreground">{formatShortcut("C")}</span>
          </button>
        )}
        {onCut && (
          <button
            onClick={() => {
              if (!isCanvasLocked && !isLocked) {
                onCut();
                onClose();
              }
            }}
            className={isCanvasLocked || isLocked ? disabledClass : menuItemClass}
          >
            <span className="mr-2 text-muted-foreground">
              <Scissors className="h-4 w-4" />
            </span>
            Cut
            <span className="ml-auto text-xs text-muted-foreground">{formatShortcut("X")}</span>
          </button>
        )}
        {onPaste && (
          <button
            onClick={() => {
              if (!isCanvasLocked && hasClipboard) {
                onPaste();
                onClose();
              }
            }}
            className={isCanvasLocked || !hasClipboard ? disabledClass : menuItemClass}
          >
            <span className="mr-2 text-muted-foreground">
              <Clipboard className="h-4 w-4" />
            </span>
            Paste
            <span className="ml-auto text-xs text-muted-foreground">{formatShortcut("V")}</span>
          </button>
        )}
        {(onCopy || onCut || onPaste) && (
          <div className="my-1 h-px bg-border" />
        )}
        <button
          onClick={() => {
            onToggleLock();
            onClose();
          }}
          className={menuItemClass}
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
            className={menuItemClass}
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
