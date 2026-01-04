import { describe, it, expect } from "vitest";
import {
  LOG_LEVELS,
  LEVEL_COLORS,
  LOGGING_PRESETS,
  buildCategoryTree,
} from "@/components/RunPanel/debugPanelUtils";
import type { CategoryInfo } from "@/lib/api";

describe("debugPanelUtils", () => {
  describe("LOG_LEVELS", () => {
    it("should have all expected levels", () => {
      expect(LOG_LEVELS).toEqual(["DEBUG", "INFO", "WARNING", "ERROR", "OFF"]);
    });
  });

  describe("LEVEL_COLORS", () => {
    it("should have colors for all levels", () => {
      for (const level of LOG_LEVELS) {
        expect(LEVEL_COLORS[level]).toBeDefined();
        expect(typeof LEVEL_COLORS[level]).toBe("string");
      }
    });
  });

  describe("LOGGING_PRESETS", () => {
    it("should have expected presets", () => {
      const presetIds = LOGGING_PRESETS.map((p) => p.id);
      expect(presetIds).toContain("debug-all");
      expect(presetIds).toContain("production");
      expect(presetIds).toContain("silent");
      expect(presetIds).toContain("adk-debug");
    });

    describe("debug-all preset", () => {
      it("should set all categories to DEBUG", () => {
        const preset = LOGGING_PRESETS.find((p) => p.id === "debug-all");
        const categories: CategoryInfo[] = [
          { name: "runner", level: "INFO", enabled: true, children: [] },
          { name: "api", level: "INFO", enabled: true, children: [] },
        ];

        const result = preset!.apply(categories);

        expect(result.runner).toBe("DEBUG");
        expect(result.api).toBe("DEBUG");
      });
    });

    describe("production preset", () => {
      it("should return empty object", () => {
        const preset = LOGGING_PRESETS.find((p) => p.id === "production");
        const result = preset!.apply([]);

        expect(result).toEqual({});
      });
    });

    describe("silent preset", () => {
      it("should set all categories to OFF", () => {
        const preset = LOGGING_PRESETS.find((p) => p.id === "silent");
        const categories: CategoryInfo[] = [
          { name: "runner", level: "INFO", enabled: true, children: [] },
          { name: "api", level: "INFO", enabled: true, children: [] },
        ];

        const result = preset!.apply(categories);

        expect(result.runner).toBe("OFF");
        expect(result.api).toBe("OFF");
      });
    });

    describe("adk-debug preset", () => {
      it("should set specific categories to DEBUG", () => {
        const preset = LOGGING_PRESETS.find((p) => p.id === "adk-debug");
        const result = preset!.apply([]);

        expect(result.api).toBe("DEBUG");
        expect(result["api.request"]).toBe("DEBUG");
        expect(result.runner).toBe("DEBUG");
      });
    });
  });

  describe("buildCategoryTree", () => {
    it("should return empty array for empty input", () => {
      const result = buildCategoryTree([], {});
      expect(result).toEqual([]);
    });

    it("should build tree from flat categories", () => {
      const categories: CategoryInfo[] = [
        { name: "runner", level: "INFO", enabled: true, children: [] },
        { name: "runner.agent", level: "INFO", enabled: true, children: [] },
        { name: "runner.tool", level: "INFO", enabled: true, children: [] },
      ];

      const result = buildCategoryTree(categories, {});

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("runner");
      expect(result[0].children).toHaveLength(2);
    });

    it("should apply explicit levels", () => {
      const categories: CategoryInfo[] = [
        { name: "runner", level: "INFO", enabled: true, children: [] },
      ];
      const levels = { runner: "DEBUG" };

      const result = buildCategoryTree(categories, levels);

      expect(result[0].level).toBe("DEBUG");
      expect(result[0].effectiveLevel).toBe("DEBUG");
      expect(result[0].isInherited).toBe(false);
    });

    it("should inherit levels from parent", () => {
      const categories: CategoryInfo[] = [
        { name: "runner", level: "INFO", enabled: true, children: [] },
        { name: "runner.agent", level: "INFO", enabled: true, children: [] },
      ];
      const levels = { runner: "DEBUG" };

      const result = buildCategoryTree(categories, levels);

      expect(result[0].level).toBe("DEBUG");
      expect(result[0].children[0].level).toBe("DEBUG");
      expect(result[0].children[0].isInherited).toBe(true);
    });

    it("should use global level as fallback", () => {
      const categories: CategoryInfo[] = [
        { name: "runner", level: "INFO", enabled: true, children: [] },
      ];

      const result = buildCategoryTree(categories, {}, "WARNING");

      expect(result[0].effectiveLevel).toBe("WARNING");
      expect(result[0].isInherited).toBe(true);
    });

    it("should sort nodes alphabetically", () => {
      const categories: CategoryInfo[] = [
        { name: "zebra", level: "INFO", enabled: true, children: [] },
        { name: "alpha", level: "INFO", enabled: true, children: [] },
        { name: "beta", level: "INFO", enabled: true, children: [] },
      ];

      const result = buildCategoryTree(categories, {});

      expect(result[0].displayName).toBe("alpha");
      expect(result[1].displayName).toBe("beta");
      expect(result[2].displayName).toBe("zebra");
    });

    it("should handle orphan child nodes", () => {
      const categories: CategoryInfo[] = [
        { name: "runner.agent", level: "INFO", enabled: true, children: [] },
      ];

      const result = buildCategoryTree(categories, {});

      // Should become a root since parent doesn't exist
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("runner.agent");
    });

    it("should set correct depth", () => {
      const categories: CategoryInfo[] = [
        { name: "runner", level: "INFO", enabled: true, children: [] },
        { name: "runner.agent", level: "INFO", enabled: true, children: [] },
        {
          name: "runner.agent.config",
          level: "INFO",
          enabled: true,
          children: [],
        },
      ];

      const result = buildCategoryTree(categories, {});

      expect(result[0].depth).toBe(0);
      expect(result[0].children[0].depth).toBe(1);
      expect(result[0].children[0].children[0].depth).toBe(2);
    });
  });
});
