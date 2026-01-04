import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  LOG_LEVELS,
  LEVEL_STYLES,
  LEVEL_BG_STYLES,
  LEVEL_ICONS,
  formatTimestamp,
  formatFullTimestamp,
  formatDuration,
  formatFileSize,
  truncateText,
  escapeRegex,
  highlightSearch,
  formatContext,
  formatException,
  getUniqueCategories,
  copyToClipboard,
  copyEntryAsJson,
  deepFormatJson,
  type LogLevel,
} from "@/components/LogExplorer/logExplorerUtils";
import type { LogEntry } from "@/lib/api";
import { AlertOctagon, AlertTriangle, Bug, Info, XCircle } from "lucide-react";

describe("logExplorerUtils", () => {
  describe("constants", () => {
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

  describe("formatTimestamp", () => {
    it("should format valid ISO timestamp", () => {
      const result = formatTimestamp("2024-01-15T10:30:45.123Z");
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it("should format timestamp with milliseconds", () => {
      const result = formatTimestamp("2024-01-15T10:30:45.123Z");
      // Should include fractional seconds (milliseconds)
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
    });

    it("should handle timestamp without milliseconds", () => {
      const result = formatTimestamp("2024-01-15T10:30:45Z");
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it("should handle invalid timestamp gracefully", () => {
      const result = formatTimestamp("invalid");
      // Invalid dates return "Invalid Date" from toLocaleTimeString
      expect(result).toBe("Invalid Date");
    });

    it("should handle empty string", () => {
      const result = formatTimestamp("");
      expect(result).toBe("Invalid Date");
    });

    it("should handle timestamp with timezone offset", () => {
      const result = formatTimestamp("2024-01-15T10:30:45.123+05:30");
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it("should handle Unix epoch", () => {
      const result = formatTimestamp("1970-01-01T00:00:00.000Z");
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it("should handle far future date", () => {
      const result = formatTimestamp("2099-12-31T23:59:59.999Z");
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    });
  });

  describe("formatFullTimestamp", () => {
    it("should format valid timestamp with date", () => {
      const result = formatFullTimestamp("2024-01-15T10:30:45.123Z");
      expect(result).toMatch(/Jan/);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2024/);
    });

    it("should include time in 24-hour format", () => {
      const result = formatFullTimestamp("2024-01-15T14:30:45.123Z");
      // The hour should be in 24-hour format (hour12: false)
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it("should handle invalid timestamp gracefully", () => {
      const result = formatFullTimestamp("invalid");
      expect(result).toBe("Invalid Date");
    });

    it("should handle empty string", () => {
      const result = formatFullTimestamp("");
      expect(result).toBe("Invalid Date");
    });

    it("should format different months correctly", () => {
      expect(formatFullTimestamp("2024-06-15T10:00:00Z")).toMatch(/Jun/);
      expect(formatFullTimestamp("2024-12-25T10:00:00Z")).toMatch(/Dec/);
    });

    it("should handle leap year date", () => {
      const result = formatFullTimestamp("2024-02-29T12:00:00Z");
      expect(result).toMatch(/Feb/);
      expect(result).toMatch(/29/);
    });
  });

  describe("formatDuration", () => {
    it("should return empty string for null", () => {
      expect(formatDuration(null)).toBe("");
    });

    it("should format zero duration", () => {
      expect(formatDuration(0)).toBe("<1ms");
    });

    it("should format sub-millisecond durations", () => {
      expect(formatDuration(0.1)).toBe("<1ms");
      expect(formatDuration(0.5)).toBe("<1ms");
      expect(formatDuration(0.99)).toBe("<1ms");
    });

    it("should format exactly 1ms", () => {
      expect(formatDuration(1)).toBe("1ms");
    });

    it("should format milliseconds", () => {
      expect(formatDuration(100)).toBe("100ms");
      expect(formatDuration(500)).toBe("500ms");
      expect(formatDuration(999)).toBe("999ms");
    });

    it("should format boundary at 1000ms", () => {
      expect(formatDuration(1000)).toBe("1.00s");
    });

    it("should format seconds with two decimal places", () => {
      expect(formatDuration(1500)).toBe("1.50s");
      expect(formatDuration(2500)).toBe("2.50s");
      expect(formatDuration(10000)).toBe("10.00s");
    });

    it("should format large durations", () => {
      expect(formatDuration(60000)).toBe("60.00s");
      expect(formatDuration(3600000)).toBe("3600.00s");
    });

    it("should round milliseconds correctly", () => {
      expect(formatDuration(1.5)).toBe("2ms");
      expect(formatDuration(1.4)).toBe("1ms");
    });
  });

  describe("formatFileSize", () => {
    it("should format zero bytes", () => {
      expect(formatFileSize(0)).toBe("0 B");
    });

    it("should format bytes", () => {
      expect(formatFileSize(1)).toBe("1 B");
      expect(formatFileSize(500)).toBe("500 B");
      expect(formatFileSize(1023)).toBe("1023 B");
    });

    it("should format kilobytes at 1024 boundary", () => {
      expect(formatFileSize(1024)).toBe("1.0 KB");
    });

    it("should format kilobytes", () => {
      expect(formatFileSize(2048)).toBe("2.0 KB");
      expect(formatFileSize(1536)).toBe("1.5 KB");
      expect(formatFileSize(1024 * 1023)).toBe("1023.0 KB");
    });

    it("should format megabytes at boundary", () => {
      expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
    });

    it("should format megabytes", () => {
      expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0 MB");
      expect(formatFileSize(1.5 * 1024 * 1024)).toBe("1.5 MB");
      expect(formatFileSize(100 * 1024 * 1024)).toBe("100.0 MB");
    });

    it("should handle very large files (still in MB)", () => {
      // Note: implementation doesn't have GB support
      expect(formatFileSize(1024 * 1024 * 1024)).toBe("1024.0 MB");
      expect(formatFileSize(10 * 1024 * 1024 * 1024)).toBe("10240.0 MB");
    });
  });

  describe("truncateText", () => {
    it("should return text unchanged if within limit", () => {
      expect(truncateText("short", 10)).toBe("short");
    });

    it("should return text unchanged if exactly at limit", () => {
      expect(truncateText("1234567890", 10)).toBe("1234567890");
    });

    it("should truncate and add ellipsis when exceeding limit", () => {
      expect(truncateText("this is a long text", 10)).toBe("this is...");
    });

    it("should handle empty string", () => {
      expect(truncateText("", 10)).toBe("");
    });

    it("should handle maxLength of 3 (minimum for ellipsis)", () => {
      expect(truncateText("hello", 3)).toBe("...");
    });

    it("should handle maxLength less than 3", () => {
      // Edge case: maxLength < 3 means negative slice, but still adds "..."
      // The function slices from 0 to (maxLength - 3) and adds "..."
      // For maxLength=2: slice(0, -1) = "hell" + "..." = "hell..."
      // For maxLength=1: slice(0, -2) = "hel" + "..." = "hel..."
      // For maxLength=0: slice(0, -3) = "he" + "..." = "he..."
      expect(truncateText("hello", 2)).toBe("hell...");
      expect(truncateText("hello", 1)).toBe("hel...");
      expect(truncateText("hello", 0)).toBe("he...");
    });

    it("should handle single character text", () => {
      expect(truncateText("a", 5)).toBe("a");
    });

    it("should handle text with special characters", () => {
      expect(truncateText("hello\nworld", 8)).toBe("hello...");
    });

    it("should handle unicode characters", () => {
      // "hello 世界" has 8 characters (including the two Chinese characters)
      // When exactly at the limit, no truncation occurs
      expect(truncateText("hello 世界", 8)).toBe("hello 世界");
      // When under the limit, truncation occurs
      expect(truncateText("hello 世界", 7)).toBe("hell...");
    });
  });

  describe("escapeRegex", () => {
    it("should escape dot", () => {
      expect(escapeRegex("test.value")).toBe("test\\.value");
    });

    it("should escape square brackets", () => {
      expect(escapeRegex("foo[bar]")).toBe("foo\\[bar\\]");
    });

    it("should escape asterisk, plus, and question mark", () => {
      expect(escapeRegex("a*b+c?")).toBe("a\\*b\\+c\\?");
    });

    it("should escape caret and dollar sign", () => {
      expect(escapeRegex("^start$end")).toBe("\\^start\\$end");
    });

    it("should escape curly braces", () => {
      expect(escapeRegex("a{1,3}")).toBe("a\\{1,3\\}");
    });

    it("should escape parentheses", () => {
      expect(escapeRegex("(group)")).toBe("\\(group\\)");
    });

    it("should escape pipe", () => {
      expect(escapeRegex("a|b")).toBe("a\\|b");
    });

    it("should escape backslash", () => {
      expect(escapeRegex("path\\file")).toBe("path\\\\file");
    });

    it("should handle empty string", () => {
      expect(escapeRegex("")).toBe("");
    });

    it("should not modify string without special characters", () => {
      expect(escapeRegex("hello world")).toBe("hello world");
    });

    it("should escape multiple special characters", () => {
      expect(escapeRegex(".*+?^${}()|[]\\")).toBe(
        "\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\",
      );
    });

    it("should handle complex regex pattern", () => {
      expect(escapeRegex("^[a-z]+$")).toBe("\\^\\[a-z\\]\\+\\$");
    });
  });

  describe("highlightSearch", () => {
    it("should return single non-highlighted part when no search", () => {
      const result = highlightSearch("test text", "");
      expect(result).toEqual([{ text: "test text", highlighted: false }]);
    });

    it("should highlight matching parts", () => {
      const result = highlightSearch("hello world hello", "hello");
      expect(result.length).toBeGreaterThan(1);
      expect(result.some((p) => p.highlighted)).toBe(true);
    });

    it("should be case insensitive", () => {
      const result = highlightSearch("Hello World HELLO", "hello");
      expect(result.filter((p) => p.highlighted).length).toBe(2);
    });

    it("should highlight multiple occurrences", () => {
      const result = highlightSearch("foo bar foo baz foo", "foo");
      const highlighted = result.filter((p) => p.highlighted);
      expect(highlighted.length).toBe(3);
    });

    it("should handle no match", () => {
      const result = highlightSearch("hello world", "xyz");
      expect(result).toEqual([{ text: "hello world", highlighted: false }]);
    });

    it("should handle entire string matching", () => {
      const result = highlightSearch("test", "test");
      expect(result.some((p) => p.highlighted && p.text === "test")).toBe(true);
    });

    it("should escape special regex characters in search", () => {
      const result = highlightSearch("test.value", "test.");
      expect(result.some((p) => p.highlighted && p.text === "test.")).toBe(
        true,
      );
    });

    it("should handle search at start of text", () => {
      const result = highlightSearch("hello world", "hello");
      expect(result[0].text).toBe("");
      expect(result[1].highlighted).toBe(true);
      expect(result[1].text).toBe("hello");
    });

    it("should handle search at end of text", () => {
      const result = highlightSearch("hello world", "world");
      const worldPart = result.find((p) => p.text === "world");
      expect(worldPart?.highlighted).toBe(true);
    });

    it("should handle empty text", () => {
      const result = highlightSearch("", "search");
      expect(result).toEqual([{ text: "", highlighted: false }]);
    });

    it("should handle partial word match", () => {
      const result = highlightSearch("testing", "test");
      expect(result.some((p) => p.highlighted && p.text === "test")).toBe(true);
    });
  });

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
      expect(result[0].length).toBeLessThanOrEqual(50 + 5); // key= + truncated value
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
      // formatException only returns type: message, ignores traceback
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

  describe("deepFormatJson", () => {
    describe("primitive values", () => {
      it("should format null", () => {
        expect(deepFormatJson(null)).toBe("null");
      });

      it("should format undefined", () => {
        expect(deepFormatJson(undefined)).toBe("undefined");
      });

      it("should format numbers", () => {
        expect(deepFormatJson(42)).toBe("42");
        expect(deepFormatJson(3.14)).toBe("3.14");
        expect(deepFormatJson(-10)).toBe("-10");
        expect(deepFormatJson(0)).toBe("0");
      });

      it("should format booleans", () => {
        expect(deepFormatJson(true)).toBe("true");
        expect(deepFormatJson(false)).toBe("false");
      });

      it("should format simple strings", () => {
        expect(deepFormatJson("test")).toBe('"test"');
      });

      it("should format strings with special characters", () => {
        expect(deepFormatJson("hello\nworld")).toBe('"hello\\nworld"');
        expect(deepFormatJson('quote"test')).toBe('"quote\\"test"');
      });
    });

    describe("arrays", () => {
      it("should format empty array", () => {
        expect(deepFormatJson([])).toBe("[]");
      });

      it("should format array with numbers", () => {
        const result = deepFormatJson([1, 2, 3]);
        expect(result).toContain("1");
        expect(result).toContain("2");
        expect(result).toContain("3");
      });

      it("should format array with mixed types", () => {
        const result = deepFormatJson([1, "two", true, null]);
        expect(result).toContain("1");
        expect(result).toContain('"two"');
        expect(result).toContain("true");
        expect(result).toContain("null");
      });

      it("should format nested arrays", () => {
        const result = deepFormatJson([
          [1, 2],
          [3, 4],
        ]);
        expect(result).toContain("[");
        expect(result).toContain("1");
        expect(result).toContain("4");
      });
    });

    describe("objects", () => {
      it("should format empty object", () => {
        expect(deepFormatJson({})).toBe("{}");
      });

      it("should format simple object", () => {
        const result = deepFormatJson({ key: "value" });
        expect(result).toContain('"key"');
        expect(result).toContain('"value"');
      });

      it("should format object with multiple keys", () => {
        const result = deepFormatJson({ a: 1, b: 2, c: 3 });
        expect(result).toContain('"a"');
        expect(result).toContain('"b"');
        expect(result).toContain('"c"');
        expect(result).toContain("1");
        expect(result).toContain("2");
        expect(result).toContain("3");
      });

      it("should format nested objects", () => {
        const result = deepFormatJson({ outer: { inner: "value" } });
        expect(result).toContain('"outer"');
        expect(result).toContain('"inner"');
        expect(result).toContain('"value"');
      });

      it("should format object with array value", () => {
        const result = deepFormatJson({ items: [1, 2, 3] });
        expect(result).toContain('"items"');
        expect(result).toContain("[");
        expect(result).toContain("1");
      });
    });

    describe("nested JSON strings", () => {
      it("should parse and format JSON object string", () => {
        const result = deepFormatJson('{"key": "value"}');
        expect(result).toContain('"key"');
        expect(result).toContain('"value"');
      });

      it("should parse and format JSON array string", () => {
        const result = deepFormatJson("[1, 2, 3]");
        expect(result).toContain("1");
        expect(result).toContain("2");
        expect(result).toContain("3");
      });

      it("should handle deeply nested JSON strings", () => {
        const nested = JSON.stringify({ outer: { inner: { deep: "value" } } });
        const result = deepFormatJson(nested);
        expect(result).toContain('"outer"');
        expect(result).toContain('"inner"');
        expect(result).toContain('"deep"');
        expect(result).toContain('"value"');
      });

      it("should handle invalid JSON string gracefully", () => {
        const result = deepFormatJson("{invalid json}");
        expect(result).toBe('"{invalid json}"');
      });

      it("should handle JSON with whitespace", () => {
        const result = deepFormatJson('  { "key": "value" }  ');
        expect(result).toContain('"key"');
        expect(result).toContain('"value"');
      });
    });

    describe("Python repr strings", () => {
      it("should format Python repr strings with escape sequences", () => {
        const pythonRepr = "Part(text='hello\\nworld')";
        const result = deepFormatJson(pythonRepr);
        expect(result).toContain("hello");
        expect(result).toContain("world");
      });

      it("should format Python function call pattern", () => {
        const result = deepFormatJson("Config(name='test')");
        expect(result).toContain("Config");
        expect(result).toContain("name");
      });

      it("should format Python list pattern", () => {
        const result = deepFormatJson("[Item(id=1), Item(id=2)]");
        expect(result).toContain("Item");
      });

      it("should handle Python escape sequences", () => {
        const result = deepFormatJson("text='line1\\nline2\\ttab'");
        // Should unescape \n and \t
        expect(result).toContain("line1");
        expect(result).toContain("line2");
        expect(result).toContain("tab");
      });

      it("should format Part(...) pattern from example", () => {
        const result = deepFormatJson("Part(text='content')");
        expect(result).toContain("Part");
        expect(result).toContain("content");
      });
    });

    describe("indentation", () => {
      it("should apply correct indentation to nested objects", () => {
        const result = deepFormatJson({ a: { b: { c: 1 } } });
        const lines = result.split("\n");
        expect(lines.length).toBeGreaterThan(1);
      });

      it("should apply correct indentation to arrays", () => {
        const result = deepFormatJson([1, 2, 3]);
        const lines = result.split("\n");
        expect(lines.length).toBeGreaterThan(1);
      });

      it("should use custom indent level", () => {
        const result = deepFormatJson({ key: "value" }, 2);
        // With indent=2, the base indentation should be 4 spaces
        expect(result).toContain("    ");
      });
    });

    describe("edge cases", () => {
      it("should handle empty string", () => {
        expect(deepFormatJson("")).toBe('""');
      });

      it("should handle string that looks like JSON but isnt", () => {
        const result = deepFormatJson("[not json]");
        // Square brackets at start/end but not valid JSON
        expect(result).toBe('"[not json]"');
      });

      it("should handle circular-like structures (deeply nested)", () => {
        const deep: Record<string, unknown> = { level: 1 };
        let current = deep;
        for (let i = 2; i <= 10; i++) {
          current.nested = { level: i };
          current = current.nested as Record<string, unknown>;
        }
        const result = deepFormatJson(deep);
        expect(result).toContain('"level"');
        expect(result).toContain("10");
      });

      it("should handle object with numeric keys", () => {
        const result = deepFormatJson({ "0": "a", "1": "b" });
        expect(result).toContain('"0"');
        expect(result).toContain('"1"');
      });

      it("should handle object with special key names", () => {
        const result = deepFormatJson({ "key-with-dash": "value" });
        expect(result).toContain('"key-with-dash"');
      });

      it("should handle very long strings", () => {
        const longString = "a".repeat(1000);
        const result = deepFormatJson(longString);
        expect(result).toContain("a");
      });
    });
  });
});
