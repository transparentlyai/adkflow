import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { DetailsViewHeader } from "@/components/agent-prism/DetailsView/DetailsViewHeader";
import type { TraceSpan } from "@evilmartians/agent-prism-types";

// Mock external dependencies
vi.mock("@evilmartians/agent-prism-data", () => ({
  getDurationMs: vi.fn(() => 1500),
  formatDuration: vi.fn(() => "1.5s"),
}));

vi.mock("lucide-react", () => ({
  Check: () => <svg data-testid="check-icon" />,
  Copy: () => <svg data-testid="copy-icon" />,
  Cpu: () => <svg data-testid="cpu-icon" />,
  FunctionSquare: () => <svg data-testid="function-icon" />,
}));

vi.mock("@/components/agent-prism/Badge", () => ({
  Badge: ({ label }: { label: string }) => (
    <span data-testid="badge">{label}</span>
  ),
}));

vi.mock("@/components/agent-prism/Avatar", () => ({
  Avatar: () => <div data-testid="avatar" />,
}));

vi.mock("@/components/agent-prism/IconButton", () => ({
  IconButton: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick: () => void;
  }) => (
    <button data-testid="icon-button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/agent-prism/PriceBadge", () => ({
  PriceBadge: ({ cost }: { cost: number }) => (
    <span data-testid="price-badge">${cost}</span>
  ),
}));

vi.mock("@/components/agent-prism/SpanBadge", () => ({
  SpanBadge: () => <span data-testid="span-badge" />,
}));

vi.mock("@/components/agent-prism/SpanCategoryAvatar", () => ({
  SpanCategoryAvatar: () => <div data-testid="category-avatar" />,
}));

vi.mock("@/components/agent-prism/SpanStatus", () => ({
  SpanStatus: () => <div data-testid="span-status" />,
}));

vi.mock("@/components/agent-prism/spanAttributeUtils", () => ({
  getModelName: vi.fn(() => null),
  getToolName: vi.fn(() => null),
}));

vi.mock("@/components/agent-prism/TimestampBadge", () => ({
  TimestampBadge: () => <span data-testid="timestamp-badge" />,
}));

vi.mock("@/components/agent-prism/TokensBadge", () => ({
  TokensBadge: () => <span data-testid="tokens-badge" />,
}));

describe("DetailsViewHeader", () => {
  const mockSpan: TraceSpan = {
    name: "test-span",
    title: "Test Span Title",
    type: "agent",
    status: "ok",
    startTime: Date.now(),
    endTime: Date.now() + 1500,
    traceId: "trace-1",
    spanId: "span-1",
    attributes: {},
    parentSpanId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should render span title", () => {
    render(<DetailsViewHeader data={mockSpan} />);
    expect(screen.getByText("Test Span Title")).toBeInTheDocument();
  });

  it("should render category avatar when no custom avatar", () => {
    render(<DetailsViewHeader data={mockSpan} />);
    expect(screen.getByTestId("category-avatar")).toBeInTheDocument();
  });

  it("should render custom avatar when provided", () => {
    render(<DetailsViewHeader data={mockSpan} avatar={{ name: "custom" }} />);
    expect(screen.getByTestId("avatar")).toBeInTheDocument();
    expect(screen.queryByTestId("category-avatar")).not.toBeInTheDocument();
  });

  it("should render span status", () => {
    render(<DetailsViewHeader data={mockSpan} />);
    expect(screen.getByTestId("span-status")).toBeInTheDocument();
  });

  it("should render span badge", () => {
    render(<DetailsViewHeader data={mockSpan} />);
    expect(screen.getByTestId("span-badge")).toBeInTheDocument();
  });

  it("should render latency", () => {
    render(<DetailsViewHeader data={mockSpan} />);
    expect(screen.getByText(/LATENCY:/)).toBeInTheDocument();
  });

  it("should render copy button when provided", () => {
    const onCopy = vi.fn();
    render(<DetailsViewHeader data={mockSpan} copyButton={{ onCopy }} />);
    expect(screen.getByTestId("icon-button")).toBeInTheDocument();
  });

  it("should call onCopy when copy button clicked", () => {
    const onCopy = vi.fn();
    render(<DetailsViewHeader data={mockSpan} copyButton={{ onCopy }} />);

    fireEvent.click(screen.getByTestId("icon-button"));
    expect(onCopy).toHaveBeenCalledWith(mockSpan);
  });

  it("should show check icon after copy", async () => {
    const onCopy = vi.fn();
    render(<DetailsViewHeader data={mockSpan} copyButton={{ onCopy }} />);

    fireEvent.click(screen.getByTestId("icon-button"));

    expect(screen.getByTestId("check-icon")).toBeInTheDocument();
  });

  it("should revert to copy icon after 2 seconds", async () => {
    const onCopy = vi.fn();
    render(<DetailsViewHeader data={mockSpan} copyButton={{ onCopy }} />);

    fireEvent.click(screen.getByTestId("icon-button"));

    expect(screen.getByTestId("check-icon")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByTestId("copy-icon")).toBeInTheDocument();
  });

  it("should render tokens badge when tokensCount is provided", () => {
    const spanWithTokens = { ...mockSpan, tokensCount: 100 };
    render(<DetailsViewHeader data={spanWithTokens} />);
    expect(screen.getByTestId("tokens-badge")).toBeInTheDocument();
  });

  it("should render price badge when cost is provided", () => {
    const spanWithCost = { ...mockSpan, cost: 0.005 };
    render(<DetailsViewHeader data={spanWithCost} />);
    expect(screen.getByTestId("price-badge")).toBeInTheDocument();
  });

  it("should render timestamp badge when startTime is provided", () => {
    render(<DetailsViewHeader data={mockSpan} />);
    expect(screen.getByTestId("timestamp-badge")).toBeInTheDocument();
  });

  it("should render custom actions when provided", () => {
    render(
      <DetailsViewHeader
        data={mockSpan}
        actions={<button data-testid="custom-action">Action</button>}
      />,
    );
    expect(screen.getByTestId("custom-action")).toBeInTheDocument();
  });

  it("should apply custom className when provided", () => {
    const { container } = render(
      <DetailsViewHeader data={mockSpan} className="custom-class" />,
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should use default className when not provided", () => {
    const { container } = render(<DetailsViewHeader data={mockSpan} />);
    expect(container.firstChild).toHaveClass("flex");
  });

  it("should render model badge when model name exists", async () => {
    const { getModelName } =
      await import("@/components/agent-prism/spanAttributeUtils");
    (getModelName as ReturnType<typeof vi.fn>).mockReturnValue("gpt-4");

    render(<DetailsViewHeader data={mockSpan} />);

    expect(screen.getByText("gpt-4")).toBeInTheDocument();
  });

  it("should render tool badge when tool name exists", async () => {
    const { getToolName } =
      await import("@/components/agent-prism/spanAttributeUtils");
    (getToolName as ReturnType<typeof vi.fn>).mockReturnValue("search");

    render(<DetailsViewHeader data={mockSpan} />);

    expect(screen.getByText("search")).toBeInTheDocument();
  });
});
