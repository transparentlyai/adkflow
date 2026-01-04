import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { TimestampBadge } from "@/components/agent-prism/TimestampBadge";

describe("TimestampBadge", () => {
  it("should render formatted timestamp", () => {
    const timestamp = new Date("2024-01-15T10:30:00Z").getTime();
    render(<TimestampBadge timestamp={timestamp} data-testid="badge" />);

    const badge = screen.getByTestId("badge");
    expect(badge).toBeInTheDocument();
  });

  it("should accept size prop", () => {
    const timestamp = Date.now();
    render(
      <TimestampBadge timestamp={timestamp} size="6" data-testid="badge" />,
    );

    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("h-6");
  });

  it("should pass through additional props", () => {
    const timestamp = Date.now();
    render(<TimestampBadge timestamp={timestamp} data-testid="timestamp" />);
    expect(screen.getByTestId("timestamp")).toBeInTheDocument();
  });

  it("should render timestamp as locale string", () => {
    const timestamp = Date.now();
    render(<TimestampBadge timestamp={timestamp} data-testid="badge" />);

    // Just verify the badge contains some text (locale-dependent format)
    const badge = screen.getByTestId("badge");
    expect(badge.textContent).toBeTruthy();
  });

  it("should render with default size 4", () => {
    const timestamp = Date.now();
    render(<TimestampBadge timestamp={timestamp} data-testid="badge" />);
    expect(screen.getByTestId("badge")).toHaveClass("h-4");
  });

  it("should accept size 5", () => {
    const timestamp = Date.now();
    render(
      <TimestampBadge timestamp={timestamp} size="5" data-testid="badge" />,
    );
    expect(screen.getByTestId("badge")).toHaveClass("h-5");
  });

  it("should accept size 7", () => {
    const timestamp = Date.now();
    render(
      <TimestampBadge timestamp={timestamp} size="7" data-testid="badge" />,
    );
    expect(screen.getByTestId("badge")).toHaveClass("h-7");
  });

  it("should accept custom className", () => {
    const timestamp = Date.now();
    render(
      <TimestampBadge
        timestamp={timestamp}
        className="custom-class"
        data-testid="badge"
      />,
    );
    expect(screen.getByTestId("badge")).toHaveClass("custom-class");
  });

  it("should handle zero timestamp (Unix epoch)", () => {
    render(<TimestampBadge timestamp={0} data-testid="badge" />);
    const badge = screen.getByTestId("badge");
    // Should render the epoch date
    expect(badge.textContent).toBeTruthy();
  });

  it("should handle timestamps in the past", () => {
    const pastTimestamp = new Date("2020-06-15T12:00:00Z").getTime();
    render(<TimestampBadge timestamp={pastTimestamp} data-testid="badge" />);
    const badge = screen.getByTestId("badge");
    expect(badge.textContent).toBeTruthy();
  });
});
