import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TopologyDialog from "@/components/TopologyDialog";

// Mock mermaid module
const mockMermaidRender = vi
  .fn()
  .mockResolvedValue({ svg: "<svg>Test SVG</svg>" });
const mockMermaidInitialize = vi.fn();

vi.mock("mermaid", () => ({
  default: {
    initialize: mockMermaidInitialize,
    render: mockMermaidRender,
  },
}));

// Mock ThemeContext
vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      colors: {
        topology: {
          agentNode: { fill: "#4ade80", stroke: "#166534" },
          subgraph: {
            depth0: { fill: "#1e3a5f", stroke: "#60a5fa", text: "#e0f2fe" },
            depth1: { fill: "#2d4a6f", stroke: "#818cf8", text: "#e0e7ff" },
            depth2: { fill: "#3d5a7f", stroke: "#a78bfa", text: "#ede9fe" },
            depth3: { fill: "#4d6a8f", stroke: "#c4b5fd", text: "#f5f3ff" },
          },
          userInput: { fill: "#fbbf24", stroke: "#b45309" },
          outputFile: { fill: "#60a5fa", stroke: "#1d4ed8" },
          start: { fill: "#22c55e", stroke: "#16a34a" },
          end: { fill: "#ef4444", stroke: "#dc2626" },
        },
      },
    },
  }),
}));

describe("TopologyDialog", () => {
  const mockResult = {
    agent_count: 5,
    mermaid: "graph TD\n  A --> B",
    ascii: "A -> B",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("when null result", () => {
    it("should return null", () => {
      const { container } = render(
        <TopologyDialog isOpen={true} result={null} onClose={vi.fn()} />,
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe("basic rendering", () => {
    it("should render dialog title", () => {
      render(
        <TopologyDialog isOpen={true} result={mockResult} onClose={vi.fn()} />,
      );
      expect(screen.getByText("Agent Topology")).toBeInTheDocument();
    });

    it("should show agent count", () => {
      render(
        <TopologyDialog isOpen={true} result={mockResult} onClose={vi.fn()} />,
      );
      expect(screen.getByText("(5 agents)")).toBeInTheDocument();
    });

    it("should render tabs", () => {
      render(
        <TopologyDialog isOpen={true} result={mockResult} onClose={vi.fn()} />,
      );
      expect(screen.getByText("Diagram")).toBeInTheDocument();
      expect(screen.getByText("ASCII")).toBeInTheDocument();
    });
  });

  describe("diagram tab", () => {
    it("should show copy button", () => {
      render(
        <TopologyDialog isOpen={true} result={mockResult} onClose={vi.fn()} />,
      );
      expect(screen.getByText("Copy Mermaid")).toBeInTheDocument();
    });

    it("should show loading initially", () => {
      render(
        <TopologyDialog isOpen={true} result={mockResult} onClose={vi.fn()} />,
      );
      expect(screen.getByText("Loading diagram...")).toBeInTheDocument();
    });
  });

  describe("ascii tab", () => {
    it("should have ASCII tab available", () => {
      render(
        <TopologyDialog isOpen={true} result={mockResult} onClose={vi.fn()} />,
      );
      expect(screen.getByRole("tab", { name: "ASCII" })).toBeInTheDocument();
    });
  });

  describe("close button", () => {
    it("should call onClose when clicked", () => {
      const onClose = vi.fn();
      render(
        <TopologyDialog isOpen={true} result={mockResult} onClose={onClose} />,
      );
      // There are multiple close buttons - use the footer one
      const closeButtons = screen.getAllByRole("button", { name: /close/i });
      const footerButton = closeButtons.find(
        (btn) => btn.textContent === "Close",
      );
      fireEvent.click(footerButton!);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("when closed", () => {
    it("should not render content when not open", () => {
      render(
        <TopologyDialog isOpen={false} result={mockResult} onClose={vi.fn()} />,
      );
      expect(screen.queryByText("Agent Topology")).not.toBeInTheDocument();
    });
  });

  describe("copy functionality", () => {
    it("should copy mermaid to clipboard when copy button clicked", async () => {
      vi.useRealTimers();
      render(
        <TopologyDialog isOpen={true} result={mockResult} onClose={vi.fn()} />,
      );

      const copyButton = screen.getByText("Copy Mermaid").closest("button");
      fireEvent.click(copyButton!);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          mockResult.mermaid,
        );
      });
    });

    it("should show Copied! after successful copy", async () => {
      vi.useRealTimers();
      render(
        <TopologyDialog isOpen={true} result={mockResult} onClose={vi.fn()} />,
      );

      const copyButton = screen.getByText("Copy Mermaid").closest("button");
      fireEvent.click(copyButton!);

      await waitFor(() => {
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });
    });

    it("should handle copy error gracefully", async () => {
      vi.useRealTimers();
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error("Copy failed")),
        },
      });

      render(
        <TopologyDialog isOpen={true} result={mockResult} onClose={vi.fn()} />,
      );

      const copyButton = screen.getByText("Copy Mermaid").closest("button");
      fireEvent.click(copyButton!);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });
  });

  describe("mermaid rendering", () => {
    it("should render svg content after mermaid render", async () => {
      vi.useRealTimers();
      mockMermaidRender.mockResolvedValue({ svg: "<svg>Rendered SVG</svg>" });

      render(
        <TopologyDialog isOpen={true} result={mockResult} onClose={vi.fn()} />,
      );

      await waitFor(
        () => {
          const svgContainer = document.querySelector(
            '[class*="flex justify-center"]',
          );
          expect(svgContainer?.innerHTML).toContain("Rendered SVG");
        },
        { timeout: 500 },
      );
    });

    it("should show error when mermaid render fails", async () => {
      vi.useRealTimers();
      mockMermaidRender.mockRejectedValue(new Error("Render failed"));

      render(
        <TopologyDialog isOpen={true} result={mockResult} onClose={vi.fn()} />,
      );

      await waitFor(
        () => {
          expect(
            screen.getByText("Failed to render diagram"),
          ).toBeInTheDocument();
        },
        { timeout: 500 },
      );
    });

    it("should show error message from render error", async () => {
      vi.useRealTimers();
      mockMermaidRender.mockRejectedValue(new Error("Syntax error in diagram"));

      render(
        <TopologyDialog isOpen={true} result={mockResult} onClose={vi.fn()} />,
      );

      await waitFor(
        () => {
          expect(
            screen.getByText("Syntax error in diagram"),
          ).toBeInTheDocument();
        },
        { timeout: 500 },
      );
    });

    it("should show raw mermaid code when render fails", async () => {
      vi.useRealTimers();
      mockMermaidRender.mockRejectedValue(new Error("Render failed"));

      render(
        <TopologyDialog isOpen={true} result={mockResult} onClose={vi.fn()} />,
      );

      await waitFor(
        () => {
          // The error container should show the mermaid code in a pre tag
          const preElement = document.querySelector("pre.text-xs");
          expect(preElement).toBeInTheDocument();
        },
        { timeout: 500 },
      );
    });
  });

  describe("ascii tab content", () => {
    it("should have ASCII tab panel present", async () => {
      vi.useRealTimers();
      render(
        <TopologyDialog isOpen={true} result={mockResult} onClose={vi.fn()} />,
      );

      // The ASCII tab panel should exist, even if hidden
      const asciiTab = screen.getByRole("tab", { name: "ASCII" });
      expect(asciiTab).toBeInTheDocument();
      expect(asciiTab).toHaveAttribute("aria-controls");
    });
  });
});
