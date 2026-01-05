import { describe, it, expect } from "vitest";
import {
  arraysEqual,
  getThemeColors,
  getExecutionStyle,
} from "@/components/nodes/custom/layouts/collapsedLayoutUtils";

describe("arraysEqual", () => {
  it("should return true for identical arrays", () => {
    expect(arraysEqual(["a", "b", "c"], ["a", "b", "c"])).toBe(true);
  });

  it("should return false for arrays with different lengths", () => {
    expect(arraysEqual(["a", "b"], ["a", "b", "c"])).toBe(false);
  });

  it("should return false for arrays with different elements", () => {
    expect(arraysEqual(["a", "b", "c"], ["a", "x", "c"])).toBe(false);
  });

  it("should return true for empty arrays", () => {
    expect(arraysEqual([], [])).toBe(true);
  });

  it("should return false when first element differs", () => {
    expect(arraysEqual(["x", "b", "c"], ["a", "b", "c"])).toBe(false);
  });

  it("should return false when last element differs", () => {
    expect(arraysEqual(["a", "b", "x"], ["a", "b", "c"])).toBe(false);
  });
});

describe("getThemeColors", () => {
  const mockTheme = {
    colors: {
      nodes: {
        agent: {
          header: "#4f46e5",
          headerHover: "#6366f1",
          text: "#fff",
          ring: "#818cf8",
        },
        tool: {
          header: "#059669",
        },
      },
    },
  };

  it("should return null when themeKey is undefined", () => {
    expect(getThemeColors(mockTheme as any, undefined)).toBeNull();
  });

  it("should return null when themeKey is empty string", () => {
    expect(getThemeColors(mockTheme as any, "")).toBeNull();
  });

  it("should return null when themeKey does not exist", () => {
    expect(getThemeColors(mockTheme as any, "nonexistent")).toBeNull();
  });

  it("should return colors for existing themeKey", () => {
    const colors = getThemeColors(mockTheme as any, "agent");
    expect(colors).toEqual({
      header: "#4f46e5",
      headerHover: "#6366f1",
      text: "#fff",
      ring: "#818cf8",
    });
  });
});

describe("getExecutionStyle", () => {
  it("should return empty object for undefined state", () => {
    expect(getExecutionStyle(undefined)).toEqual({});
  });

  it("should return running style", () => {
    const style = getExecutionStyle("running");
    expect(style.animation).toContain("pulse");
    expect(style.boxShadow).toBeDefined();
  });

  it("should return completed style", () => {
    const style = getExecutionStyle("completed");
    expect(style.boxShadow).toBeDefined();
    expect(style.transition).toContain("box-shadow");
  });

  it("should return error style", () => {
    const style = getExecutionStyle("error");
    expect(style.boxShadow).toBeDefined();
    expect(style.animation).toContain("pulse");
  });
});
