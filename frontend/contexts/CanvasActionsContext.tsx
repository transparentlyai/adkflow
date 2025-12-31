"use client";

import { createContext, useContext, type ReactNode } from "react";

interface CanvasActionsContextValue {
  copySelectedNodes: () => void;
  cutSelectedNodes: () => void;
  pasteNodes: () => void;
  hasClipboard: boolean;
  isLocked: boolean;
}

const CanvasActionsContext = createContext<CanvasActionsContextValue | null>(
  null,
);

export function CanvasActionsProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: CanvasActionsContextValue;
}) {
  return (
    <CanvasActionsContext.Provider value={value}>
      {children}
    </CanvasActionsContext.Provider>
  );
}

export function useCanvasActions() {
  const context = useContext(CanvasActionsContext);
  if (!context) {
    return null;
  }
  return context;
}
