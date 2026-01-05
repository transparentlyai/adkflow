import { describe, it, expect } from "vitest";
import {
  LOG_LEVELS,
  LEVEL_STYLES,
  LEVEL_BG_STYLES,
  LEVEL_ICONS,
} from "@/components/LogExplorer/logExplorerUtils";
import { AlertOctagon, AlertTriangle, Bug, Info, XCircle } from "lucide-react";

describe("logExplorerUtils constants", () => {
  describe("LOG_LEVELS", () => {
    it("should have all log levels in correct order", () => {
      expect(LOG_LEVELS).toEqual([
        "DEBUG",
        "INFO",
        "WARNING",
        "ERROR",
        "CRITICAL",
      ]);
    });

    it("should have exactly 5 levels", () => {
      expect(LOG_LEVELS).toHaveLength(5);
    });
  });

  describe("LEVEL_STYLES", () => {
    it("should have styles for all levels", () => {
      for (const level of LOG_LEVELS) {
        expect(LEVEL_STYLES[level]).toBeDefined();
        expect(typeof LEVEL_STYLES[level]).toBe("string");
      }
    });

    it("should have correct color classes", () => {
      expect(LEVEL_STYLES.DEBUG).toContain("text-gray");
      expect(LEVEL_STYLES.INFO).toContain("text-blue");
      expect(LEVEL_STYLES.WARNING).toContain("text-amber");
      expect(LEVEL_STYLES.ERROR).toContain("text-red");
      expect(LEVEL_STYLES.CRITICAL).toContain("text-red");
      expect(LEVEL_STYLES.CRITICAL).toContain("font-bold");
    });
  });

  describe("LEVEL_BG_STYLES", () => {
    it("should have background styles for all levels", () => {
      for (const level of LOG_LEVELS) {
        expect(LEVEL_BG_STYLES[level]).toBeDefined();
        expect(typeof LEVEL_BG_STYLES[level]).toBe("string");
      }
    });

    it("should have correct background and text color classes", () => {
      expect(LEVEL_BG_STYLES.DEBUG).toContain("bg-gray");
      expect(LEVEL_BG_STYLES.DEBUG).toContain("text-gray");
      expect(LEVEL_BG_STYLES.INFO).toContain("bg-blue");
      expect(LEVEL_BG_STYLES.WARNING).toContain("bg-amber");
      expect(LEVEL_BG_STYLES.ERROR).toContain("bg-red");
      expect(LEVEL_BG_STYLES.CRITICAL).toContain("bg-red");
    });
  });

  describe("LEVEL_ICONS", () => {
    it("should have icons for all levels", () => {
      for (const level of LOG_LEVELS) {
        expect(LEVEL_ICONS[level]).toBeDefined();
      }
    });

    it("should have correct icon for each level", () => {
      expect(LEVEL_ICONS.DEBUG).toBe(Bug);
      expect(LEVEL_ICONS.INFO).toBe(Info);
      expect(LEVEL_ICONS.WARNING).toBe(AlertTriangle);
      expect(LEVEL_ICONS.ERROR).toBe(XCircle);
      expect(LEVEL_ICONS.CRITICAL).toBe(AlertOctagon);
    });
  });
});
