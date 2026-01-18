import { useCallback, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { useReactFlow } from "@xyflow/react";
import { useFileSync, type FileChangeEvent } from "@/contexts/FileSyncContext";
import { useProject } from "@/contexts/ProjectContext";
import { readPrompt } from "@/lib/api";

interface UseFileSyncSubscriptionParams {
  /** Node ID */
  nodeId: string;
  /** File path to watch for changes */
  filePath: string;
  /** ID of the code editor field in the node config */
  codeFieldId: string;
  /** Whether the node is currently expanded */
  isExpanded: boolean;
  /** Callback to update saved content state */
  setSavedContent: (content: string) => void;
}

interface UseFileSyncSubscriptionResult {
  /** Mark a save timestamp to skip own events */
  markSaveTimestamp: () => void;
}

/** Time window (ms) to skip own save events */
const OWN_SAVE_WINDOW_MS = 2000;

/**
 * Hook to subscribe to file changes and sync node content.
 *
 * When a file is modified (either externally or by another node),
 * this hook reloads the file content and updates the node.
 *
 * It skips reloading when the change was triggered by this node's own save
 * (detected via timestamp within 2s window).
 */
export function useFileSyncSubscription({
  nodeId,
  filePath,
  codeFieldId,
  isExpanded,
  setSavedContent,
}: UseFileSyncSubscriptionParams): UseFileSyncSubscriptionResult {
  const { setNodes } = useReactFlow();
  const { projectPath } = useProject();
  const { subscribeToFile, registerNodeFile, unregisterNodeFile } =
    useFileSync();

  // Track timestamp of our own saves to skip self-triggered events
  const lastSaveTimestampRef = useRef<number>(0);

  // Register node's file association
  useEffect(() => {
    if (filePath) {
      registerNodeFile(nodeId, filePath);
    }
    return () => {
      unregisterNodeFile(nodeId);
    };
  }, [nodeId, filePath, registerNodeFile, unregisterNodeFile]);

  // Use ref for isExpanded to avoid recreating callback on every expand/collapse
  const isExpandedRef = useRef(isExpanded);
  isExpandedRef.current = isExpanded;

  // Handle file change events
  const handleFileChange = useCallback(
    async (event: FileChangeEvent) => {
      if (!projectPath) return;
      if (!isExpandedRef.current) return;

      // Skip if this is likely our own save (within 2s window)
      const timeSinceOwnSave =
        event.timestamp * 1000 - lastSaveTimestampRef.current;
      if (timeSinceOwnSave >= 0 && timeSinceOwnSave < OWN_SAVE_WINDOW_MS) {
        return;
      }

      // Handle deleted files
      if (event.change_type === "deleted") {
        return;
      }

      // Reload file content for created/modified files
      try {
        const response = await readPrompt(projectPath, filePath);
        const newContent = response.content;

        // Update saved content FIRST using flushSync to ensure it's applied
        // before setNodes triggers a re-render. This prevents a brief "dirty"
        // state when the config updates but savedContent hasn't yet.
        flushSync(() => {
          setSavedContent(newContent);
        });

        // Update node config with new content
        setNodes((nodes) =>
          nodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    config: {
                      ...(node.data.config as Record<string, unknown>),
                      [codeFieldId]: newContent,
                    },
                  },
                }
              : node,
          ),
        );
      } catch (error) {
        console.error("Failed to reload file after change:", error);
      }
    },
    [projectPath, filePath, nodeId, codeFieldId, setNodes, setSavedContent],
  );

  // Subscribe to file changes
  useEffect(() => {
    if (!filePath || !isExpanded) return;

    const unsubscribe = subscribeToFile(filePath, handleFileChange);
    return () => {
      unsubscribe();
    };
  }, [filePath, isExpanded, subscribeToFile, handleFileChange]);

  // Mark save timestamp to skip own events
  const markSaveTimestamp = useCallback(() => {
    lastSaveTimestampRef.current = Date.now();
  }, []);

  return { markSaveTimestamp };
}
