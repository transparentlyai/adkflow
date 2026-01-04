import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TraceListItem } from "@/components/TraceExplorer/TraceListItem";
import type { TraceInfo } from "@/lib/api/traces";

// Mock traceUtils
vi.mock("@/components/TraceExplorer/traceUtils", () => ({
  formatDuration: (ms: number) => `${ms}ms`,
  formatSpanName: (name: string) => name,
  formatTime: (time: string) => new Date(time).toLocaleTimeString(),
  getSpanTypeClass: () => ({
    badge: "bg-blue-500",
    icon: ({ className }: { className?: string }) => (
      <span className={className} data-testid="trace-icon" />
    ),
  }),
}));

const createMockTrace = (overrides: Partial<TraceInfo> = {}): TraceInfo => ({
  traceId: "trace-1",
  rootSpanName: "TestTrace",
  startTime: "2024-01-01T12:00:00Z",
  durationMs: 1500,
  spanCount: 5,
  hasErrors: false,
  ...overrides,
});

describe("TraceListItem", () => {
  const defaultProps = {
    trace: createMockTrace(),
    isSelected: false,
    onClick: vi.fn(),
  };

  describe("expanded view", () => {
    it("should render trace name", () => {
      render(<TraceListItem {...defaultProps} />);
      expect(screen.getByText("TestTrace")).toBeInTheDocument();
    });

    it("should render trace icon", () => {
      render(<TraceListItem {...defaultProps} />);
      expect(screen.getByTestId("trace-icon")).toBeInTheDocument();
    });

    it("should render span count", () => {
      render(<TraceListItem {...defaultProps} />);
      expect(screen.getByText("5s")).toBeInTheDocument();
    });

    it("should render duration", () => {
      render(<TraceListItem {...defaultProps} />);
      expect(screen.getByText("1500ms")).toBeInTheDocument();
    });

    it("should call onClick when clicked", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<TraceListItem {...defaultProps} onClick={onClick} />);

      await user.click(screen.getByRole("button"));

      expect(onClick).toHaveBeenCalled();
    });

    it("should apply selected styling when selected", () => {
      render(<TraceListItem {...defaultProps} isSelected={true} />);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-agentprism-secondary");
    });

    it("should show error indicator when hasErrors", () => {
      const trace = createMockTrace({ hasErrors: true });
      const { container } = render(
        <TraceListItem {...defaultProps} trace={trace} />,
      );
      const errorIndicator = container.querySelector(".bg-agentprism-error");
      expect(errorIndicator).toBeInTheDocument();
    });

    it("should not show error indicator when no errors", () => {
      const { container } = render(<TraceListItem {...defaultProps} />);
      const errorIndicator = container.querySelector(".bg-agentprism-error");
      expect(errorIndicator).not.toBeInTheDocument();
    });
  });

  describe("collapsed view", () => {
    it("should render icon only in collapsed view", () => {
      render(<TraceListItem {...defaultProps} isCollapsed={true} />);
      expect(screen.getByTestId("trace-icon")).toBeInTheDocument();
      // Should not show detailed info
      expect(screen.queryByText("TestTrace")).not.toBeInTheDocument();
    });

    it("should show title tooltip in collapsed view", () => {
      render(<TraceListItem {...defaultProps} isCollapsed={true} />);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("title");
      expect(button.getAttribute("title")).toContain("TestTrace");
    });

    it("should call onClick in collapsed view", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <TraceListItem
          {...defaultProps}
          isCollapsed={true}
          onClick={onClick}
        />,
      );

      await user.click(screen.getByRole("button"));

      expect(onClick).toHaveBeenCalled();
    });

    it("should apply selected styling in collapsed view", () => {
      render(
        <TraceListItem
          {...defaultProps}
          isCollapsed={true}
          isSelected={true}
        />,
      );
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-agentprism-secondary");
    });

    it("should show error indicator in collapsed view when hasErrors", () => {
      const trace = createMockTrace({ hasErrors: true });
      const { container } = render(
        <TraceListItem {...defaultProps} trace={trace} isCollapsed={true} />,
      );
      const errorIndicator = container.querySelector(".bg-agentprism-error");
      expect(errorIndicator).toBeInTheDocument();
    });
  });
});
