"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { HandleDataType } from '@/lib/types';

interface ConnectionState {
  isDragging: boolean;
  sourceNodeId: string | null;
  sourceHandleId: string | null;
  sourceOutputType: HandleDataType | null;
}

interface ConnectionContextValue {
  connectionState: ConnectionState;
  startConnection: (nodeId: string, handleId: string, outputType: HandleDataType) => void;
  endConnection: () => void;
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

const initialState: ConnectionState = {
  isDragging: false,
  sourceNodeId: null,
  sourceHandleId: null,
  sourceOutputType: null,
};

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [connectionState, setConnectionState] = useState<ConnectionState>(initialState);

  const startConnection = useCallback((nodeId: string, handleId: string, outputType: HandleDataType) => {
    setConnectionState({
      isDragging: true,
      sourceNodeId: nodeId,
      sourceHandleId: handleId,
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
