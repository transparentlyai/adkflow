import { describe, it, expect } from "vitest";
import {
  getDefaultLabelData,
  DEFAULT_FONT_SIZE,
  DEFAULT_WIDTH,
  EXPANDED_SIZE,
  FONT_FAMILIES,
  FONT_WEIGHTS,
  PRESET_COLORS,
  type LabelNodeData,
} from "@/components/nodes/LabelNode/types";

describe("LabelNode types", () => {
  describe("getDefaultLabelData", () => {
    it("should return default label data with all required properties", () => {
      const defaultData = getDefaultLabelData();

      expect(defaultData).toEqual({
        label: "Label",
        fontFamily: "sans-serif",
        fontWeight: "normal",
        fontStyle: "normal",
        textAlign: "left",
        color: "#374151",
      });
    });

    it("should return a new object each time", () => {
      const data1 = getDefaultLabelData();
      const data2 = getDefaultLabelData();

      expect(data1).not.toBe(data2);
      expect(data1).toEqual(data2);
    });
  });

  describe("constants", () => {
    it("should export DEFAULT_FONT_SIZE", () => {
      expect(DEFAULT_FONT_SIZE).toBe(14);
    });

    it("should export DEFAULT_WIDTH", () => {
      expect(DEFAULT_WIDTH).toBe(100);
    });

    it("should export EXPANDED_SIZE", () => {
      expect(EXPANDED_SIZE).toEqual({ width: 280, height: 320 });
    });
  });

  describe("FONT_FAMILIES", () => {
    it("should include common font families", () => {
      expect(FONT_FAMILIES).toEqual([
        { value: "sans-serif", label: "Sans Serif" },
        { value: "serif", label: "Serif" },
        { value: "monospace", label: "Monospace" },
        { value: "cursive", label: "Cursive" },
      ]);
    });

    it("should have value and label for each font", () => {
      FONT_FAMILIES.forEach((font) => {
        expect(font).toHaveProperty("value");
        expect(font).toHaveProperty("label");
        expect(typeof font.value).toBe("string");
        expect(typeof font.label).toBe("string");
      });
    });
  });

  describe("FONT_WEIGHTS", () => {
    it("should include common font weights", () => {
      expect(FONT_WEIGHTS).toEqual([
        { value: "normal", label: "Normal" },
        { value: "bold", label: "Bold" },
        { value: "lighter", label: "Light" },
      ]);
    });

    it("should have value and label for each weight", () => {
      FONT_WEIGHTS.forEach((weight) => {
        expect(weight).toHaveProperty("value");
        expect(weight).toHaveProperty("label");
        expect(typeof weight.value).toBe("string");
        expect(typeof weight.label).toBe("string");
      });
    });
  });

  describe("PRESET_COLORS", () => {
    it("should include 12 preset colors", () => {
      expect(PRESET_COLORS).toHaveLength(12);
    });

    it("should contain valid hex colors", () => {
      PRESET_COLORS.forEach((color) => {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });

    it("should include gray shades", () => {
      expect(PRESET_COLORS).toContain("#374151"); // gray-700
      expect(PRESET_COLORS).toContain("#1f2937"); // gray-800
      expect(PRESET_COLORS).toContain("#6b7280"); // gray-500
    });

    it("should include various colors", () => {
      expect(PRESET_COLORS).toContain("#dc2626"); // red
      expect(PRESET_COLORS).toContain("#16a34a"); // green
      expect(PRESET_COLORS).toContain("#2563eb"); // blue
    });
  });

  describe("LabelNodeData interface", () => {
    it("should allow creating a valid LabelNodeData object", () => {
      const data: LabelNodeData = {
        label: "Test",
        fontFamily: "serif",
        fontWeight: "bold",
        fontStyle: "italic",
        textAlign: "center",
        color: "#ff0000",
      };

      expect(data.label).toBe("Test");
      expect(data.fontFamily).toBe("serif");
      expect(data.textAlign).toBe("center");
    });

    it("should allow optional properties", () => {
      const minimalData: LabelNodeData = {
        label: "Minimal",
      };

      expect(minimalData.label).toBe("Minimal");
      expect(minimalData.fontFamily).toBeUndefined();
      expect(minimalData.expandedSize).toBeUndefined();
    });

    it("should allow expandedSize and position properties", () => {
      const data: LabelNodeData = {
        label: "Test",
        expandedSize: { width: 300, height: 400 },
        expandedPosition: { x: 100, y: 200 },
        contractedPosition: { x: 50, y: 100 },
        isExpanded: true,
      };

      expect(data.expandedSize).toEqual({ width: 300, height: 400 });
      expect(data.isExpanded).toBe(true);
    });

    it("should allow font scaling properties", () => {
      const data: LabelNodeData = {
        label: "Test",
        fontScaleWidth: 150,
        manuallyResized: true,
      };

      expect(data.fontScaleWidth).toBe(150);
      expect(data.manuallyResized).toBe(true);
    });
  });
});
