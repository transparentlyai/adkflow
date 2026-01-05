import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import type { Theme } from "@/lib/themes/types";

// Mock lucide-react with all icons that might be used
// Factory function must be inside the mock call due to hoisting
vi.mock("lucide-react", () => {
  // Create a mock icon component factory inside the mock
  const createMockIcon = (testId: string) =>
    function MockIcon({
      size,
      style,
      className,
    }: {
      size?: number;
      style?: React.CSSProperties;
      className?: string;
    }) {
      return React.createElement("svg", {
        "data-testid": testId,
        "data-size": size,
        style,
        className,
      });
    };

  return {
    Lock: createMockIcon("lock-icon"),
    LockOpen: createMockIcon("lock-open-icon"),
    Grid3X3: createMockIcon("grid-icon"),
    // Add commonly needed icons
    Send: createMockIcon("send-icon"),
    Bot: createMockIcon("bot-icon"),
    MessageSquare: createMockIcon("message-square-icon"),
    Settings: createMockIcon("settings-icon"),
    Play: createMockIcon("play-icon"),
    FileText: createMockIcon("file-text-icon"),
    Folder: createMockIcon("folder-icon"),
    FolderOpen: createMockIcon("folder-open-icon"),
    Plus: createMockIcon("plus-icon"),
    Minus: createMockIcon("minus-icon"),
    X: createMockIcon("x-icon"),
    Check: createMockIcon("check-icon"),
    ChevronDown: createMockIcon("chevron-down-icon"),
    ChevronUp: createMockIcon("chevron-up-icon"),
    ChevronLeft: createMockIcon("chevron-left-icon"),
    ChevronRight: createMockIcon("chevron-right-icon"),
    AlertTriangle: createMockIcon("alert-triangle-icon"),
    Info: createMockIcon("info-icon"),
    Eye: createMockIcon("eye-icon"),
    EyeOff: createMockIcon("eye-off-icon"),
    Copy: createMockIcon("copy-icon"),
    Trash: createMockIcon("trash-icon"),
    Trash2: createMockIcon("trash2-icon"),
    Edit: createMockIcon("edit-icon"),
    Save: createMockIcon("save-icon"),
    Download: createMockIcon("download-icon"),
    Upload: createMockIcon("upload-icon"),
    Search: createMockIcon("search-icon"),
    Loader2: createMockIcon("loader2-icon"),
    RefreshCw: createMockIcon("refresh-cw-icon"),
    MoreHorizontal: createMockIcon("more-horizontal-icon"),
    MoreVertical: createMockIcon("more-vertical-icon"),
    GripVertical: createMockIcon("grip-vertical-icon"),
    Link: createMockIcon("link-icon"),
    Unlink: createMockIcon("unlink-icon"),
    Home: createMockIcon("home-icon"),
    ArrowLeft: createMockIcon("arrow-left-icon"),
    ArrowRight: createMockIcon("arrow-right-icon"),
    ArrowUp: createMockIcon("arrow-up-icon"),
    ArrowDown: createMockIcon("arrow-down-icon"),
    Maximize2: createMockIcon("maximize2-icon"),
    Minimize2: createMockIcon("minimize2-icon"),
    Workflow: createMockIcon("workflow-icon"),
    Clock: createMockIcon("clock-icon"),
    FolderX: createMockIcon("folder-x-icon"),
    FolderPlus: createMockIcon("folder-plus-icon"),
    MapPin: createMockIcon("map-pin-icon"),
    Puzzle: createMockIcon("puzzle-icon"),
    Network: createMockIcon("network-icon"),
    BoxSelect: createMockIcon("box-select-icon"),
    TriangleAlert: createMockIcon("triangle-alert-icon"),
    Hash: createMockIcon("hash-icon"),
    List: createMockIcon("list-icon"),
    FileCode: createMockIcon("file-code-icon"),
    Waypoints: createMockIcon("waypoints-icon"),
    Tag: createMockIcon("tag-icon"),
    Sparkles: createMockIcon("sparkles-icon"),
    Zap: createMockIcon("zap-icon"),
    Database: createMockIcon("database-icon"),
    Server: createMockIcon("server-icon"),
    Wrench: createMockIcon("wrench-icon"),
    Variable: createMockIcon("variable-icon"),
    ScrollText: createMockIcon("scroll-text-icon"),
    Terminal: createMockIcon("terminal-icon"),
    Activity: createMockIcon("activity-icon"),
  };
});

