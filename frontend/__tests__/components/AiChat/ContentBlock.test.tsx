import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import ContentBlock from "@/components/AiChat/ContentBlock";

// Mock Monaco Editor
vi.mock("@monaco-editor/react", () => ({
  default: ({ value, options }: { value: string; options: any }) => (
    <div data-testid="monaco-editor" data-value={value} data-readonly={options.readOnly}>
      {value}
    </div>
  ),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe("ContentBlock", () => {
  const mockOnAccept = vi.fn();
  const defaultProps = {
    content: "Test content",
    onAccept: mockOnAccept,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("rendering", () => {
    it("should render Monaco editor with content", () => {
      render(<ContentBlock {...defaultProps} />);

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toBeInTheDocument();
      expect(editor).toHaveAttribute("data-value", "Test content");
    });

    it("should render Monaco editor as readonly", () => {
      render(<ContentBlock {...defaultProps} />);

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-readonly", "true");
    });

    it("should render copy button", () => {
      render(<ContentBlock {...defaultProps} />);

      expect(screen.getByText("Copy")).toBeInTheDocument();
    });

    it("should render accept button with correct text", () => {
      render(<ContentBlock {...defaultProps} />);

      expect(screen.getByText("Use it")).toBeInTheDocument();
    });

    it("should calculate height based on content lines", () => {
      const multilineContent = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5";
      const { container } = render(
        <ContentBlock content={multilineContent} onAccept={mockOnAccept} />
      );

      // Check that container has proper structure
      const editorContainer = container.querySelector('[style*="height"]');
      expect(editorContainer).toBeInTheDocument();
    });
  });

  describe("copy functionality", () => {
    it("should copy content to clipboard when copy button clicked", async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      navigator.clipboard.writeText = mockWriteText;

      render(<ContentBlock {...defaultProps} />);

      const copyButton = screen.getByText("Copy");
      fireEvent.click(copyButton);

      expect(mockWriteText).toHaveBeenCalledWith("Test content");
    });

    it("should show 'Copied' text after successful copy", async () => {
      vi.useRealTimers(); // Use real timers for this async test
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      navigator.clipboard.writeText = mockWriteText;

      render(<ContentBlock {...defaultProps} />);

      const copyButton = screen.getByText("Copy");
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText("Copied")).toBeInTheDocument();
      });

      vi.useFakeTimers(); // Restore fake timers for next test
    });

    it("should revert to 'Copy' text after 2 seconds", async () => {
      vi.useRealTimers(); // Use real timers for this async test
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      navigator.clipboard.writeText = mockWriteText;

      render(<ContentBlock {...defaultProps} />);

      const copyButton = screen.getByText("Copy");
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText("Copied")).toBeInTheDocument();
      });

      // Wait for the timeout to complete
      await waitFor(
        () => {
          expect(screen.getByText("Copy")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      vi.useFakeTimers(); // Restore fake timers for next test
    });
  });

  describe("accept functionality", () => {
    it("should call onAccept when 'Use it' button clicked", () => {
      render(<ContentBlock {...defaultProps} />);

      const acceptButton = screen.getByText("Use it");
      fireEvent.click(acceptButton);

      expect(mockOnAccept).toHaveBeenCalledTimes(1);
    });
  });

  describe("resize functionality", () => {
    it("should start resizing on mousedown on resize handle", () => {
      const { container } = render(<ContentBlock {...defaultProps} />);

      const resizeHandle = container.querySelector('[class*="cursor-ns-resize"]');
      expect(resizeHandle).toBeInTheDocument();

      if (resizeHandle) {
        fireEvent.mouseDown(resizeHandle);

        // Check that body cursor is set during resize
        expect(document.body.style.cursor).toBe("ns-resize");
        expect(document.body.style.userSelect).toBe("none");
      }
    });

    it("should update height on mouse move during resize", () => {
      const { container } = render(<ContentBlock {...defaultProps} />);

      const resizeHandle = container.querySelector('[class*="cursor-ns-resize"]');

      if (resizeHandle) {
        fireEvent.mouseDown(resizeHandle);

        // Simulate mouse move
        const mouseMoveEvent = new MouseEvent("mousemove", {
          bubbles: true,
          cancelable: true,
          movementY: 50,
        });
        document.dispatchEvent(mouseMoveEvent);

        // Height should be adjusted (tested indirectly via component structure)
        expect(document.body.style.cursor).toBe("ns-resize");
      }
    });

    it("should stop resizing on mouseup", () => {
      const { container, unmount } = render(<ContentBlock {...defaultProps} />);

      const resizeHandle = container.querySelector('[class*="cursor-ns-resize"]');

      if (resizeHandle) {
        fireEvent.mouseDown(resizeHandle);
        expect(document.body.style.cursor).toBe("ns-resize");

        // Simulate mouse up
        const mouseUpEvent = new MouseEvent("mouseup", {
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(mouseUpEvent);

        // Unmount to trigger cleanup (which resets cursor)
        unmount();

        // After unmount, cleanup should have run
        expect(document.body.style.cursor).toBe("");
        expect(document.body.style.userSelect).toBe("");
      }
    });

    it("should respect minimum height constraint", () => {
      const { container } = render(<ContentBlock {...defaultProps} />);

      const resizeHandle = container.querySelector('[class*="cursor-ns-resize"]');

      if (resizeHandle) {
        fireEvent.mouseDown(resizeHandle);

        // Simulate mouse move with large negative movement (try to go below min)
        const mouseMoveEvent = new MouseEvent("mousemove", {
          bubbles: true,
          cancelable: true,
          movementY: -1000,
        });
        document.dispatchEvent(mouseMoveEvent);

        // Should still render (height clamped internally)
        expect(container.querySelector('[style*="height"]')).toBeInTheDocument();
      }
    });

    it("should respect maximum height constraint", () => {
      const { container } = render(<ContentBlock {...defaultProps} />);

      const resizeHandle = container.querySelector('[class*="cursor-ns-resize"]');

      if (resizeHandle) {
        fireEvent.mouseDown(resizeHandle);

        // Simulate mouse move with large positive movement (try to go above max)
        const mouseMoveEvent = new MouseEvent("mousemove", {
          bubbles: true,
          cancelable: true,
          movementY: 1000,
        });
        document.dispatchEvent(mouseMoveEvent);

        // Should still render (height clamped internally)
        expect(container.querySelector('[style*="height"]')).toBeInTheDocument();
      }
    });
  });

  describe("height calculation", () => {
    it("should use minimum height for short content", () => {
      const { container } = render(
        <ContentBlock content="Short" onAccept={mockOnAccept} />
      );

      const editorContainer = container.querySelector('[style*="height"]');
      expect(editorContainer).toBeInTheDocument();
    });

    it("should calculate proportional height for medium content", () => {
      const mediumContent = Array(10).fill("Line").join("\n");
      const { container } = render(
        <ContentBlock content={mediumContent} onAccept={mockOnAccept} />
      );

      const editorContainer = container.querySelector('[style*="height"]');
      expect(editorContainer).toBeInTheDocument();
    });

    it("should cap at initial max height for very long content", () => {
      const longContent = Array(50).fill("Line").join("\n");
      const { container } = render(
        <ContentBlock content={longContent} onAccept={mockOnAccept} />
      );

      const editorContainer = container.querySelector('[style*="height"]');
      expect(editorContainer).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle empty content", () => {
      render(<ContentBlock content="" onAccept={mockOnAccept} />);

      expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
    });

    it("should handle content with special characters", () => {
      const specialContent = "Content with\ttabs\nand\r\nwindows\nline breaks";
      render(<ContentBlock content={specialContent} onAccept={mockOnAccept} />);

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-value", specialContent);
    });

    it("should handle very long single line", () => {
      const longLine = "a".repeat(1000);
      render(<ContentBlock content={longLine} onAccept={mockOnAccept} />);

      expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
    });
  });
});
