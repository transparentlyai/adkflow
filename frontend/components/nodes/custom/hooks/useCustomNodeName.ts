"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";

export interface UseCustomNodeNameOptions {
  nodeId: string;
  initialName: string;
  isNodeLocked?: boolean;
}

export interface UseCustomNodeNameResult {
  isEditing: boolean;
  editedName: string;
  inputRef: React.RefObject<HTMLInputElement>;
  handleNameClick: (e: React.MouseEvent) => void;
  handleNameChange: (value: string) => void;
  handleNameSave: () => void;
  handleNameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Hook to manage name editing state and logic for a CustomNode.
 * Handles entering edit mode, saving, and keyboard interactions.
 */
export function useCustomNodeName({
  nodeId,
  initialName,
  isNodeLocked,
}: UseCustomNodeNameOptions): UseCustomNodeNameResult {
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleNameClick = useCallback(
    (e: React.MouseEvent) => {
      if (isNodeLocked) return;
      e.stopPropagation();
      setIsEditing(true);
      setEditedName(initialName);
    },
    [isNodeLocked, initialName],
  );

  const handleNameChange = useCallback((value: string) => {
    setEditedName(value);
  }, []);

  const handleNameSave = useCallback(() => {
    if (editedName.trim()) {
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id !== nodeId) return node;
          const data = node.data as Record<string, unknown>;
          const config = (data.config as Record<string, unknown>) || {};
          return {
            ...node,
            data: {
              ...data,
              config: {
                ...config,
                name: editedName.trim(),
              },
            },
          };
        }),
      );
    }
    setIsEditing(false);
  }, [editedName, nodeId, setNodes]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleNameSave();
      } else if (e.key === "Escape") {
        setEditedName(initialName);
        setIsEditing(false);
      }
    },
    [handleNameSave, initialName],
  );

  return {
    isEditing,
    editedName,
    inputRef,
    handleNameClick,
    handleNameChange,
    handleNameSave,
    handleNameKeyDown,
  };
}
