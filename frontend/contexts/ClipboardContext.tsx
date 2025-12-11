"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Node, Edge } from "@xyflow/react";

export interface ClipboardData {
  nodes: Node[];
  edges: Edge[];
  sourceTabId: string;
  timestamp: number;
}

interface ClipboardContextValue {
  clipboard: ClipboardData | null;
  copy: (nodes: Node[], edges: Edge[], sourceTabId: string) => void;
  clear: () => void;
  hasClipboard: boolean;
}

const ClipboardContext = createContext<ClipboardContextValue | null>(null);

export function ClipboardProvider({ children }: { children: ReactNode }) {
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);

  const copy = useCallback((nodes: Node[], edges: Edge[], sourceTabId: string) => {
    // Only copy selected nodes
    const selectedNodes = nodes.filter((n) => n.selected);
    if (selectedNodes.length === 0) return;

    // Get edges where both source and target are in selection
    const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
    const selectedEdges = edges.filter(
      (e) => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
    );

    setClipboard({
      nodes: selectedNodes,
      edges: selectedEdges,
      sourceTabId,
      timestamp: Date.now(),
    });
  }, []);

  const clear = useCallback(() => {
    setClipboard(null);
  }, []);

  return (
    <ClipboardContext.Provider
      value={{
        clipboard,
        copy,
        clear,
        hasClipboard: clipboard !== null && clipboard.nodes.length > 0,
      }}
    >
      {children}
    </ClipboardContext.Provider>
  );
}

export function useClipboard() {
  const context = useContext(ClipboardContext);
  if (!context) {
    throw new Error("useClipboard must be used within ClipboardProvider");
  }
  return context;
}
