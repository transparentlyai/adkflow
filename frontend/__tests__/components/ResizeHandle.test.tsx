import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import ResizeHandle from "@/components/ResizeHandle";

describe("ResizeHandle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render resize handle", () => {
      render(<ResizeHandle onResize={vi.fn()} />);

      expect(screen.getByTitle("Drag to resize")).toBeInTheDocument();
    });

    it("should have correct cursor style", () => {
      render(<ResizeHandle onResize={vi.fn()} />);

      const handle = screen.getByTitle("Drag to resize");
      expect(handle).toHaveClass("cursor-se-resize");
    });

    it("should have nodrag class to prevent ReactFlow dragging", () => {
      render(<ResizeHandle onResize={vi.fn()} />);

      const handle = screen.getByTitle("Drag to resize");
      expect(handle).toHaveClass("nodrag");
    });
  });

  describe("mouse interactions", () => {
    it("should initiate drag on mouse down", () => {
      const onResize = vi.fn();
      render(<ResizeHandle onResize={onResize} />);

      const handle = screen.getByTitle("Drag to resize");

      // Start drag
      fireEvent.mouseDown(handle, { clientX: 100, clientY: 100 });

      // Handle should exist and be interactive
      expect(handle).toBeInTheDocument();
    });

    it("should handle onResizeEnd callback", () => {
      const onResize = vi.fn();
      const onResizeEnd = vi.fn();
      render(<ResizeHandle onResize={onResize} onResizeEnd={onResizeEnd} />);

      const handle = screen.getByTitle("Drag to resize");

      // Start drag
      fireEvent.mouseDown(handle, { clientX: 100, clientY: 100 });

      // Handle should be active
      expect(handle).toBeInTheDocument();
    });

    it("should update class when resizing", () => {
      const onResize = vi.fn();
      render(<ResizeHandle onResize={onResize} />);

      const handle = screen.getByTitle("Drag to resize");

      // Before dragging - should not have z-50
      expect(handle).not.toHaveClass("z-50");

      // Start drag
      fireEvent.mouseDown(handle, { clientX: 100, clientY: 100 });

      // Should have z-50 class during resize
      expect(handle).toHaveClass("z-50");
    });

    it("should call onResize during mouse move", () => {
      const onResize = vi.fn();
      render(<ResizeHandle onResize={onResize} />);

      const handle = screen.getByTitle("Drag to resize");

      // Start drag
      fireEvent.mouseDown(handle, { clientX: 100, clientY: 100 });

      // Move mouse
      fireEvent.mouseMove(document, { clientX: 120, clientY: 130 });

      // onResize should be called with delta
      expect(onResize).toHaveBeenCalledWith(20, 30);
    });

    it("should call onResizeEnd on mouse up", () => {
      const onResize = vi.fn();
      const onResizeEnd = vi.fn();
      render(<ResizeHandle onResize={onResize} onResizeEnd={onResizeEnd} />);

      const handle = screen.getByTitle("Drag to resize");

      // Start drag
      fireEvent.mouseDown(handle, { clientX: 100, clientY: 100 });

      // End drag
      fireEvent.mouseUp(document);

      // onResizeEnd should be called
      expect(onResizeEnd).toHaveBeenCalledTimes(1);
    });

    it("should stop resizing after mouse up", () => {
      const onResize = vi.fn();
      render(<ResizeHandle onResize={onResize} />);

      const handle = screen.getByTitle("Drag to resize");

      // Start drag
      fireEvent.mouseDown(handle, { clientX: 100, clientY: 100 });

      // End drag
      fireEvent.mouseUp(document);

      // z-50 class should be removed
      expect(handle).not.toHaveClass("z-50");

      // Reset mock
      onResize.mockClear();

      // Move mouse after drag end - should not trigger onResize
      fireEvent.mouseMove(document, { clientX: 150, clientY: 150 });
      expect(onResize).not.toHaveBeenCalled();
    });
  });
});
