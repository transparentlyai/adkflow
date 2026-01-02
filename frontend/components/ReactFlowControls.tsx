/**
 * ReactFlowControls - Controls and MiniMap for ReactFlowCanvas
 *
 * Provides lock toggle, snap-to-grid toggle, and minimap.
 */

import { Controls, ControlButton, MiniMap, type Node } from "@xyflow/react";
import { Lock, LockOpen, Grid3X3 } from "lucide-react";
import { getMiniMapNodeColor } from "./hooks/canvas";
import type { Theme } from "@/lib/themes/types";

interface ReactFlowControlsProps {
  isLocked?: boolean;
  onToggleLock?: () => void;
  snapToGrid: boolean;
  onToggleSnapToGrid: () => void;
  theme: Theme;
}

export function ReactFlowControls({
  isLocked,
  onToggleLock,
  snapToGrid,
  onToggleSnapToGrid,
  theme,
}: ReactFlowControlsProps) {
  return (
    <>
      <Controls showInteractive={false}>
        <ControlButton
          className="lucide-btn"
          onClick={onToggleLock}
          title={isLocked ? "Unlock canvas" : "Lock canvas"}
        >
          {isLocked ? <Lock size={12} /> : <LockOpen size={12} />}
        </ControlButton>
        <ControlButton
          className="lucide-btn"
          onClick={onToggleSnapToGrid}
          title={snapToGrid ? "Disable snap to grid" : "Enable snap to grid"}
        >
          <Grid3X3 size={12} style={{ opacity: snapToGrid ? 1 : 0.4 }} />
        </ControlButton>
      </Controls>
      <MiniMap
        nodeColor={(node: Node) => getMiniMapNodeColor(node, theme)}
        bgColor={theme.colors.canvas.minimap.background}
        maskColor={theme.colors.canvas.minimap.mask}
        nodeStrokeColor={theme.colors.canvas.minimap.nodeStroke}
        nodeStrokeWidth={1}
        pannable
        zoomable
      />
    </>
  );
}
