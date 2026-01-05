import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { SpanStatus } from "@/components/agent-prism/SpanStatus";

describe("SpanStatus", () => {
  describe("dot variant (default)", () => {
    it("should render success status dot", () => {
      render(<SpanStatus status="success" />);
      const dot = screen.getByTitle("Status: success");
      expect(dot).toHaveClass("bg-agentprism-success");
    });

    it("should render error status dot", () => {
      render(<SpanStatus status="error" />);
      const dot = screen.getByTitle("Status: error");
      expect(dot).toHaveClass("bg-agentprism-error");
    });

    it("should render pending status dot", () => {
      render(<SpanStatus status="pending" />);
      const dot = screen.getByTitle("Status: pending");
      expect(dot).toHaveClass("bg-agentprism-pending");
    });

    it("should render warning status dot", () => {
      render(<SpanStatus status="warning" />);
      const dot = screen.getByTitle("Status: warning");
      expect(dot).toHaveClass("bg-agentprism-warning");
    });
  });

  describe("badge variant", () => {
    it("should render success status badge", () => {
      render(<SpanStatus status="success" variant="badge" />);
      const badge = screen.getByTitle("Status: success");
      expect(badge).toHaveClass("bg-agentprism-success-muted");
    });

    it("should render error status badge", () => {
      render(<SpanStatus status="error" variant="badge" />);
      const badge = screen.getByTitle("Status: error");
      expect(badge).toHaveClass("bg-agentprism-error-muted");
    });

    it("should render pending status badge", () => {
      render(<SpanStatus status="pending" variant="badge" />);
      const badge = screen.getByTitle("Status: pending");
      expect(badge).toHaveClass("bg-agentprism-pending-muted");
    });

    it("should render warning status badge", () => {
      render(<SpanStatus status="warning" variant="badge" />);
      const badge = screen.getByTitle("Status: warning");
      expect(badge).toHaveClass("bg-agentprism-warning-muted");
    });
  });

  it("should pass through additional props", () => {
    render(<SpanStatus status="success" data-testid="status" />);
    expect(screen.getByTestId("status")).toBeInTheDocument();
  });

  describe("badge variant icons", () => {
    it("should render check icon for success badge", () => {
      const { container } = render(
        <SpanStatus status="success" variant="badge" />,
      );
      // The success badge should have an SVG icon
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("should render triangle alert icon for error badge", () => {
      const { container } = render(
        <SpanStatus status="error" variant="badge" />,
      );
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("should render info icon for warning badge", () => {
      const { container } = render(
        <SpanStatus status="warning" variant="badge" />,
      );
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("should render ellipsis icon for pending badge", () => {
      const { container } = render(
        <SpanStatus status="pending" variant="badge" />,
      );
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have aria-label on dot variant", () => {
      render(<SpanStatus status="success" />);
      const dot = screen.getByTitle("Status: success");
      expect(dot).toHaveAttribute("aria-label", "Status: success");
    });

    it("should have aria-label on badge variant", () => {
      render(<SpanStatus status="error" variant="badge" />);
      const badge = screen.getByTitle("Status: error");
      expect(badge).toHaveAttribute("aria-label", "Status: error");
    });
  });

  it("should have size-4 wrapper class", () => {
    render(<SpanStatus status="success" data-testid="status" />);
    expect(screen.getByTestId("status")).toHaveClass("size-4");
  });
});
