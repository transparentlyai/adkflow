import { describe, it, expect } from "vitest";
import {
  getMiniMapNodeColor,
  getCanvasStyles,
} from "@/components/hooks/canvas/canvasUtils";
import type { Node } from "@xyflow/react";
import type { Theme } from "@/lib/themes/types";

const mockTheme: Theme = {
  id: "test-theme",
  name: "Test Theme",
  colors: {
    nodes: {
      group: { header: "#group" },
      agent: { header: "#agent" },
      prompt: { header: "#prompt" },
      context: { header: "#context" },
      probe: { header: "#probe" },
      outputFile: { header: "#outputFile" },
      tool: { header: "#tool" },
      agentTool: { header: "#agentTool" },
      variable: { header: "#variable" },
      process: { header: "#process" },
      label: { header: "#label" },
      userInput: { header: "#userInput" },
      start: { header: "#start" },
      end: { header: "#end" },
    },
    edges: {
      hover: "#edgeHover",
      selected: "#edgeSelected",
    },
    background: "#background",
    border: "#border",
  },
} as unknown as Theme;

describe("canvasUtils", () => {
  describe("getMiniMapNodeColor", () => {
    const nodeTypes = [
      { type: "group", expected: "#group" },
      { type: "agent", expected: "#agent" },
      { type: "prompt", expected: "#prompt" },
      { type: "context", expected: "#context" },
      { type: "inputProbe", expected: "#probe" },
      { type: "outputProbe", expected: "#probe" },
      { type: "logProbe", expected: "#probe" },
      { type: "outputFile", expected: "#outputFile" },
      { type: "tool", expected: "#tool" },
      { type: "agentTool", expected: "#agentTool" },
      { type: "variable", expected: "#variable" },
      { type: "process", expected: "#process" },
      { type: "label", expected: "#label" },
      { type: "userInput", expected: "#userInput" },
      { type: "start", expected: "#start" },
      { type: "end", expected: "#end" },
    ];

    it.each(nodeTypes)(
      "should return correct color for $type node",
      ({ type, expected }) => {
        const node = {
          id: "test",
          type,
          position: { x: 0, y: 0 },
          data: {},
        } as Node;
        expect(getMiniMapNodeColor(node, mockTheme)).toBe(expected);
      },
    );

    it("should return label color for unknown node type", () => {
      const node = {
        id: "test",
        type: "unknown",
        position: { x: 0, y: 0 },
        data: {},
      } as Node;
      expect(getMiniMapNodeColor(node, mockTheme)).toBe("#label");
    });

    it("should return label color for undefined node type", () => {
      const node = { id: "test", position: { x: 0, y: 0 }, data: {} } as Node;
      expect(getMiniMapNodeColor(node, mockTheme)).toBe("#label");
    });
  });

  describe("getCanvasStyles", () => {
    it("should return CSS string", () => {
      const styles = getCanvasStyles(mockTheme);
      expect(typeof styles).toBe("string");
    });

    it("should include edge hover color", () => {
      const styles = getCanvasStyles(mockTheme);
      expect(styles).toContain("#edgeHover");
    });

    it("should include edge selected color", () => {
      const styles = getCanvasStyles(mockTheme);
      expect(styles).toContain("#edgeSelected");
    });

    it("should include group node styles", () => {
      const styles = getCanvasStyles(mockTheme);
      expect(styles).toContain(".react-flow__node-group");
    });

    it("should include edge styles", () => {
      const styles = getCanvasStyles(mockTheme);
      expect(styles).toContain(".react-flow__edge");
    });

    it("should include controls button styles", () => {
      const styles = getCanvasStyles(mockTheme);
      expect(styles).toContain(".react-flow__controls-button");
    });
  });
});
