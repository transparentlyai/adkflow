"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { API_BASE_URL } from "@/lib/api/client";

/**
 * File change event received from SSE
 */
export interface FileChangeEvent {
  file_path: string;
  change_type: "created" | "modified" | "deleted";
  timestamp: number;
}

/**
 * Callback for file change notifications
 */
export type FileChangeCallback = (event: FileChangeEvent) => void;

/**
 * Context value for file sync operations
 */
interface FileSyncContextValue {
  /** Subscribe to changes for a specific file path */
  subscribeToFile: (
    filePath: string,
    callback: FileChangeCallback,
  ) => () => void;
  /** Register a node's association with a file path */
  registerNodeFile: (nodeId: string, filePath: string) => void;
  /** Unregister a node's file association */
  unregisterNodeFile: (nodeId: string) => void;
  /** Get all node IDs associated with a file path */
  getNodesForFile: (filePath: string) => string[];
  /** Whether SSE connection is active */
  isConnected: boolean;
}

const FileSyncContext = createContext<FileSyncContextValue>({
  subscribeToFile: () => () => {},
  registerNodeFile: () => {},
  unregisterNodeFile: () => {},
  getNodesForFile: () => [],
  isConnected: false,
});

interface FileSyncProviderProps {
  children: ReactNode;
  projectPath: string | null;
}

export function FileSyncProvider({
  children,
  projectPath,
}: FileSyncProviderProps) {
  const [isConnected, setIsConnected] = useState(false);

  // Map of file paths to their subscriber callbacks
  const subscribersRef = useRef<Map<string, Set<FileChangeCallback>>>(
    new Map(),
  );

  // Map of node IDs to their file paths
  const nodeToFileRef = useRef<Map<string, string>>(new Map());

  // Map of file paths to node IDs (reverse lookup)
  const fileToNodesRef = useRef<Map<string, Set<string>>>(new Map());

  // EventSource reference
  const eventSourceRef = useRef<EventSource | null>(null);

  // Reconnection state
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connectSSE = useCallback(() => {
    if (!projectPath) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `${API_BASE_URL}/api/project/files/events?project_path=${encodeURIComponent(projectPath)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    eventSource.addEventListener("file_change", (event) => {
      try {
        const data = JSON.parse(event.data) as FileChangeEvent;
        const subscribers = subscribersRef.current.get(data.file_path);
        if (subscribers) {
          subscribers.forEach((callback) => {
            try {
              callback(data);
            } catch (error) {
              console.error("Error in file change callback:", error);
            }
          });
        }
      } catch (error) {
        console.error("Error parsing file change event:", error);
      }
    });

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
      eventSourceRef.current = null;

      // Exponential backoff for reconnection
      const delay = Math.min(
        1000 * Math.pow(2, reconnectAttemptsRef.current),
        30000,
      );
      reconnectAttemptsRef.current++;

      reconnectTimeoutRef.current = setTimeout(() => {
        connectSSE();
      }, delay);
    };
  }, [projectPath]);

  // Connect/reconnect when project path changes
  useEffect(() => {
    if (projectPath) {
      connectSSE();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setIsConnected(false);
    };
  }, [projectPath, connectSSE]);

  const subscribeToFile = useCallback(
    (filePath: string, callback: FileChangeCallback): (() => void) => {
      if (!subscribersRef.current.has(filePath)) {
        subscribersRef.current.set(filePath, new Set());
      }
      subscribersRef.current.get(filePath)!.add(callback);

      // Return unsubscribe function
      return () => {
        const subscribers = subscribersRef.current.get(filePath);
        if (subscribers) {
          subscribers.delete(callback);
          if (subscribers.size === 0) {
            subscribersRef.current.delete(filePath);
          }
        }
      };
    },
    [],
  );

  const registerNodeFile = useCallback((nodeId: string, filePath: string) => {
    // Remove old registration if exists
    const oldFilePath = nodeToFileRef.current.get(nodeId);
    if (oldFilePath && oldFilePath !== filePath) {
      const nodes = fileToNodesRef.current.get(oldFilePath);
      if (nodes) {
        nodes.delete(nodeId);
        if (nodes.size === 0) {
          fileToNodesRef.current.delete(oldFilePath);
        }
      }
    }

    // Add new registration
    nodeToFileRef.current.set(nodeId, filePath);
    if (!fileToNodesRef.current.has(filePath)) {
      fileToNodesRef.current.set(filePath, new Set());
    }
    fileToNodesRef.current.get(filePath)!.add(nodeId);
  }, []);

  const unregisterNodeFile = useCallback((nodeId: string) => {
    const filePath = nodeToFileRef.current.get(nodeId);
    if (filePath) {
      const nodes = fileToNodesRef.current.get(filePath);
      if (nodes) {
        nodes.delete(nodeId);
        if (nodes.size === 0) {
          fileToNodesRef.current.delete(filePath);
        }
      }
      nodeToFileRef.current.delete(nodeId);
    }
  }, []);

  const getNodesForFile = useCallback((filePath: string): string[] => {
    const nodes = fileToNodesRef.current.get(filePath);
    return nodes ? Array.from(nodes) : [];
  }, []);

  return (
    <FileSyncContext.Provider
      value={{
        subscribeToFile,
        registerNodeFile,
        unregisterNodeFile,
        getNodesForFile,
        isConnected,
      }}
    >
      {children}
    </FileSyncContext.Provider>
  );
}

export function useFileSync() {
  return useContext(FileSyncContext);
}
