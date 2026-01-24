"use client";

import { useCallback } from "react";
import { useStore } from "@xyflow/react";
import type { LabelNodeData } from "./types";
import { DEFAULT_WIDTH } from "./types";

/**
 * Custom hook that encapsulates store selectors for LabelNode.
 * Extracts parentId, nodeWidth, fontScaleWidth, and manuallyResized from the store.
 */
export function useLabelNodeStore(nodeId: string) {
  const parentId = useStore(
    useCallback(
      (state) => state.nodes.find((n) => n.id === nodeId)?.parentId,
      [nodeId],
    ),
  );

  const nodeWidth = useStore(
    useCallback(
      (state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        return (
          node?.measured?.width ??
          (node?.style?.width as number) ??
          DEFAULT_WIDTH
        );
      },
      [nodeId],
    ),
  );

  const fontScaleWidth = useStore(
    useCallback(
      (state) =>
        (state.nodes.find((n) => n.id === nodeId)?.data as LabelNodeData)
          ?.fontScaleWidth,
      [nodeId],
    ),
  );

  const manuallyResized = useStore(
    useCallback(
      (state) =>
        (state.nodes.find((n) => n.id === nodeId)?.data as LabelNodeData)
          ?.manuallyResized,
      [nodeId],
    ),
  );

  return {
    parentId,
    nodeWidth,
    fontScaleWidth,
    manuallyResized,
  };
}
