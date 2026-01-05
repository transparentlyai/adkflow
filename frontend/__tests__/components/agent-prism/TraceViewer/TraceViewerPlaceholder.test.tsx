import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TraceViewerPlaceholder } from "@/components/agent-prism/TraceViewer/TraceViewerPlaceholder";

describe("TraceViewerPlaceholder", () => {
  it("should render title", () => {
    render(<TraceViewerPlaceholder title="Select a trace" />);
    expect(screen.getByText("Select a trace")).toBeInTheDocument();
  });

  it("should render different titles", () => {
    render(<TraceViewerPlaceholder title="No data available" />);
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("should render as paragraph element", () => {
    render(<TraceViewerPlaceholder title="Test" />);
    const paragraph = screen.getByText("Test");
    expect(paragraph.tagName).toBe("P");
  });
});
