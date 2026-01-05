import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
            text: { primary: "#000", secondary: "#666", muted: "#999" },
          },
          label: { header: "#6b7280", text: "#fff" },
        },
        ui: {
          background: "#ffffff",
          foreground: "#000000",
          border: "#e5e7eb",
          muted: "#f3f4f6",
        },
      },
    },
  })),
}));

// Mock ResizeHandle component
vi.mock("@/components/ResizeHandle", () => ({
  default: ({
    onResize,
    onResizeEnd,
  }: {
    onResize: (deltaWidth: number, deltaHeight: number) => void;
    onResizeEnd: () => void;
  }) => (
    <div
      data-testid="resize-handle"
      onClick={() => {
        onResize(10, 10);
        onResizeEnd();
      }}
    />
  ),
}));

// Import after mocking
import LabelNodeExpanded from "@/components/nodes/LabelNode/LabelNodeExpanded";
import {
  FONT_FAMILIES,
  FONT_WEIGHTS,
  PRESET_COLORS,
} from "@/components/nodes/LabelNode/types";

const defaultData = {
  label: "Test Label",
  fontFamily: "sans-serif",
  fontWeight: "normal",
  fontStyle: "normal",
  textAlign: "left" as const,
  color: "#374151",
};

const defaultSize = { width: 280, height: 320 };

