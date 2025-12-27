"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface ConnectionState {
  isDragging: boolean;
  sourceNodeId: string | null;
  sourceHandleId: string | null;
  sourceOutputSource: string | null;  // e.g., 'prompt', 'agent'
  sourceOutputType: string | null;    // e.g., 'str', 'dict'
}

interface ConnectionContextValue {
  connectionState: ConnectionState;
  startConnection: (nodeId: string, handleId: string, outputSource: string, outputType: string) => void;
  endConnection: () => void;
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
  const [connectionState, setConnectionState] = useState<ConnectionState>(initialState);

  const startConnection = useCallback((nodeId: string, handleId: string, outputSource: string, outputType: string) => {
    setConnectionState({
      isDragging: true,
      sourceNodeId: nodeId,
      sourceHandleId: handleId,
      sourceOutputSource: outputSource,
      sourceOutputType: outputType,
    });
  }, []);

  const endConnection = useCallback(() => {
    setConnectionState(initialState);
  }, []);

  return (
    <ConnectionContext.Provider value={{ connectionState, startConnection, endConnection }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const ctx = useContext(ConnectionContext);
  if (!ctx) {
    throw new Error('useConnection must be used within ConnectionProvider');
  }
  return ctx;
}
