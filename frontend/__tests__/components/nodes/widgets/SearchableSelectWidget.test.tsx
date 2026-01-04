import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import SearchableSelectWidget from "@/components/nodes/widgets/SearchableSelectWidget";

const mockTheme = {
  name: "test",
  colors: {
    nodes: {
      common: {
        container: { background: "#1e1e1e", border: "#333" },
        text: { primary: "#fff", secondary: "#aaa", muted: "#666" },
      },
      agent: { header: "#4f46e5" },
    },
  },
};

const mockField = {
  id: "searchable-select-field",
  label: "Searchable Select",
  widget: "searchable_select",
  options: [
    { value: "us-east", label: "US East (N. Virginia)" },
    { value: "us-west", label: "US West (Oregon)" },
    { value: "eu-west", label: "EU West (Ireland)" },
    { value: "ap-south", label: "Asia Pacific (Mumbai)" },
    { value: "ap-northeast", label: "Asia Pacific (Tokyo)" },
  ],
};

const defaultOptions = {
  disabled: false,
  theme: mockTheme,
  compact: false,
};

describe("SearchableSelectWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render trigger button", () => {
      render(
        <SearchableSelectWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should show 'Select...' placeholder when no value", () => {
      render(
        <SearchableSelectWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("Select...")).toBeInTheDocument();
    });

    it("should show selected option label", () => {
      render(
        <SearchableSelectWidget
          field={mockField}
          value="us-east"
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("US East (N. Virginia)")).toBeInTheDocument();
    });

    it("should show value if no matching label found", () => {
      render(
        <SearchableSelectWidget
          field={mockField}
          value="unknown-value"
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("unknown-value")).toBeInTheDocument();
    });

    it("should render chevron icon", () => {
      const { container } = render(
        <SearchableSelectWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should apply theme styles to trigger button", () => {
      render(
        <SearchableSelectWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const button = screen.getByRole("button");
      expect(button).toHaveStyle({
        backgroundColor: "#1e1e1e",
        borderColor: "#333",
        color: "#fff",
      });
    });
  });

  describe("dropdown behavior", () => {
    it("should open dropdown when clicking trigger", () => {
      render(
        <SearchableSelectWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      fireEvent.click(screen.getByRole("button"));

      // Should show search input
      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
    });

    it("should show all options when dropdown opens", () => {
      render(
        <SearchableSelectWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByText("US East (N. Virginia)")).toBeInTheDocument();
      expect(screen.getByText("US West (Oregon)")).toBeInTheDocument();
      expect(screen.getByText("EU West (Ireland)")).toBeInTheDocument();
      expect(screen.getByText("Asia Pacific (Mumbai)")).toBeInTheDocument();
      expect(screen.getByText("Asia Pacific (Tokyo)")).toBeInTheDocument();
    });

    it("should close dropdown when clicking outside", async () => {
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <SearchableSelectWidget
            field={mockField}
            value=""
            onChange={vi.fn()}
            options={defaultOptions}
          />
        </div>,
      );

      // Open dropdown
      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();

      // Click outside
      fireEvent.mouseDown(screen.getByTestId("outside"));

      await waitFor(() => {
        expect(
          screen.queryByPlaceholderText("Search..."),
        ).not.toBeInTheDocument();
      });
    });

    it("should rotate chevron when dropdown is open", () => {
      const { container } = render(
        <SearchableSelectWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const svg = container.querySelector("svg");

      // Initial state - not rotated
      expect(svg).not.toHaveClass("rotate-180");

      // Open dropdown
      fireEvent.click(screen.getByRole("button"));

      // Should be rotated
      expect(svg).toHaveClass("rotate-180");
    });
  });

  describe("search functionality", () => {
    it("should filter options based on search term", () => {
      render(
        <SearchableSelectWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      fireEvent.click(screen.getByRole("button"));
      fireEvent.change(screen.getByPlaceholderText("Search..."), {
        target: { value: "Asia" },
      });

      expect(screen.getByText("Asia Pacific (Mumbai)")).toBeInTheDocument();
      expect(screen.getByText("Asia Pacific (Tokyo)")).toBeInTheDocument();
      expect(
        screen.queryByText("US East (N. Virginia)"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("EU West (Ireland)")).not.toBeInTheDocument();
    });

    it("should filter options case-insensitively", () => {
      render(
        <SearchableSelectWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      fireEvent.click(screen.getByRole("button"));
      fireEvent.change(screen.getByPlaceholderText("Search..."), {
        target: { value: "ASIA" },
      });

      expect(screen.getByText("Asia Pacific (Mumbai)")).toBeInTheDocument();
      expect(screen.getByText("Asia Pacific (Tokyo)")).toBeInTheDocument();
    });

    it("should filter by value as well as label", () => {
      render(
        <SearchableSelectWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      fireEvent.click(screen.getByRole("button"));
      fireEvent.change(screen.getByPlaceholderText("Search..."), {
        target: { value: "eu-west" },
      });

      expect(screen.getByText("EU West (Ireland)")).toBeInTheDocument();
      expect(
        screen.queryByText("US East (N. Virginia)"),
      ).not.toBeInTheDocument();
    });

    it("should show 'No options found' when no match", () => {
      render(
        <SearchableSelectWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      fireEvent.click(screen.getByRole("button"));
      fireEvent.change(screen.getByPlaceholderText("Search..."), {
        target: { value: "xyz123" },
      });

      expect(screen.getByText("No options found")).toBeInTheDocument();
    });

    it("should clear search term when closing dropdown", async () => {
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <SearchableSelectWidget
            field={mockField}
            value=""
            onChange={vi.fn()}
            options={defaultOptions}
          />
        </div>,
      );

      // Open and search
      fireEvent.click(screen.getByRole("button"));
      fireEvent.change(screen.getByPlaceholderText("Search..."), {
        target: { value: "Asia" },
      });

      // Close dropdown
      fireEvent.mouseDown(screen.getByTestId("outside"));

      // Reopen - search should be cleared
      fireEvent.click(screen.getByRole("button"));
      const searchInput = screen.getByPlaceholderText(
        "Search...",
      ) as HTMLInputElement;
      expect(searchInput.value).toBe("");
    });
  });

  describe("selection", () => {
    it("should call onChange when option is selected", () => {
      const onChange = vi.fn();
      render(
        <SearchableSelectWidget
          field={mockField}
          value=""
          onChange={onChange}
          options={defaultOptions}
        />,
      );

      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getByText("EU West (Ireland)"));

      expect(onChange).toHaveBeenCalledWith("eu-west");
    });

    it("should close dropdown after selection", async () => {
      render(
        <SearchableSelectWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getByText("EU West (Ireland)"));

      await waitFor(() => {
        expect(
          screen.queryByPlaceholderText("Search..."),
        ).not.toBeInTheDocument();
      });
    });

    it("should clear search term after selection", async () => {
      render(
        <SearchableSelectWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      fireEvent.click(screen.getByRole("button"));
      fireEvent.change(screen.getByPlaceholderText("Search..."), {
        target: { value: "EU" },
      });
      fireEvent.click(screen.getByText("EU West (Ireland)"));

      // Reopen to check search is cleared
      fireEvent.click(screen.getByRole("button"));
      const searchInput = screen.getByPlaceholderText(
        "Search...",
      ) as HTMLInputElement;
      expect(searchInput.value).toBe("");
    });

    it("should highlight currently selected option", () => {
      render(
        <SearchableSelectWidget
          field={mockField}
          value="eu-west"
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      fireEvent.click(screen.getByRole("button"));

      // Find the option buttons in the dropdown
      const optionButtons = screen.getAllByRole("button").filter(
        (btn) => btn !== screen.getAllByRole("button")[0], // Exclude trigger button
      );

      // The EU West option should have the selected styling
      const euWestButton = optionButtons.find((btn) =>
        btn.textContent?.includes("EU West"),
      );
      expect(euWestButton).toHaveClass("bg-white/10");
    });
  });

  describe("keyboard navigation", () => {
    it("should close dropdown on Escape key", async () => {
      render(
        <SearchableSelectWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      fireEvent.click(screen.getByRole("button"));
      const searchInput = screen.getByPlaceholderText("Search...");

      fireEvent.keyDown(searchInput, { key: "Escape" });

      await waitFor(() => {
        expect(
          screen.queryByPlaceholderText("Search..."),
        ).not.toBeInTheDocument();
      });
    });

    it("should select single match on Enter key", () => {
      const onChange = vi.fn();
      render(
        <SearchableSelectWidget
          field={mockField}
          value=""
          onChange={onChange}
          options={defaultOptions}
        />,
      );

      fireEvent.click(screen.getByRole("button"));
      fireEvent.change(screen.getByPlaceholderText("Search..."), {
        target: { value: "Oregon" },
      });
      fireEvent.keyDown(screen.getByPlaceholderText("Search..."), {
        key: "Enter",
      });

      expect(onChange).toHaveBeenCalledWith("us-west");
    });

    it("should not select on Enter when multiple matches", () => {
      const onChange = vi.fn();
      render(
        <SearchableSelectWidget
          field={mockField}
          value=""
          onChange={onChange}
          options={defaultOptions}
        />,
      );

      fireEvent.click(screen.getByRole("button"));
      fireEvent.change(screen.getByPlaceholderText("Search..."), {
        target: { value: "US" },
      });
      fireEvent.keyDown(screen.getByPlaceholderText("Search..."), {
        key: "Enter",
      });

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("disabled state", () => {
    it("should disable trigger button when disabled", () => {
      render(
        <SearchableSelectWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={{ ...defaultOptions, disabled: true }}
        />,
      );

      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("should not open dropdown when disabled", () => {
      render(
        <SearchableSelectWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={{ ...defaultOptions, disabled: true }}
        />,
      );

      fireEvent.click(screen.getByRole("button"));

      expect(
        screen.queryByPlaceholderText("Search..."),
      ).not.toBeInTheDocument();
    });
  });

  describe("compact mode", () => {
    it("should apply compact styles when compact is true", () => {
      render(
        <SearchableSelectWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={{ ...defaultOptions, compact: true }}
        />,
      );

      const button = screen.getByRole("button");
      expect(button).toHaveClass("px-1.5", "py-0.5", "text-[11px]");
    });

    it("should apply normal styles when compact is false", () => {
      render(
        <SearchableSelectWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={{ ...defaultOptions, compact: false }}
        />,
      );

      const button = screen.getByRole("button");
      expect(button).toHaveClass("px-2", "py-1.5", "text-xs");
    });

    it("should use transparent background in compact mode", () => {
      render(
        <SearchableSelectWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={{ ...defaultOptions, compact: true }}
        />,
      );

      const button = screen.getByRole("button");
      // In compact mode, the class includes bg-transparent
      expect(button).toHaveClass("bg-transparent");
    });
  });

  describe("edge cases", () => {
    it("should handle null value", () => {
      render(
        <SearchableSelectWidget
          field={mockField}
          value={null}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("Select...")).toBeInTheDocument();
    });

    it("should handle undefined value", () => {
      render(
        <SearchableSelectWidget
          field={mockField}
          value={undefined}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("Select...")).toBeInTheDocument();
    });

    it("should handle empty options array", () => {
      const fieldWithNoOptions = {
        ...mockField,
        options: [],
      };

      render(
        <SearchableSelectWidget
          field={fieldWithNoOptions}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByText("No options found")).toBeInTheDocument();
    });

    it("should handle undefined options", () => {
      const fieldWithNoOptions = {
        ...mockField,
        options: undefined,
      };

      render(
        <SearchableSelectWidget
          field={fieldWithNoOptions}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByText("No options found")).toBeInTheDocument();
    });

    it("should handle many options", () => {
      const manyOptionsField = {
        ...mockField,
        options: Array.from({ length: 100 }, (_, i) => ({
          value: `opt${i}`,
          label: `Option ${i}`,
        })),
      };

      render(
        <SearchableSelectWidget
          field={manyOptionsField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      fireEvent.click(screen.getByRole("button"));

      // Should have max-height for scrolling
      const optionsList = screen.getByText("Option 0").parentElement;
      expect(optionsList).toHaveClass("max-h-48", "overflow-y-auto");
    });

    it("should handle options with special characters", () => {
      const specialField = {
        ...mockField,
        options: [
          { value: "special", label: 'Option with <special> & "chars"' },
        ],
      };

      render(
        <SearchableSelectWidget
          field={specialField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      fireEvent.click(screen.getByRole("button"));

      expect(
        screen.getByText('Option with <special> & "chars"'),
      ).toBeInTheDocument();
    });
  });

  describe("focus behavior", () => {
    it("should focus search input when dropdown opens", async () => {
      render(
        <SearchableSelectWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search...")).toHaveFocus();
      });
    });
  });
});
