import { useCallback } from "react";
import type { Node } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import type { ContextMenuState } from "./useDialogState";

interface UseContextMenuEventsParams {
  setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState | null>>;
  setMousePosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number } | null>
  >;
  isLocked?: boolean;
}

export function useContextMenuEvents({
  setContextMenu,
  setMousePosition,
  isLocked,
}: UseContextMenuEventsParams) {
  const { screenToFlowPosition } = useReactFlow();

  // Handle right-click on canvas pane
  // ReactFlow passes either native MouseEvent or React.MouseEvent
  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setContextMenu({ x: event.clientX, y: event.clientY, flowPosition });
    },
    [screenToFlowPosition, setContextMenu],
  );

  // Handle right-click on a node (specifically for groups)
  // ReactFlow passes either native MouseEvent or React.MouseEvent
  const onNodeContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent, node: Node) => {
      if (isLocked) return;
      if (node.type !== "group") return;

      event.preventDefault();
      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      // Store position relative to the group
      const relativePosition = {
        x: flowPosition.x - node.position.x,
        y: flowPosition.y - node.position.y,
      };
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        flowPosition: relativePosition,
        parentGroupId: node.id,
      });
    },
    [screenToFlowPosition, isLocked, setContextMenu],
  );

  // Handle right-click on selection box
  // ReactFlow passes either native MouseEvent or React.MouseEvent
  const onSelectionContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setContextMenu({ x: event.clientX, y: event.clientY, flowPosition });
    },
    [screenToFlowPosition, setContextMenu],
  );

  // Track mouse position for paste at cursor
  // ReactFlow passes either native MouseEvent or React.MouseEvent
  const onMouseMove = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    },
    [setMousePosition],
  );

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, [setContextMenu]);

  return {
    onPaneContextMenu,
    onNodeContextMenu,
    onSelectionContextMenu,
    onMouseMove,
    closeContextMenu,
  };
}
