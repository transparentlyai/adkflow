import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import {
  ExpandAllButton,
  CollapseAllButton,
} from "@/components/agent-prism/CollapseAndExpandControls";

describe("CollapseAndExpandControls", () => {
  describe("ExpandAllButton", () => {
    it("should render expand all button", () => {
      const onExpandAll = vi.fn();
      render(<ExpandAllButton onExpandAll={onExpandAll} />);
      expect(screen.getByLabelText("Expand all")).toBeInTheDocument();
    });

    it("should call onExpandAll when clicked", () => {
      const onExpandAll = vi.fn();
      render(<ExpandAllButton onExpandAll={onExpandAll} />);

      fireEvent.click(screen.getByLabelText("Expand all"));

      expect(onExpandAll).toHaveBeenCalledTimes(1);
    });

    it("should pass through additional props", () => {
      const onExpandAll = vi.fn();
      render(
        <ExpandAllButton onExpandAll={onExpandAll} data-testid="expand" />,
      );
      expect(screen.getByTestId("expand")).toBeInTheDocument();
    });
  });

  describe("CollapseAllButton", () => {
    it("should render collapse all button", () => {
      const onCollapseAll = vi.fn();
      render(<CollapseAllButton onCollapseAll={onCollapseAll} />);
      expect(screen.getByLabelText("Collapse all")).toBeInTheDocument();
    });

    it("should call onCollapseAll when clicked", () => {
      const onCollapseAll = vi.fn();
      render(<CollapseAllButton onCollapseAll={onCollapseAll} />);

      fireEvent.click(screen.getByLabelText("Collapse all"));

      expect(onCollapseAll).toHaveBeenCalledTimes(1);
    });

    it("should pass through additional props", () => {
      const onCollapseAll = vi.fn();
      render(
        <CollapseAllButton
          onCollapseAll={onCollapseAll}
          data-testid="collapse"
        />,
      );
      expect(screen.getByTestId("collapse")).toBeInTheDocument();
    });
  });
});
