import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DetailsView } from "@/components/agent-prism/DetailsView/DetailsView";
import type { TraceSpan } from "@evilmartians/agent-prism-types";

// Mock child components
vi.mock("@/components/agent-prism/DetailsView/DetailsViewHeader", () => ({
  DetailsViewHeader: ({ data }: { data: TraceSpan }) => (
    <div data-testid="details-header">{data.name}</div>
  ),
}));

vi.mock(
  "@/components/agent-prism/DetailsView/DetailsViewInputOutputTab",
  () => ({
    DetailsViewInputOutputTab: () => (
      <div data-testid="input-output-tab">Input Output Content</div>
    ),
  }),
);

vi.mock(
  "@/components/agent-prism/DetailsView/DetailsViewAttributesTab",
  () => ({
    DetailsViewAttributesTab: () => (
      <div data-testid="attributes-tab">Attributes Content</div>
    ),
  }),
);

vi.mock("@/components/agent-prism/DetailsView/DetailsViewRawDataTab", () => ({
  DetailsViewRawDataTab: () => (
    <div data-testid="raw-tab">Raw Data Content</div>
  ),
}));

vi.mock("@/components/agent-prism/TabSelector", () => ({
  TabSelector: ({
    items,
    value,
    onValueChange,
  }: {
    items: Array<{ value: string; label: string }>;
    value: string;
    onValueChange: (v: string) => void;
  }) => (
    <div data-testid="tab-selector">
      {items.map((item) => (
        <button
          key={item.value}
          data-active={value === item.value}
          onClick={() => onValueChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

const createMockSpan = (overrides: Partial<TraceSpan> = {}): TraceSpan => ({
  id: "test-span",
  traceId: "test-trace",
  name: "Test Span",
  type: "span",
  startTime: 0,
  endTime: 100,
  duration: 100,
  children: [],
  parent: null,
  parentId: null,
  depth: 0,
  raw: "{}",
  ...overrides,
});

describe("DetailsView", () => {
  const defaultProps = {
    data: createMockSpan(),
  };

  describe("rendering", () => {
    it("should render header", () => {
      render(<DetailsView {...defaultProps} />);
      expect(screen.getByTestId("details-header")).toBeInTheDocument();
    });

    it("should render tab selector", () => {
      render(<DetailsView {...defaultProps} />);
      expect(screen.getByTestId("tab-selector")).toBeInTheDocument();
    });

    it("should render input-output tab by default", () => {
      render(<DetailsView {...defaultProps} />);
      expect(screen.getByTestId("input-output-tab")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(
        <DetailsView {...defaultProps} className="custom-class" />,
      );
      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("tabs", () => {
    it("should show In/Out tab", () => {
      render(<DetailsView {...defaultProps} />);
      expect(screen.getByText("In/Out")).toBeInTheDocument();
    });

    it("should show Attributes tab", () => {
      render(<DetailsView {...defaultProps} />);
      expect(screen.getByText("Attributes")).toBeInTheDocument();
    });

    it("should show RAW tab", () => {
      render(<DetailsView {...defaultProps} />);
      expect(screen.getByText("RAW")).toBeInTheDocument();
    });

    it("should switch to attributes tab when clicked", async () => {
      const user = userEvent.setup();
      render(<DetailsView {...defaultProps} />);

      await user.click(screen.getByText("Attributes"));

      expect(screen.getByTestId("attributes-tab")).toBeInTheDocument();
      expect(screen.queryByTestId("input-output-tab")).not.toBeInTheDocument();
    });

    it("should switch to raw tab when clicked", async () => {
      const user = userEvent.setup();
      render(<DetailsView {...defaultProps} />);

      await user.click(screen.getByText("RAW"));

      expect(screen.getByTestId("raw-tab")).toBeInTheDocument();
      expect(screen.queryByTestId("input-output-tab")).not.toBeInTheDocument();
    });

    it("should call onTabChange when tab changes", async () => {
      const user = userEvent.setup();
      const onTabChange = vi.fn();
      render(<DetailsView {...defaultProps} onTabChange={onTabChange} />);

      await user.click(screen.getByText("Attributes"));

      expect(onTabChange).toHaveBeenCalledWith("attributes");
    });

    it("should respect defaultTab prop", () => {
      render(<DetailsView {...defaultProps} defaultTab="raw" />);
      expect(screen.getByTestId("raw-tab")).toBeInTheDocument();
    });
  });

  describe("custom header", () => {
    it("should render custom header as ReactNode", () => {
      render(
        <DetailsView
          {...defaultProps}
          customHeader={<div data-testid="custom-header">Custom Header</div>}
        />,
      );
      expect(screen.getByTestId("custom-header")).toBeInTheDocument();
      expect(screen.queryByTestId("details-header")).not.toBeInTheDocument();
    });

    it("should render custom header as render function", () => {
      render(
        <DetailsView
          {...defaultProps}
          customHeader={({ data }) => (
            <div data-testid="custom-header-fn">{data.name} Custom</div>
          )}
        />,
      );
      expect(screen.getByTestId("custom-header-fn")).toBeInTheDocument();
      expect(screen.getByText("Test Span Custom")).toBeInTheDocument();
    });
  });

  describe("header actions", () => {
    it("should pass headerActions as ReactNode", () => {
      render(
        <DetailsView
          {...defaultProps}
          headerActions={<button>Action</button>}
        />,
      );
      // The default header would receive these actions
      expect(screen.getByTestId("details-header")).toBeInTheDocument();
    });

    it("should call headerActions function with data", () => {
      const headerActionsFn = vi.fn(() => <button>Dynamic Action</button>);
      render(<DetailsView {...defaultProps} headerActions={headerActionsFn} />);
      expect(headerActionsFn).toHaveBeenCalledWith(defaultProps.data);
    });
  });
});
