import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatContext,
  formatException,
  getUniqueCategories,
  copyToClipboard,
  copyEntryAsJson,
} from "@/components/LogExplorer/logExplorerUtils";
import type { LogEntry } from "@/lib/api";

describe("logExplorerUtils context and clipboard", () => {
  describe("formatContext", () => {
    it("should return empty array for null context", () => {
      expect(formatContext(null)).toEqual([]);
    });

    it("should return empty array for empty object", () => {
      expect(formatContext({})).toEqual([]);
    });

    it("should format string values with quotes", () => {
      const result = formatContext({ name: "test" });
      expect(result).toContain('name="test"');
    });

    it("should format number values", () => {
      const result = formatContext({ count: 42 });
      expect(result).toContain("count=42");
    });

    it("should format boolean values", () => {
      const result = formatContext({ enabled: true });
      expect(result).toContain("enabled=true");
    });

    it("should format null values", () => {
      const result = formatContext({ value: null });
      expect(result).toContain("value=null");
    });

    it("should format object values as JSON", () => {
      const result = formatContext({ data: { key: "value" } });
      expect(result[0]).toContain("data=");
      expect(result[0]).toContain("{");
    });

    it("should format array values as JSON", () => {
      const result = formatContext({ items: [1, 2, 3] });
      expect(result[0]).toContain("items=");
      expect(result[0]).toContain("[1,2,3]");
    });

    it("should truncate long string values at 50 characters", () => {
      const longValue = "a".repeat(100);
      const result = formatContext({ key: longValue });
      expect(result[0].length).toBeLessThan(100);
      expect(result[0]).toContain("...");
    });

    it("should truncate long object values at 50 characters", () => {
      const bigObject = {
        a: 1,
        b: 2,
        c: 3,
        d: 4,
        e: 5,
        f: 6,
        g: 7,
        h: 8,
        i: 9,
      };
      const result = formatContext({ data: bigObject });
      expect(result[0].length).toBeLessThanOrEqual(50 + 5);
    });

    it("should handle multiple context keys", () => {
      const result = formatContext({ name: "test", count: 42, enabled: true });
      expect(result).toHaveLength(3);
    });

    it("should handle undefined values", () => {
      const result = formatContext({ value: undefined });
      expect(result).toContain("value=undefined");
    });

    it("should handle nested objects", () => {
      const result = formatContext({ nested: { deep: { value: 1 } } });
      expect(result[0]).toContain("nested=");
    });

    it("should handle special string characters", () => {
      const result = formatContext({ path: "foo/bar\nbaz" });
      expect(result[0]).toContain('path="');
    });
  });

  describe("formatException", () => {
    it("should return empty string for null", () => {
      expect(formatException(null)).toBe("");
    });

    it("should format exception with type and message", () => {
      const result = formatException({
        type: "ValueError",
        message: "Invalid value",
        traceback: [],
      });
      expect(result).toBe("ValueError: Invalid value");
    });

    it("should handle empty type", () => {
      const result = formatException({
        type: "",
        message: "Some error",
        traceback: [],
      });
      expect(result).toBe(": Some error");
    });

    it("should handle empty message", () => {
      const result = formatException({
        type: "Error",
        message: "",
        traceback: [],
      });
      expect(result).toBe("Error: ");
    });

    it("should handle exception with traceback", () => {
      const result = formatException({
        type: "RuntimeError",
        message: "Failed",
        traceback: ["line 1", "line 2"],
      });
      expect(result).toBe("RuntimeError: Failed");
    });

    it("should handle long message", () => {
      const longMessage = "a".repeat(200);
      const result = formatException({
        type: "Error",
        message: longMessage,
        traceback: [],
      });
      expect(result).toBe(`Error: ${longMessage}`);
    });

    it("should handle special characters in message", () => {
      const result = formatException({
        type: "Error",
        message: "Line 1\nLine 2",
        traceback: [],
      });
      expect(result).toBe("Error: Line 1\nLine 2");
    });
  });

  describe("getUniqueCategories", () => {
    it("should return empty array for empty input", () => {
      expect(getUniqueCategories([])).toEqual([]);
    });

    it("should extract unique categories", () => {
      const entries = [
        { category: "runner" },
        { category: "agent" },
        { category: "runner" },
      ] as LogEntry[];

      const result = getUniqueCategories(entries);
      expect(result).toEqual(["agent", "runner"]);
    });

    it("should filter out null categories", () => {
      const entries = [
        { category: "runner" },
        { category: null },
        { category: "agent" },
      ] as LogEntry[];

      const result = getUniqueCategories(entries);
      expect(result).toEqual(["agent", "runner"]);
    });

    it("should return sorted categories", () => {
      const entries = [
        { category: "zebra" },
        { category: "alpha" },
        { category: "middle" },
      ] as LogEntry[];

      const result = getUniqueCategories(entries);
      expect(result).toEqual(["alpha", "middle", "zebra"]);
    });

    it("should handle all null categories", () => {
      const entries = [{ category: null }, { category: null }] as LogEntry[];

      const result = getUniqueCategories(entries);
      expect(result).toEqual([]);
    });

    it("should handle single entry", () => {
      const entries = [{ category: "runner" }] as LogEntry[];

      const result = getUniqueCategories(entries);
      expect(result).toEqual(["runner"]);
    });

    it("should handle many duplicate categories", () => {
      const entries = Array(100)
        .fill(null)
        .map(() => ({ category: "repeated" })) as LogEntry[];

      const result = getUniqueCategories(entries);
      expect(result).toEqual(["repeated"]);
    });

    it("should handle categories with special characters", () => {
      const entries = [
        { category: "foo.bar" },
        { category: "foo-baz" },
        { category: "foo_qux" },
      ] as LogEntry[];

      const result = getUniqueCategories(entries);
      expect(result).toEqual(["foo-baz", "foo.bar", "foo_qux"]);
    });
  });

  describe("copyToClipboard", () => {
    beforeEach(() => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should copy text and return true on success", async () => {
      const result = await copyToClipboard("test text");
      expect(result).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("test text");
    });

    it("should return false on error", async () => {
      (
        navigator.clipboard.writeText as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Failed"));
      const result = await copyToClipboard("test");
      expect(result).toBe(false);
    });

    it("should handle empty string", async () => {
      const result = await copyToClipboard("");
      expect(result).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("");
    });

    it("should handle large text", async () => {
      const largeText = "a".repeat(10000);
      const result = await copyToClipboard(largeText);
      expect(result).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(largeText);
    });

    it("should handle text with special characters", async () => {
      const text = 'hello\nworld\t"quoted"';
      const result = await copyToClipboard(text);
      expect(result).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(text);
    });

    it("should handle unicode text", async () => {
      const text = "Hello 世界 🌍";
      const result = await copyToClipboard(text);
      expect(result).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(text);
    });
  });

  describe("copyEntryAsJson", () => {
    beforeEach(() => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should copy entry as formatted JSON", async () => {
      const entry: LogEntry = {
        lineNumber: 1,
        timestamp: "2024-01-15T10:30:00Z",
        level: "INFO",
        category: "runner",
        message: "Test message",
        context: { key: "value" },
        durationMs: 100,
        exception: null,
        runId: null,
      };

      await copyEntryAsJson(entry);

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      const calledWith = (
        navigator.clipboard.writeText as ReturnType<typeof vi.fn>
      ).mock.calls[0][0];
      const parsed = JSON.parse(calledWith);
      expect(parsed.level).toBe("INFO");
      expect(parsed.message).toBe("Test message");
      expect(parsed.context).toEqual({ key: "value" });
    });

    it("should include all entry fields", async () => {
      const entry: LogEntry = {
        lineNumber: 42,
        timestamp: "2024-01-15T10:30:00Z",
        level: "ERROR",
        category: "agent",
        message: "Error occurred",
        context: { error_code: 500 },
        durationMs: 250,
        exception: {
          type: "ValueError",
          message: "Invalid",
          traceback: ["line 1"],
        },
        runId: "run-123",
      };

      await copyEntryAsJson(entry);

      const calledWith = (
        navigator.clipboard.writeText as ReturnType<typeof vi.fn>
      ).mock.calls[0][0];
      const parsed = JSON.parse(calledWith);
      expect(parsed.timestamp).toBe("2024-01-15T10:30:00Z");
      expect(parsed.level).toBe("ERROR");
      expect(parsed.category).toBe("agent");
      expect(parsed.duration_ms).toBe(250);
      expect(parsed.exception).toEqual({
        type: "ValueError",
        message: "Invalid",
        traceback: ["line 1"],
      });
    });

    it("should handle entry with null values", async () => {
      const entry: LogEntry = {
        lineNumber: 1,
        timestamp: "2024-01-15T10:30:00Z",
        level: "DEBUG",
        category: "test",
        message: "Test",
        context: null,
        durationMs: null,
        exception: null,
        runId: null,
      };

      const result = await copyEntryAsJson(entry);
      expect(result).toBe(true);

      const calledWith = (
        navigator.clipboard.writeText as ReturnType<typeof vi.fn>
      ).mock.calls[0][0];
      const parsed = JSON.parse(calledWith);
      expect(parsed.context).toBeNull();
      expect(parsed.duration_ms).toBeNull();
      expect(parsed.exception).toBeNull();
    });

    it("should return false on clipboard error", async () => {
      (
        navigator.clipboard.writeText as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Failed"));

      const entry: LogEntry = {
        lineNumber: 1,
        timestamp: "2024-01-15T10:30:00Z",
        level: "INFO",
        category: "test",
        message: "Test",
        context: null,
        durationMs: null,
        exception: null,
        runId: null,
      };

      const result = await copyEntryAsJson(entry);
      expect(result).toBe(false);
    });
  });
});
