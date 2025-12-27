"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useReactFlow, useStore } from "@xyflow/react";
import { useProject } from "@/contexts/ProjectContext";
import { useCanvasActions } from "@/contexts/CanvasActionsContext";
import type {
  HandlePositions,
  ToolErrorBehavior,
  NodeExecutionState,
  HandleDataType,
} from "@/lib/types";

export interface ToolNodeData {
  name?: string;
  code?: string;
  file_path?: string;
  error_behavior?: ToolErrorBehavior;
  executionState?: NodeExecutionState;
  handlePositions?: HandlePositions;
  handleTypes?: Record<
    string,
    {
      outputSource?: string;
      outputType?: HandleDataType;
      acceptedTypes?: HandleDataType[];
    }
  >;
  expandedSize?: { width: number; height: number };
  expandedPosition?: { x: number; y: number };
  contractedPosition?: { x: number; y: number };
  isExpanded?: boolean;
  isNodeLocked?: boolean;
  duplicateNameError?: string;
  validationErrors?: string[];
  validationWarnings?: string[];
}

export interface UseToolNodeStateProps {
  id: string;
  name: string;
  code: string;
  file_path?: string;
  isNodeLocked?: boolean;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  executionState?: NodeExecutionState;
}

export function useToolNodeState({
  id,
  name,
  code,
  file_path,
  isNodeLocked,
  isExpanded,
  setIsExpanded,
  executionState,
}: UseToolNodeStateProps) {
  const { setNodes } = useReactFlow();
  const { onSaveFile, onRequestFilePicker } = useProject();
  const canvasActions = useCanvasActions();

  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [savedCode, setSavedCode] = useState(code);
  const [editedName, setEditedName] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDirty = !!(file_path && code !== savedCode);

  // Optimized selector: only subscribe to parentId changes for this specific node
  const parentId = useStore(
    useCallback(
      (state) => state.nodes.find((n) => n.id === id)?.parentId,
      [id],
    ),
  );

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleCopy = useCallback(() => {
    setNodes((nodes) => nodes.map((n) => ({ ...n, selected: n.id === id })));
    setTimeout(() => canvasActions?.copySelectedNodes(), 0);
  }, [id, setNodes, canvasActions]);

  const handleCut = useCallback(() => {
    setNodes((nodes) => nodes.map((n) => ({ ...n, selected: n.id === id })));
    setTimeout(() => canvasActions?.cutSelectedNodes(), 0);
  }, [id, setNodes, canvasActions]);

  const handlePaste = useCallback(() => {
    canvasActions?.pasteNodes();
  }, [canvasActions]);

  const toggleExpand = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== id) return node;

        const nodeData = node.data as unknown as ToolNodeData;
        const currentPosition = node.position;

        if (isExpanded) {
          // Going from expanded -> contracted
          return {
            ...node,
            position: nodeData.contractedPosition ?? currentPosition,
            extent: node.parentId ? ("parent" as const) : undefined,
            data: {
              ...nodeData,
              expandedPosition: currentPosition,
              isExpanded: false,
            },
          };
        } else {
          // Going from contracted -> expanded
          return {
            ...node,
            position: nodeData.expandedPosition ?? currentPosition,
            extent: undefined,
            data: {
              ...nodeData,
              contractedPosition: currentPosition,
              isExpanded: true,
            },
          };
        }
      }),
    );
    setIsExpanded(!isExpanded);
  }, [id, isExpanded, setNodes, setIsExpanded]);

  const handleNameClick = useCallback(
    (e: React.MouseEvent) => {
      if (isNodeLocked) return;
      e.stopPropagation();
      setIsEditing(true);
      setEditedName(name);
    },
    [isNodeLocked, name],
  );

  const handleHeaderContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleToggleNodeLock = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, isNodeLocked: !isNodeLocked } }
          : node,
      ),
    );
  }, [id, isNodeLocked, setNodes]);

  const handleDetach = useCallback(() => {
    setNodes((nodes) => {
      const thisNode = nodes.find((n) => n.id === id);
      const parentNode = nodes.find((n) => n.id === thisNode?.parentId);
      if (!thisNode || !parentNode) return nodes;

      return nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              parentId: undefined,
              position: {
                x: thisNode.position.x + parentNode.position.x,
                y: thisNode.position.y + parentNode.position.y,
              },
            }
          : node,
      );
    });
  }, [id, setNodes]);

  const handleNameSave = useCallback(() => {
    if (editedName.trim()) {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  name: editedName.trim(),
                },
              }
            : node,
        ),
      );
    }
    setIsEditing(false);
  }, [editedName, id, setNodes]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleNameSave();
      } else if (e.key === "Escape") {
        setEditedName(name);
        setIsEditing(false);
      }
    },
    [handleNameSave, name],
  );

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  code: value || "",
                },
              }
            : node,
        ),
      );
    },
    [id, setNodes],
  );

  const handleSave = useCallback(async () => {
    if (!onSaveFile || !file_path) return;
    setIsSaving(true);
    try {
      await onSaveFile(file_path, code);
      setSavedCode(code);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  }, [onSaveFile, file_path, code]);

  const handleChangeFile = useCallback(() => {
    if (!onRequestFilePicker) return;
    onRequestFilePicker(
      file_path || "",
      (newPath) => {
        setNodes((nodes) =>
          nodes.map((node) =>
            node.id === id
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    file_path: newPath,
                  },
                }
              : node,
          ),
        );
      },
      { extensions: [".py"], filterLabel: "Python files" },
    );
  }, [onRequestFilePicker, file_path, id, setNodes]);

  const handleConfigChange = useCallback(
    (updates: Partial<ToolNodeData>) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, ...updates } }
            : node,
        ),
      );
    },
    [id, setNodes],
  );

  const getExecutionStyle = useCallback((): React.CSSProperties => {
    switch (executionState) {
      case "running":
        return {
          boxShadow: `0 0 0 2px rgba(59, 130, 246, 0.8), 0 0 20px 4px rgba(59, 130, 246, 0.4)`,
          animation: "tool-execution-pulse 1.5s ease-in-out infinite",
        };
      case "completed":
        return {
          boxShadow: `0 0 0 2px rgba(34, 197, 94, 0.8), 0 0 10px 2px rgba(34, 197, 94, 0.3)`,
          transition: "box-shadow 0.3s ease-out",
        };
      default:
        return {};
    }
  }, [executionState]);

  return {
    // State
    isSaving,
    isEditing,
    editedName,
    contextMenu,
    savedCode,
    inputRef,
    parentId,
    canvasActions,
    isDirty,
    setNodes,

    // Setters
    setIsEditing,
    setEditedName,
    setContextMenu,

    // Handlers
    handleCopy,
    handleCut,
    handlePaste,
    toggleExpand,
    handleNameClick,
    handleHeaderContextMenu,
    handleToggleNodeLock,
    handleDetach,
    handleNameSave,
    handleNameKeyDown,
    handleCodeChange,
    handleSave,
    handleChangeFile,
    handleConfigChange,
    getExecutionStyle,
  };
}
