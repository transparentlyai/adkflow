import { describe, it, expect } from "vitest";
import {
  formatTimestamp,
  formatFullTimestamp,
  formatDuration,
  formatFileSize,
  truncateText,
  escapeRegex,
  highlightSearch,
} from "@/components/LogExplorer/logExplorerUtils";

describe("logExplorerUtils formatting", () => {
  describe("formatTimestamp", () => {
    it("should format valid ISO timestamp", () => {
      const result = formatTimestamp("2024-01-15T10:30:45.123Z");
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it("should format timestamp with milliseconds", () => {
      const result = formatTimestamp("2024-01-15T10:30:45.123Z");
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
    });

    it("should handle timestamp without milliseconds", () => {
      const result = formatTimestamp("2024-01-15T10:30:45Z");
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it("should handle invalid timestamp gracefully", () => {
      const result = formatTimestamp("invalid");
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
      expect(truncateText("hello 世界", 8)).toBe("hello 世界");
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
});