// Mock canvas utils
vi.mock("@/components/hooks/canvas", () => ({
  getMiniMapNodeColor: vi.fn(() => "#000000"),
}));

// Import after mocking
import { ReactFlowControls } from "@/components/ReactFlowControls";

describe("ReactFlowControls", () => {
  const mockTheme: Theme = {
    id: "test-theme",
    name: "Test Theme",
    version: "1.0.0",
    colors: {
      canvas: {
        background: "#ffffff",
        grid: "#e0e0e0",
        minimap: {
          background: "#f5f5f5",
          mask: "rgba(0, 0, 0, 0.1)",
          nodeStroke: "#333333",
        },
      },
      // Minimal required colors for the theme
      nodes: {} as Theme["colors"]["nodes"],
      handles: {} as Theme["colors"]["handles"],
      edges: {} as Theme["colors"]["edges"],
      ui: {} as Theme["colors"]["ui"],
      form: {} as Theme["colors"]["form"],
      scrollbar: {} as Theme["colors"]["scrollbar"],
      topology: {} as Theme["colors"]["topology"],
      state: {} as Theme["colors"]["state"],
      monaco: "vs",
      agentPrism: {} as Theme["colors"]["agentPrism"],
    },
  };

  const defaultProps = {
    isLocked: false,
    onToggleLock: vi.fn(),
    snapToGrid: false,
    onToggleSnapToGrid: vi.fn(),
    theme: mockTheme,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render Controls component", () => {
      render(<ReactFlowControls {...defaultProps} />);
      // The Controls component from @xyflow/react is mocked in vitest.setup.ts
      // Just verify our custom buttons are rendered
      expect(screen.getByTitle("Lock canvas")).toBeInTheDocument();
    });

    it("should render lock button", () => {
      render(<ReactFlowControls {...defaultProps} />);
      expect(screen.getByTitle("Lock canvas")).toBeInTheDocument();
    });

    it("should render snap to grid button", () => {
      render(<ReactFlowControls {...defaultProps} />);
      expect(screen.getByTitle("Enable snap to grid")).toBeInTheDocument();
    });

    it("should render MiniMap component", () => {
      render(<ReactFlowControls {...defaultProps} />);
      // MiniMap is mocked to return null, so just verify no errors
    });
  });

  describe("lock button", () => {
    it("should show LockOpen icon when not locked", () => {
      render(<ReactFlowControls {...defaultProps} isLocked={false} />);
      expect(screen.getByTestId("lock-open-icon")).toBeInTheDocument();
      expect(screen.queryByTestId("lock-icon")).not.toBeInTheDocument();
    });

    it("should show Lock icon when locked", () => {
      render(<ReactFlowControls {...defaultProps} isLocked={true} />);
      expect(screen.getByTestId("lock-icon")).toBeInTheDocument();
      expect(screen.queryByTestId("lock-open-icon")).not.toBeInTheDocument();
    });

    it("should have 'Lock canvas' title when not locked", () => {
      render(<ReactFlowControls {...defaultProps} isLocked={false} />);
      expect(screen.getByTitle("Lock canvas")).toBeInTheDocument();
    });

    it("should have 'Unlock canvas' title when locked", () => {
      render(<ReactFlowControls {...defaultProps} isLocked={true} />);
      expect(screen.getByTitle("Unlock canvas")).toBeInTheDocument();
    });

    it("should call onToggleLock when clicked", () => {
      const onToggleLock = vi.fn();
      render(
        <ReactFlowControls {...defaultProps} onToggleLock={onToggleLock} />,
      );

      fireEvent.click(screen.getByTitle("Lock canvas"));

      expect(onToggleLock).toHaveBeenCalledTimes(1);
    });

    it("should render icon with size 12", () => {
      render(<ReactFlowControls {...defaultProps} isLocked={false} />);
      expect(screen.getByTestId("lock-open-icon")).toHaveAttribute(
        "data-size",
        "12",
      );
    });
  });

  describe("snap to grid button", () => {
    it("should have full opacity when snap is enabled", () => {
      render(<ReactFlowControls {...defaultProps} snapToGrid={true} />);
      const gridIcon = screen.getByTestId("grid-icon");
      expect(gridIcon).toHaveStyle({ opacity: 1 });
    });

    it("should have reduced opacity when snap is disabled", () => {
      render(<ReactFlowControls {...defaultProps} snapToGrid={false} />);
      const gridIcon = screen.getByTestId("grid-icon");
      expect(gridIcon).toHaveStyle({ opacity: 0.4 });
    });

    it("should have 'Enable snap to grid' title when disabled", () => {
      render(<ReactFlowControls {...defaultProps} snapToGrid={false} />);
      expect(screen.getByTitle("Enable snap to grid")).toBeInTheDocument();
    });

    it("should have 'Disable snap to grid' title when enabled", () => {
      render(<ReactFlowControls {...defaultProps} snapToGrid={true} />);
      expect(screen.getByTitle("Disable snap to grid")).toBeInTheDocument();
    });

    it("should call onToggleSnapToGrid when clicked", () => {
      const onToggleSnapToGrid = vi.fn();
      render(
        <ReactFlowControls
          {...defaultProps}
          onToggleSnapToGrid={onToggleSnapToGrid}
        />,
      );

      fireEvent.click(screen.getByTitle("Enable snap to grid"));

      expect(onToggleSnapToGrid).toHaveBeenCalledTimes(1);
    });

    it("should render icon with size 12", () => {
      render(<ReactFlowControls {...defaultProps} />);
      expect(screen.getByTestId("grid-icon")).toHaveAttribute(
        "data-size",
        "12",
      );
    });
  });

  describe("button styling", () => {
    it("should have lucide-btn class on lock button", () => {
      render(<ReactFlowControls {...defaultProps} />);
      const lockButton = screen.getByTitle("Lock canvas");
      expect(lockButton).toHaveClass("lucide-btn");
    });

    it("should have lucide-btn class on grid button", () => {
      render(<ReactFlowControls {...defaultProps} />);
      const gridButton = screen.getByTitle("Enable snap to grid");
      expect(gridButton).toHaveClass("lucide-btn");
    });
  });

  describe("edge cases", () => {
    it("should handle undefined isLocked", () => {
      render(<ReactFlowControls {...defaultProps} isLocked={undefined} />);
      // When undefined, should show LockOpen (falsy value)
      expect(screen.getByTestId("lock-open-icon")).toBeInTheDocument();
    });

    it("should handle undefined onToggleLock", () => {
      render(<ReactFlowControls {...defaultProps} onToggleLock={undefined} />);
      // Should not crash when clicking
      const lockButton = screen.getByTitle("Lock canvas");
      fireEvent.click(lockButton);
      // No error expected
    });

    it("should toggle lock state properly", () => {
      const onToggleLock = vi.fn();
      const { rerender } = render(
        <ReactFlowControls
          {...defaultProps}
          isLocked={false}
          onToggleLock={onToggleLock}
        />,
      );

      expect(screen.getByTestId("lock-open-icon")).toBeInTheDocument();

      rerender(
        <ReactFlowControls
          {...defaultProps}
          isLocked={true}
          onToggleLock={onToggleLock}
        />,
      );

      expect(screen.getByTestId("lock-icon")).toBeInTheDocument();
    });

    it("should toggle snap state properly", () => {
      const onToggleSnapToGrid = vi.fn();
      const { rerender } = render(
        <ReactFlowControls
          {...defaultProps}
          snapToGrid={false}
          onToggleSnapToGrid={onToggleSnapToGrid}
        />,
      );

      expect(screen.getByTestId("grid-icon")).toHaveStyle({ opacity: 0.4 });

      rerender(
        <ReactFlowControls
          {...defaultProps}
          snapToGrid={true}
          onToggleSnapToGrid={onToggleSnapToGrid}
        />,
      );

      expect(screen.getByTestId("grid-icon")).toHaveStyle({ opacity: 1 });
    });
  });

  describe("theme integration", () => {
    it("should pass theme colors to MiniMap", () => {
      // MiniMap is mocked, but we can verify the component renders without error
      // with theme colors passed
      render(<ReactFlowControls {...defaultProps} />);
      // No error expected
    });

    it("should handle different theme configurations", () => {
      const darkTheme: Theme = {
        ...mockTheme,
        id: "dark-theme",
        name: "Dark Theme",
        colors: {
          ...mockTheme.colors,
          canvas: {
            background: "#1a1a1a",
            grid: "#333333",
            minimap: {
              background: "#2a2a2a",
              mask: "rgba(255, 255, 255, 0.1)",
              nodeStroke: "#666666",
            },
          },
        },
      };

      render(<ReactFlowControls {...defaultProps} theme={darkTheme} />);
      // Should render without errors
      expect(screen.getByTitle("Lock canvas")).toBeInTheDocument();
    });
  });
});
