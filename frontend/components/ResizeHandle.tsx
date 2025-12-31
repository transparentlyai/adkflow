"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";

interface ResizeHandleProps {
  onResize: (deltaWidth: number, deltaHeight: number) => void;
  onResizeEnd?: () => void;
}

export default function ResizeHandle({
  onResize,
  onResizeEnd,
}: ResizeHandleProps) {
  const [isResizing, setIsResizing] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const onResizeRef = useRef(onResize);
  const onResizeEndRef = useRef(onResizeEnd);
  const { getZoom } = useReactFlow();

  // Keep refs up to date
  onResizeRef.current = onResize;
  onResizeEndRef.current = onResizeEnd;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      startPos.current = { x: e.clientX, y: e.clientY };
      zoomRef.current = getZoom();
      setIsResizing(true);
    },
    [getZoom],
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = (e.clientX - startPos.current.x) / zoomRef.current;
      const deltaY = (e.clientY - startPos.current.y) / zoomRef.current;

      // Update start position for continuous delta
      startPos.current = { x: e.clientX, y: e.clientY };

      onResizeRef.current(deltaX, deltaY);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      onResizeEndRef.current?.();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`absolute bottom-0 right-0 w-4 h-4 cursor-se-resize nodrag ${
        isResizing ? "z-50" : ""
      }`}
      style={{
        background: "linear-gradient(135deg, transparent 50%, #9ca3af 50%)",
        borderBottomRightRadius: "0.5rem",
      }}
      title="Drag to resize"
    />
  );
}
