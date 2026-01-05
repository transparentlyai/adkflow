import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock ThemeContext
vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: vi.fn(() => ({
    theme: {
      name: "test",
      colors: {
        nodes: {
          common: {
            container: { background: "#fff", border: "#ccc" },
          },
        },
        handles: {
          border: "#ccc",
          background: "#fff",
          connected: "#4f46e5",
          input: "#3b82f6",
          output: "#10b981",
          link: "#6366f1",
        },
      },
    },
  })),
}));

// Mock DraggableHandle
vi.mock("@/components/DraggableHandle", () => ({
  default: ({
    nodeId,
    handleId,
    type,
    defaultEdge,
    title,
    style,
    outputSource,
    outputType,
    acceptedSources,
    acceptedTypes,
  }: {
    nodeId: string;
    handleId: string;
    type: "source" | "target";
    defaultEdge: string;
    title?: string;
    style?: Record<string, unknown>;
    outputSource?: string;
    outputType?: string;
    acceptedSources?: string[];
    acceptedTypes?: string[];
  }) => (
    <div
      data-testid={`handle-${handleId}`}
      data-node-id={nodeId}
      data-type={type}
      data-edge={defaultEdge}
      title={title}
      style={style}
    >
      {outputSource && (
        <span data-testid={`output-source-${handleId}`}>{outputSource}</span>
      )}
      {outputType && (
        <span data-testid={`output-type-${handleId}`}>{outputType}</span>
      )}
      {acceptedSources && (
        <span data-testid={`accepted-sources-${handleId}`}>
          {acceptedSources.join(",")}
        </span>
      )}
      {acceptedTypes && (
        <span data-testid={`accepted-types-${handleId}`}>
          {acceptedTypes.join(",")}
        </span>
      )}
    </div>
  ),
}));

// Import after mocking
import ExpandedNodeHandles from "@/components/nodes/custom/ExpandedNodeHandles";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import type { HandleTypes } from "@/components/nodes/custom/hooks/useCustomNodeHandleTypes";

// Create a mock schema
const createMockSchema = (
  overrides: Partial<CustomNodeSchema["ui"]> = {},
): CustomNodeSchema => ({
  unit_id: "test.node",
  label: "Test Node",
  menu_location: "Test",
  description: "A test node",
  version: "1.0.0",
  ui: {
    inputs: [
      {
        id: "input_1",
        label: "Input 1",
        source_type: "agent",
        data_type: "string",
      },
    ],
    outputs: [
      {
        id: "output_1",
        label: "Output 1",
        source_type: "agent",
        data_type: "string",
      },
    ],
    fields: [],
    color: "#4f46e5",
    expandable: true,
    default_width: 300,
    default_height: 200,
    ...overrides,
  },
});

