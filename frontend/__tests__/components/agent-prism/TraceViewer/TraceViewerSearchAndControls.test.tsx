import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TraceViewerSearchAndControls } from "@/components/agent-prism/TraceViewer/TraceViewerSearchAndControls";

// Mock child components
vi.mock("@/components/agent-prism/CollapseAndExpandControls", () => ({
  ExpandAllButton: ({ onExpandAll }: { onExpandAll: () => void }) => (
    <button data-testid="expand-all" onClick={onExpandAll}>
      Expand All
    </button>
  ),
  CollapseAllButton: ({ onCollapseAll }: { onCollapseAll: () => void }) => (
    <button data-testid="collapse-all" onClick={onCollapseAll}>
      Collapse All
    </button>
  ),
}));

vi.mock("@/components/agent-prism/SearchInput", () => ({
  SearchInput: ({
    id,
    value,
    onChange,
    placeholder,
  }: {
    id: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
  }) => (
    <input
      id={id}
      data-testid="search-input"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  ),
}));

describe("TraceViewerSearchAndControls", () => {
  const defaultProps = {
    searchValue: "",
    setSearchValue: vi.fn(),
    handleExpandAll: vi.fn(),
    handleCollapseAll: vi.fn(),
  };

  describe("rendering", () => {
    it("should render search input", () => {
      render(<TraceViewerSearchAndControls {...defaultProps} />);
      expect(screen.getByTestId("search-input")).toBeInTheDocument();
    });

    it("should render expand all button", () => {
      render(<TraceViewerSearchAndControls {...defaultProps} />);
      expect(screen.getByTestId("expand-all")).toBeInTheDocument();
    });

    it("should render collapse all button", () => {
      render(<TraceViewerSearchAndControls {...defaultProps} />);
      expect(screen.getByTestId("collapse-all")).toBeInTheDocument();
    });
  });

  describe("search", () => {
    it("should pass search value to input", () => {
      render(
        <TraceViewerSearchAndControls {...defaultProps} searchValue="test" />,
      );
      expect(screen.getByTestId("search-input")).toHaveValue("test");
    });

    it("should call setSearchValue on input change", () => {
      const setSearchValue = vi.fn();
      render(
        <TraceViewerSearchAndControls
          {...defaultProps}
          setSearchValue={setSearchValue}
        />,
      );

      fireEvent.change(screen.getByTestId("search-input"), {
        target: { value: "new value" },
      });

      expect(setSearchValue).toHaveBeenCalledWith("new value");
    });

    it("should have correct placeholder", () => {
      render(<TraceViewerSearchAndControls {...defaultProps} />);
      expect(screen.getByPlaceholderText("Search spans")).toBeInTheDocument();
    });
  });

  describe("expand/collapse", () => {
    it("should call handleExpandAll when expand button clicked", () => {
      const handleExpandAll = vi.fn();
      render(
        <TraceViewerSearchAndControls
          {...defaultProps}
          handleExpandAll={handleExpandAll}
        />,
      );

      fireEvent.click(screen.getByTestId("expand-all"));

      expect(handleExpandAll).toHaveBeenCalled();
    });

    it("should call handleCollapseAll when collapse button clicked", () => {
      const handleCollapseAll = vi.fn();
      render(
        <TraceViewerSearchAndControls
          {...defaultProps}
          handleCollapseAll={handleCollapseAll}
        />,
      );

      fireEvent.click(screen.getByTestId("collapse-all"));

      expect(handleCollapseAll).toHaveBeenCalled();
    });
  });
});
