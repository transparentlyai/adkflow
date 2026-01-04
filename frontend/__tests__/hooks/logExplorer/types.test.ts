import { describe, it, expect } from "vitest";
import { DEFAULT_FILTERS, PAGE_SIZE } from "@/hooks/logExplorer/types";

describe("logExplorer types", () => {
  describe("DEFAULT_FILTERS", () => {
    it("should have null level", () => {
      expect(DEFAULT_FILTERS.level).toBeNull();
    });

    it("should have null category", () => {
      expect(DEFAULT_FILTERS.category).toBeNull();
    });

    it("should have empty search", () => {
      expect(DEFAULT_FILTERS.search).toBe("");
    });

    it("should have null startTime", () => {
      expect(DEFAULT_FILTERS.startTime).toBeNull();
    });

    it("should have null endTime", () => {
      expect(DEFAULT_FILTERS.endTime).toBeNull();
    });

    it("should have null runId", () => {
      expect(DEFAULT_FILTERS.runId).toBeNull();
    });

    it("should have lastRunOnly as false", () => {
      expect(DEFAULT_FILTERS.lastRunOnly).toBe(false);
    });
  });

  describe("PAGE_SIZE", () => {
    it("should be 500", () => {
      expect(PAGE_SIZE).toBe(500);
    });
  });
});