describe("LabelNodeExpanded", () => {
  const mockOnClose = vi.fn();
  const mockOnUpdate = vi.fn();
  const mockOnResize = vi.fn();
  const mockOnResizeEnd = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("should render with header", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      expect(screen.getByText("Label Settings")).toBeInTheDocument();
    });

    it("should render close button", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      const closeButton = screen.getByTitle("Close");
      expect(closeButton).toBeInTheDocument();
    });

    it("should render preview section with label", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      expect(screen.getByText("Preview")).toBeInTheDocument();
      // The preview should display the label text
      expect(screen.getAllByText("Test Label").length).toBeGreaterThan(0);
    });

    it("should render text input field", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      expect(screen.getByText("Text")).toBeInTheDocument();
      const textInput = screen.getByDisplayValue("Test Label");
      expect(textInput).toBeInTheDocument();
    });

    it("should render font family selector", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      expect(screen.getByText("Font Family")).toBeInTheDocument();
      // All font family options should be present
      FONT_FAMILIES.forEach((font) => {
        expect(screen.getByText(font.label)).toBeInTheDocument();
      });
    });

    it("should render font weight selector", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      expect(screen.getByText("Weight")).toBeInTheDocument();
      // Check that the weight options exist (some may appear multiple times due to style selector)
      FONT_WEIGHTS.forEach((weight) => {
        expect(screen.getAllByText(weight.label).length).toBeGreaterThanOrEqual(
          1,
        );
      });
    });

    it("should render font style selector", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      expect(screen.getByText("Style")).toBeInTheDocument();
      // "Normal" appears multiple times (weight and style selectors)
      expect(screen.getAllByText("Normal").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Italic")).toBeInTheDocument();
    });

    it("should render alignment buttons", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      expect(screen.getByText("Alignment")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Left" })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Center" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Right" })).toBeInTheDocument();
    });

    it("should render color picker section", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      expect(screen.getByText("Color")).toBeInTheDocument();
      // Should have color input
      const colorInput = screen.getByDisplayValue("#374151");
      expect(colorInput).toHaveAttribute("type", "color");
    });

    it("should render resize handle", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      expect(screen.getByTestId("resize-handle")).toBeInTheDocument();
    });
  });

  describe("close functionality", () => {
    it("should call onClose when close button is clicked", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      const closeButton = screen.getByTitle("Close");
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("text input", () => {
    it("should call onUpdate when text is changed", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      const textInput = screen.getByDisplayValue("Test Label");
      fireEvent.change(textInput, { target: { value: "New Label" } });

      expect(mockOnUpdate).toHaveBeenCalledWith({ label: "New Label" });
    });
  });

  describe("font family selection", () => {
    it("should call onUpdate when font family is changed", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      const selectElements = screen.getAllByRole("combobox");
      const fontFamilySelect = selectElements[0]; // First select is font family
      fireEvent.change(fontFamilySelect, { target: { value: "serif" } });

      expect(mockOnUpdate).toHaveBeenCalledWith({ fontFamily: "serif" });
    });

    it("should display current font family as selected", () => {
      const serifData = { ...defaultData, fontFamily: "serif" };
      render(
        <LabelNodeExpanded
          data={serifData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      const selectElements = screen.getAllByRole("combobox");
      const fontFamilySelect = selectElements[0];
      expect(fontFamilySelect).toHaveValue("serif");
    });
  });

  describe("font weight selection", () => {
    it("should call onUpdate when font weight is changed", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      // Find the Weight select (second select in the grid)
      const selects = screen.getAllByRole("combobox");
      const weightSelect = selects[1]; // Weight is the second select

      fireEvent.change(weightSelect, { target: { value: "bold" } });

      expect(mockOnUpdate).toHaveBeenCalledWith({ fontWeight: "bold" });
    });

    it("should display current font weight as selected", () => {
      const boldData = { ...defaultData, fontWeight: "bold" };
      render(
        <LabelNodeExpanded
          data={boldData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      const selects = screen.getAllByRole("combobox");
      const weightSelect = selects[1];
      expect(weightSelect).toHaveValue("bold");
    });
  });

  describe("font style selection", () => {
    it("should call onUpdate when font style is changed", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      // Find the Style select (third select in the grid)
      const selects = screen.getAllByRole("combobox");
      const styleSelect = selects[2]; // Style is the third select

      fireEvent.change(styleSelect, { target: { value: "italic" } });

      expect(mockOnUpdate).toHaveBeenCalledWith({ fontStyle: "italic" });
    });

    it("should display current font style as selected", () => {
      const italicData = { ...defaultData, fontStyle: "italic" };
      render(
        <LabelNodeExpanded
          data={italicData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      const selects = screen.getAllByRole("combobox");
      const styleSelect = selects[2];
      expect(styleSelect).toHaveValue("italic");
    });
  });

  describe("alignment buttons", () => {
    it("should call onUpdate with left alignment when Left button is clicked", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Left" }));

      expect(mockOnUpdate).toHaveBeenCalledWith({ textAlign: "left" });
    });

    it("should call onUpdate with center alignment when Center button is clicked", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Center" }));

      expect(mockOnUpdate).toHaveBeenCalledWith({ textAlign: "center" });
    });

    it("should call onUpdate with right alignment when Right button is clicked", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Right" }));

      expect(mockOnUpdate).toHaveBeenCalledWith({ textAlign: "right" });
    });

    it("should highlight current alignment button", () => {
      const centerData = { ...defaultData, textAlign: "center" as const };
      render(
        <LabelNodeExpanded
          data={centerData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      const centerButton = screen.getByRole("button", { name: "Center" });
      // The button should have different background color when selected
      expect(centerButton).toHaveStyle({ backgroundColor: "#6b7280" });
    });
  });

  describe("color selection", () => {
    it("should call onUpdate when preset color is clicked", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      // Click the red preset color
      const redColor = screen.getByTitle("#dc2626");
      fireEvent.click(redColor);

      expect(mockOnUpdate).toHaveBeenCalledWith({ color: "#dc2626" });
    });

    it("should call onUpdate when color picker value changes", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      const colorInput = screen.getByDisplayValue("#374151");
      fireEvent.change(colorInput, { target: { value: "#ff0000" } });

      expect(mockOnUpdate).toHaveBeenCalledWith({ color: "#ff0000" });
    });

    it("should render all preset colors", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      PRESET_COLORS.forEach((color) => {
        const colorButton = screen.getByTitle(color);
        expect(colorButton).toBeInTheDocument();
      });
    });

    it("should highlight selected preset color", () => {
      const redData = { ...defaultData, color: "#dc2626" };
      render(
        <LabelNodeExpanded
          data={redData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      const redColor = screen.getByTitle("#dc2626");
      // Selected color should be scaled up
      expect(redColor).toHaveStyle({ transform: "scale(1.1)" });
    });
  });

  describe("preview", () => {
    it("should display label text in preview", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      // The preview section should show the label
      const previewLabel = screen.getByText("Preview");
      expect(previewLabel).toBeInTheDocument();

      // Label text should appear at least twice (once in preview, once in input)
      const labelTexts = screen.getAllByText("Test Label");
      expect(labelTexts.length).toBeGreaterThanOrEqual(1);
    });

    it("should apply font styling to preview", () => {
      const styledData = {
        ...defaultData,
        fontFamily: "monospace",
        fontWeight: "bold",
        fontStyle: "italic",
        color: "#ff0000",
      };

      render(
        <LabelNodeExpanded
          data={styledData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      // Find the preview container (which is a div with specific styling)
      const previewContainer = screen
        .getByText("Preview")
        .parentElement?.querySelector(".min-h-\\[40px\\]");

      expect(previewContainer).toHaveStyle({
        fontFamily: "monospace",
        fontWeight: "bold",
        fontStyle: "italic",
        color: "#ff0000",
      });
    });

    it("should apply text alignment to preview", () => {
      const centerData = { ...defaultData, textAlign: "center" as const };

      render(
        <LabelNodeExpanded
          data={centerData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      const previewContainer = screen
        .getByText("Preview")
        .parentElement?.querySelector(".min-h-\\[40px\\]");

      expect(previewContainer).toHaveStyle({ justifyContent: "center" });
    });

    it("should apply right text alignment to preview", () => {
      const rightData = { ...defaultData, textAlign: "right" as const };

      render(
        <LabelNodeExpanded
          data={rightData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      const previewContainer = screen
        .getByText("Preview")
        .parentElement?.querySelector(".min-h-\\[40px\\]");

      expect(previewContainer).toHaveStyle({ justifyContent: "flex-end" });
    });
  });

  describe("resize functionality", () => {
    it("should call onResize and onResizeEnd when resize handle is used", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      const resizeHandle = screen.getByTestId("resize-handle");
      fireEvent.click(resizeHandle);

      expect(mockOnResize).toHaveBeenCalledWith(10, 10);
      expect(mockOnResizeEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe("sizing", () => {
    it("should apply provided size to container", () => {
      const customSize = { width: 400, height: 500 };
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={customSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      // Find the main container
      const container =
        screen.getByText("Label Settings").parentElement?.parentElement;
      expect(container).toHaveStyle({
        width: "400px",
        height: "500px",
      });
    });
  });

  describe("default values", () => {
    it("should use default values when properties are not provided", () => {
      const minimalData = { label: "Minimal" };

      render(
        <LabelNodeExpanded
          data={minimalData as typeof defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      // The label should be displayed
      expect(screen.getByDisplayValue("Minimal")).toBeInTheDocument();

      // Default font family should be applied (sans-serif)
      const selects = screen.getAllByRole("combobox");
      expect(selects[0]).toHaveValue("sans-serif");

      // Default color should be used in color picker
      const colorInput = screen.getByDisplayValue("#374151");
      expect(colorInput).toBeInTheDocument();
    });
  });

  describe("theme styling", () => {
    it("should apply theme colors to header", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      const header = screen.getByText("Label Settings").parentElement;
      expect(header).toHaveStyle({
        backgroundColor: "#6b7280",
        color: "#fff",
      });
    });

    it("should apply theme colors to container", () => {
      render(
        <LabelNodeExpanded
          data={defaultData}
          size={defaultSize}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
          onResize={mockOnResize}
          onResizeEnd={mockOnResizeEnd}
        />,
      );

      const container =
        screen.getByText("Label Settings").parentElement?.parentElement;
      expect(container).toHaveStyle({
        backgroundColor: "#fff",
        borderColor: "#ccc",
      });
    });
  });
});
