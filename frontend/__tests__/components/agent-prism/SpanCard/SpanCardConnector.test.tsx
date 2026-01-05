import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SpanCardConnector } from "@/components/agent-prism/SpanCard/SpanCardConnector";

describe("SpanCardConnector", () => {
  describe("empty type", () => {
    it("should render empty div for empty type", () => {
      const { container } = render(<SpanCardConnector type="empty" />);
      expect(container.firstChild).toHaveClass("w-5", "shrink-0", "grow");
    });
  });

  describe("vertical type", () => {
    it("should render vertical connector", () => {
      const { container } = render(<SpanCardConnector type="vertical" />);
      expect(container.firstChild).toHaveClass(
        "relative",
        "w-5",
        "shrink-0",
        "grow",
      );
    });
  });

  describe("horizontal type", () => {
    it("should render horizontal connector", () => {
      const { container } = render(<SpanCardConnector type="horizontal" />);
      expect(container.firstChild).toHaveClass(
        "relative",
        "w-5",
        "shrink-0",
        "grow",
      );
    });
  });

  describe("t-right type", () => {
    it("should render t-right connector with vertical and horizontal lines", () => {
      const { container } = render(<SpanCardConnector type="t-right" />);
      expect(container.firstChild).toHaveClass(
        "relative",
        "w-5",
        "shrink-0",
        "grow",
      );
      // Check for both vertical and horizontal lines
      expect(
        container.querySelectorAll(".bg-agentprism-secondary").length,
      ).toBe(2);
    });
  });

  describe("corner-top-right type", () => {
    it("should render corner-top-right connector", () => {
      const { container } = render(
        <SpanCardConnector type="corner-top-right" />,
      );
      expect(container.firstChild).toHaveClass(
        "relative",
        "w-5",
        "shrink-0",
        "grow",
      );
      // Check for corner elements
      expect(
        container.querySelectorAll(".bg-agentprism-secondary").length,
      ).toBe(3);
    });
  });
});
