import { describe, it, expect } from "vitest";
import {
  LAYOUT_CONSTANTS,
  DEFAULT_VIEW_OPTIONS,
  getContentWidth,
  getGridTemplateColumns,
  getContentPadding,
  getConnectorsLayout,
} from "@/components/agent-prism/SpanCard/SpanCardLayout";

describe("SpanCardLayout", () => {
  describe("LAYOUT_CONSTANTS", () => {
    it("should define CONNECTOR_WIDTH", () => {
      expect(LAYOUT_CONSTANTS.CONNECTOR_WIDTH).toBe(20);
    });

    it("should define CONTENT_BASE_WIDTH", () => {
      expect(LAYOUT_CONSTANTS.CONTENT_BASE_WIDTH).toBe(320);
    });
  });

  describe("DEFAULT_VIEW_OPTIONS", () => {
    it("should have withStatus true", () => {
      expect(DEFAULT_VIEW_OPTIONS.withStatus).toBe(true);
    });

    it("should have expandButton inside", () => {
      expect(DEFAULT_VIEW_OPTIONS.expandButton).toBe("inside");
    });
  });

  describe("getContentWidth", () => {
    it("should return base width minus level offset for level 0", () => {
      const result = getContentWidth({
        level: 0,
        hasExpandButton: false,
        contentPadding: 0,
        expandButton: "inside",
      });
      expect(result).toBe(320);
    });

    it("should subtract connector width per level", () => {
      const result = getContentWidth({
        level: 2,
        hasExpandButton: false,
        contentPadding: 0,
        expandButton: "inside",
      });
      expect(result).toBe(280); // 320 - (2 * 20)
    });

    it("should subtract connector width when has expand button inside", () => {
      const result = getContentWidth({
        level: 0,
        hasExpandButton: true,
        contentPadding: 0,
        expandButton: "inside",
      });
      expect(result).toBe(300); // 320 - 20
    });

    it("should subtract connector width when expand button is outside at level 0", () => {
      const result = getContentWidth({
        level: 0,
        hasExpandButton: false,
        contentPadding: 0,
        expandButton: "outside",
      });
      expect(result).toBe(300); // 320 - 20
    });

    it("should not subtract extra width for outside button at non-zero level", () => {
      const result = getContentWidth({
        level: 1,
        hasExpandButton: false,
        contentPadding: 0,
        expandButton: "outside",
      });
      expect(result).toBe(300); // 320 - 20 (level only)
    });

    it("should subtract content padding", () => {
      const result = getContentWidth({
        level: 1,
        hasExpandButton: false,
        contentPadding: 8,
        expandButton: "inside",
      });
      expect(result).toBe(292); // 320 - 20 - 8
    });

    it("should handle complex case with all factors", () => {
      const result = getContentWidth({
        level: 2,
        hasExpandButton: true,
        contentPadding: 4,
        expandButton: "inside",
      });
      expect(result).toBe(256); // 320 - 40 (level) - 20 (button) - 4 (padding)
    });
  });

  describe("getGridTemplateColumns", () => {
    it("should return two columns for inside expand button", () => {
      const result = getGridTemplateColumns({
        connectorsColumnWidth: 60,
        expandButton: "inside",
      });
      expect(result).toBe("60px 1fr");
    });

    it("should return three columns for outside expand button", () => {
      const result = getGridTemplateColumns({
        connectorsColumnWidth: 60,
        expandButton: "outside",
      });
      expect(result).toBe("60px 1fr 20px");
    });

    it("should use CONNECTOR_WIDTH constant for outside button column", () => {
      const result = getGridTemplateColumns({
        connectorsColumnWidth: 100,
        expandButton: "outside",
      });
      expect(result).toBe(`100px 1fr ${LAYOUT_CONSTANTS.CONNECTOR_WIDTH}px`);
    });
  });

  describe("getContentPadding", () => {
    it("should return 0 for level 0", () => {
      const result = getContentPadding({
        level: 0,
        hasExpandButton: false,
      });
      expect(result).toBe(0);
    });

    it("should return 0 for level 0 even with expand button", () => {
      const result = getContentPadding({
        level: 0,
        hasExpandButton: true,
      });
      expect(result).toBe(0);
    });

    it("should return 4 for non-zero level with expand button", () => {
      const result = getContentPadding({
        level: 1,
        hasExpandButton: true,
      });
      expect(result).toBe(4);
    });

    it("should return 8 for non-zero level without expand button", () => {
      const result = getContentPadding({
        level: 1,
        hasExpandButton: false,
      });
      expect(result).toBe(8);
    });

    it("should return 8 for level 2 without expand button", () => {
      const result = getContentPadding({
        level: 2,
        hasExpandButton: false,
      });
      expect(result).toBe(8);
    });

    it("should return 4 for level 3 with expand button", () => {
      const result = getContentPadding({
        level: 3,
        hasExpandButton: true,
      });
      expect(result).toBe(4);
    });
  });

  describe("getConnectorsLayout", () => {
    describe("level 0", () => {
      it("should return empty connectors for inside expand button", () => {
        const result = getConnectorsLayout({
          level: 0,
          hasExpandButton: false,
          isLastChild: false,
          prevConnectors: [],
          expandButton: "inside",
        });
        expect(result.connectors).toEqual([]);
        expect(result.connectorsColumnWidth).toBe(20);
      });

      it("should return vertical connector for outside expand button", () => {
        const result = getConnectorsLayout({
          level: 0,
          hasExpandButton: false,
          isLastChild: false,
          prevConnectors: [],
          expandButton: "outside",
        });
        expect(result.connectors).toEqual(["vertical"]);
        expect(result.connectorsColumnWidth).toBe(20);
      });
    });

    describe("level 1", () => {
      it("should return t-right connector when not last child", () => {
        const result = getConnectorsLayout({
          level: 1,
          hasExpandButton: false,
          isLastChild: false,
          prevConnectors: [],
          expandButton: "inside",
        });
        expect(result.connectors).toEqual(["t-right"]);
        expect(result.connectorsColumnWidth).toBe(20);
      });

      it("should return corner-top-right connector when last child", () => {
        const result = getConnectorsLayout({
          level: 1,
          hasExpandButton: false,
          isLastChild: true,
          prevConnectors: [],
          expandButton: "inside",
        });
        expect(result.connectors).toEqual(["corner-top-right"]);
        expect(result.connectorsColumnWidth).toBe(20);
      });

      it("should increase width when has expand button", () => {
        const result = getConnectorsLayout({
          level: 1,
          hasExpandButton: true,
          isLastChild: false,
          prevConnectors: [],
          expandButton: "inside",
        });
        expect(result.connectors).toEqual(["t-right"]);
        expect(result.connectorsColumnWidth).toBe(40); // 20 + 20
      });
    });

    describe("level 2", () => {
      it("should add vertical connector before t-right", () => {
        const result = getConnectorsLayout({
          level: 2,
          hasExpandButton: false,
          isLastChild: false,
          prevConnectors: ["vertical"],
          expandButton: "inside",
        });
        expect(result.connectors).toEqual(["vertical", "t-right"]);
        expect(result.connectorsColumnWidth).toBe(40);
      });

      it("should add vertical connector before corner", () => {
        const result = getConnectorsLayout({
          level: 2,
          hasExpandButton: false,
          isLastChild: true,
          prevConnectors: ["vertical"],
          expandButton: "inside",
        });
        expect(result.connectors).toEqual(["vertical", "corner-top-right"]);
        expect(result.connectorsColumnWidth).toBe(40);
      });
    });

    describe("level 3", () => {
      it("should add two vertical connectors before final connector", () => {
        const result = getConnectorsLayout({
          level: 3,
          hasExpandButton: false,
          isLastChild: false,
          prevConnectors: ["vertical", "vertical"],
          expandButton: "inside",
        });
        expect(result.connectors).toEqual(["vertical", "vertical", "t-right"]);
        expect(result.connectorsColumnWidth).toBe(60);
      });

      it("should calculate width with expand button", () => {
        const result = getConnectorsLayout({
          level: 3,
          hasExpandButton: true,
          isLastChild: false,
          prevConnectors: ["vertical", "vertical"],
          expandButton: "inside",
        });
        expect(result.connectors).toEqual(["vertical", "vertical", "t-right"]);
        expect(result.connectorsColumnWidth).toBe(80); // 60 + 20
      });
    });

    describe("previous connectors inheritance", () => {
      it("should replace with empty when prev connector is empty", () => {
        const result = getConnectorsLayout({
          level: 2,
          hasExpandButton: false,
          isLastChild: false,
          prevConnectors: ["empty"],
          expandButton: "inside",
        });
        expect(result.connectors).toEqual(["empty", "t-right"]);
      });

      it("should replace with empty when prev connector is corner-top-right", () => {
        const result = getConnectorsLayout({
          level: 2,
          hasExpandButton: false,
          isLastChild: false,
          prevConnectors: ["corner-top-right"],
          expandButton: "inside",
        });
        expect(result.connectors).toEqual(["empty", "t-right"]);
      });

      it("should preserve vertical connectors", () => {
        const result = getConnectorsLayout({
          level: 3,
          hasExpandButton: false,
          isLastChild: false,
          prevConnectors: ["vertical", "corner-top-right"],
          expandButton: "inside",
        });
        expect(result.connectors).toEqual(["vertical", "empty", "t-right"]);
      });

      it("should handle mixed previous connectors", () => {
        const result = getConnectorsLayout({
          level: 4,
          hasExpandButton: false,
          isLastChild: true,
          prevConnectors: ["vertical", "empty", "vertical"],
          expandButton: "inside",
        });
        expect(result.connectors).toEqual([
          "vertical",
          "empty",
          "vertical",
          "corner-top-right",
        ]);
      });
    });
  });
});