describe("ExpandedNodeHandles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("additional handles rendering", () => {
    it("should render top additional handles", () => {
      const schema = createMockSchema({
        inputs: [{ id: "flow_in", label: "Flow In", source_type: "flow" }],
      });
      render(
        <ExpandedNodeHandles
          id="node-1"
          schema={schema}
          handlePositions={{}}
          handleTypes={{}}
          additionalHandles={[
            {
              id: "flow_in",
              type: "target",
              position: "top",
              label: "Flow Input",
            },
          ]}
        />,
      );

      const handle = screen.getByTestId("handle-flow_in");
      expect(handle).toBeInTheDocument();
      expect(handle).toHaveAttribute("data-edge", "top");
      expect(handle).toHaveAttribute("data-type", "target");
    });

    it("should render bottom additional handles", () => {
      const schema = createMockSchema({
        outputs: [{ id: "flow_out", label: "Flow Out", source_type: "flow" }],
      });
      render(
        <ExpandedNodeHandles
          id="node-1"
          schema={schema}
          handlePositions={{}}
          handleTypes={{}}
          additionalHandles={[
            {
              id: "flow_out",
              type: "source",
              position: "bottom",
              label: "Flow Output",
            },
          ]}
        />,
      );

      const handle = screen.getByTestId("handle-flow_out");
      expect(handle).toBeInTheDocument();
      expect(handle).toHaveAttribute("data-edge", "bottom");
      expect(handle).toHaveAttribute("data-type", "source");
    });

    it("should NOT render left additional handles (reserved for inline inputs)", () => {
      const schema = createMockSchema();
      render(
        <ExpandedNodeHandles
          id="node-1"
          schema={schema}
          handlePositions={{}}
          handleTypes={{}}
          additionalHandles={[
            {
              id: "side_in",
              type: "target",
              position: "left",
              label: "Side Input",
            },
          ]}
        />,
      );

      expect(screen.queryByTestId("handle-side_in")).not.toBeInTheDocument();
    });

    it("should NOT render right additional handles (reserved for inline outputs)", () => {
      const schema = createMockSchema();
      render(
        <ExpandedNodeHandles
          id="node-1"
          schema={schema}
          handlePositions={{}}
          handleTypes={{}}
          additionalHandles={[
            {
              id: "side_out",
              type: "source",
              position: "right",
              label: "Side Output",
            },
          ]}
        />,
      );

      expect(screen.queryByTestId("handle-side_out")).not.toBeInTheDocument();
    });

    it("should render multiple additional handles", () => {
      const schema = createMockSchema({
        inputs: [{ id: "top_in", label: "Top In", source_type: "flow" }],
        outputs: [
          { id: "bottom_out", label: "Bottom Out", source_type: "flow" },
        ],
      });
      render(
        <ExpandedNodeHandles
          id="node-1"
          schema={schema}
          handlePositions={{}}
          handleTypes={{}}
          additionalHandles={[
            { id: "top_in", type: "target", position: "top" },
            { id: "bottom_out", type: "source", position: "bottom" },
          ]}
        />,
      );

      expect(screen.getByTestId("handle-top_in")).toBeInTheDocument();
      expect(screen.getByTestId("handle-bottom_out")).toBeInTheDocument();
    });
  });

  describe("handle type info", () => {
    it("should pass source handle type info", () => {
      const schema = createMockSchema({
        outputs: [{ id: "flow_out", label: "Flow Out", source_type: "flow" }],
      });
      const handleTypes: HandleTypes = {
        flow_out: {
          outputSource: "flow",
          outputType: "trigger",
        },
      };
      render(
        <ExpandedNodeHandles
          id="node-1"
          schema={schema}
          handlePositions={{}}
          handleTypes={handleTypes}
          additionalHandles={[
            { id: "flow_out", type: "source", position: "bottom" },
          ]}
        />,
      );

      expect(screen.getByTestId("output-source-flow_out")).toHaveTextContent(
        "flow",
      );
      expect(screen.getByTestId("output-type-flow_out")).toHaveTextContent(
        "trigger",
      );
    });

    it("should pass target handle type info", () => {
      const schema = createMockSchema({
        inputs: [{ id: "flow_in", label: "Flow In", source_type: "flow" }],
      });
      const handleTypes: HandleTypes = {
        flow_in: {
          acceptedSources: ["flow", "agent"],
          acceptedTypes: ["trigger", "data"],
        },
      };
      render(
        <ExpandedNodeHandles
          id="node-1"
          schema={schema}
          handlePositions={{}}
          handleTypes={handleTypes}
          additionalHandles={[
            { id: "flow_in", type: "target", position: "top" },
          ]}
        />,
      );

      expect(screen.getByTestId("accepted-sources-flow_in")).toHaveTextContent(
        "flow,agent",
      );
      expect(screen.getByTestId("accepted-types-flow_in")).toHaveTextContent(
        "trigger,data",
      );
    });
  });

  describe("handle colors", () => {
    it("should use handle_color from matching input", () => {
      const schema = createMockSchema({
        inputs: [
          {
            id: "colored_in",
            label: "Colored Input",
            source_type: "flow",
            handle_color: "#ff0000",
          },
        ],
      });
      render(
        <ExpandedNodeHandles
          id="node-1"
          schema={schema}
          handlePositions={{}}
          handleTypes={{}}
          additionalHandles={[
            { id: "colored_in", type: "target", position: "top" },
          ]}
        />,
      );

      const handle = screen.getByTestId("handle-colored_in");
      expect(handle).toHaveStyle({ backgroundColor: "#ff0000" });
    });

    it("should use handle_color from matching output", () => {
      const schema = createMockSchema({
        outputs: [
          {
            id: "colored_out",
            label: "Colored Output",
            source_type: "flow",
            handle_color: "#00ff00",
          },
        ],
      });
      render(
        <ExpandedNodeHandles
          id="node-1"
          schema={schema}
          handlePositions={{}}
          handleTypes={{}}
          additionalHandles={[
            { id: "colored_out", type: "source", position: "bottom" },
          ]}
        />,
      );

      const handle = screen.getByTestId("handle-colored_out");
      expect(handle).toHaveStyle({ backgroundColor: "#00ff00" });
    });

    it("should use theme link color when no handle_color is specified", () => {
      const schema = createMockSchema({
        outputs: [
          { id: "plain_out", label: "Plain Output", source_type: "flow" },
        ],
      });
      render(
        <ExpandedNodeHandles
          id="node-1"
          schema={schema}
          handlePositions={{}}
          handleTypes={{}}
          additionalHandles={[
            { id: "plain_out", type: "source", position: "bottom" },
          ]}
        />,
      );

      const handle = screen.getByTestId("handle-plain_out");
      expect(handle).toHaveStyle({ backgroundColor: "#6366f1" });
    });
  });

  describe("handle labels", () => {
    it("should pass label as title", () => {
      const schema = createMockSchema();
      render(
        <ExpandedNodeHandles
          id="node-1"
          schema={schema}
          handlePositions={{}}
          handleTypes={{}}
          additionalHandles={[
            {
              id: "labeled",
              type: "source",
              position: "bottom",
              label: "My Label",
            },
          ]}
        />,
      );

      const handle = screen.getByTestId("handle-labeled");
      expect(handle).toHaveAttribute("title", "My Label");
    });

    it("should handle undefined label", () => {
      const schema = createMockSchema();
      render(
        <ExpandedNodeHandles
          id="node-1"
          schema={schema}
          handlePositions={{}}
          handleTypes={{}}
          additionalHandles={[
            { id: "unlabeled", type: "source", position: "bottom" },
          ]}
        />,
      );

      const handle = screen.getByTestId("handle-unlabeled");
      expect(handle).not.toHaveAttribute("title");
    });
  });

  describe("handle styling", () => {
    it("should apply consistent handle style", () => {
      const schema = createMockSchema();
      render(
        <ExpandedNodeHandles
          id="node-1"
          schema={schema}
          handlePositions={{}}
          handleTypes={{}}
          additionalHandles={[
            { id: "styled", type: "source", position: "bottom" },
          ]}
        />,
      );

      const handle = screen.getByTestId("handle-styled");
      expect(handle).toHaveStyle({
        width: "10px",
        height: "10px",
        border: "2px solid #ccc",
      });
    });
  });

  describe("empty state", () => {
    it("should render nothing when no additional handles", () => {
      const schema = createMockSchema();
      const { container } = render(
        <ExpandedNodeHandles
          id="node-1"
          schema={schema}
          handlePositions={{}}
          handleTypes={{}}
          additionalHandles={[]}
        />,
      );

      // The container should be empty (only fragment)
      expect(
        container.querySelectorAll("[data-testid^='handle-']"),
      ).toHaveLength(0);
    });
  });

  describe("node id passing", () => {
    it("should pass node id to handles", () => {
      const schema = createMockSchema();
      render(
        <ExpandedNodeHandles
          id="my-node-123"
          schema={schema}
          handlePositions={{}}
          handleTypes={{}}
          additionalHandles={[
            { id: "handle_a", type: "source", position: "bottom" },
          ]}
        />,
      );

      const handle = screen.getByTestId("handle-handle_a");
      expect(handle).toHaveAttribute("data-node-id", "my-node-123");
    });
  });

  describe("handle positions", () => {
    it("should pass handle positions to DraggableHandle", () => {
      const schema = createMockSchema();
      const handlePositions = {
        handle_x: { edge: "top" as const, percent: 30 },
      };
      render(
        <ExpandedNodeHandles
          id="node-1"
          schema={schema}
          handlePositions={handlePositions}
          handleTypes={{}}
          additionalHandles={[
            { id: "handle_x", type: "target", position: "top" },
          ]}
        />,
      );

      expect(screen.getByTestId("handle-handle_x")).toBeInTheDocument();
    });
  });

  describe("mixed handle types", () => {
    it("should render both source and target handles", () => {
      const schema = createMockSchema({
        inputs: [{ id: "in", label: "In", source_type: "flow" }],
        outputs: [{ id: "out", label: "Out", source_type: "flow" }],
      });
      render(
        <ExpandedNodeHandles
          id="node-1"
          schema={schema}
          handlePositions={{}}
          handleTypes={{}}
          additionalHandles={[
            { id: "in", type: "target", position: "top" },
            { id: "out", type: "source", position: "bottom" },
          ]}
        />,
      );

      const inHandle = screen.getByTestId("handle-in");
      const outHandle = screen.getByTestId("handle-out");

      expect(inHandle).toHaveAttribute("data-type", "target");
      expect(outHandle).toHaveAttribute("data-type", "source");
    });
  });
});
