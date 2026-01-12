"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface ConnectionState {
  isDragging: boolean;
  sourceNodeId: string | null;
  sourceHandleId: string | null;
  sourceOutputSource: string | null; // e.g., 'prompt', 'agent'
  sourceOutputType: string | null; // e.g., 'str', 'dict'
}

interface ConnectionContextValue {
  connectionState: ConnectionState;
  startConnection: (
    nodeId: string,
    handleId: string,
    outputSource: string,
    outputType: string,
  ) => void;
  endConnection: () => void;
  // Expansion control for auto-expand on edge drag
  nodeToExpand: string | null;
  expandNodeForConnection: (nodeId: string) => void;
  clearExpansionRequest: () => void;
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

const initialState: ConnectionState = {
  isDragging: false,
  sourceNodeId: null,
  sourceHandleId: null,
  sourceOutputSource: null,
  sourceOutputType: null,
};

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>(initialState);
  const [nodeToExpand, setNodeToExpand] = useState<string | null>(null);

  const startConnection = useCallback(
    (
      nodeId: string,
      handleId: string,
      outputSource: string,
      outputType: string,
    ) => {
      setConnectionState({
        isDragging: true,
        sourceNodeId: nodeId,
        sourceHandleId: handleId,
        sourceOutputSource: outputSource,
        sourceOutputType: outputType,
      });
    },
    [],
  );

  const endConnection = useCallback(() => {
    setConnectionState(initialState);
  }, []);

  // Request a node to expand (for auto-expand on edge drag)
  const expandNodeForConnection = useCallback((nodeId: string) => {
    setNodeToExpand(nodeId);
  }, []);

  // Clear the expansion request (called after node processes it)
  const clearExpansionRequest = useCallback(() => {
    setNodeToExpand(null);
  }, []);

  return (
    <ConnectionContext.Provider
      value={{
        connectionState,
        startConnection,
        endConnection,
        nodeToExpand,
        expandNodeForConnection,
        clearExpansionRequest,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const ctx = useContext(ConnectionContext);
  if (!ctx) {
    throw new Error("useConnection must be used within ConnectionProvider");
  }
  return ctx;
}
