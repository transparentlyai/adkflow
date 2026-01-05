import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  cn,
  sanitizeAgentName,
  isMacOS,
  getModifierKey,
  formatShortcut,
} from "@/lib/utils";

describe("cn (className merge utility)", () => {
  it("should merge class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    expect(cn("base", true && "conditional")).toBe("base conditional");
    expect(cn("base", false && "hidden")).toBe("base");
  });

  it("should handle arrays", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });

  it("should handle objects", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });

  it("should merge tailwind classes correctly", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });
});

describe("sanitizeAgentName", () => {
  it("should replace spaces with underscores", () => {
    expect(sanitizeAgentName("My Agent")).toBe("My_Agent");
    expect(sanitizeAgentName("data processor")).toBe("data_processor");
  });

  it("should replace hyphens with underscores", () => {
    expect(sanitizeAgentName("my-agent")).toBe("my_agent");
    expect(sanitizeAgentName("data-processor")).toBe("data_processor");
  });

  it("should replace multiple spaces/hyphens with single underscore", () => {
    expect(sanitizeAgentName("my  agent")).toBe("my_agent");
    expect(sanitizeAgentName("my--agent")).toBe("my_agent");
    expect(sanitizeAgentName("my - agent")).toBe("my_agent");
  });

  it("should remove invalid characters", () => {
    expect(sanitizeAgentName("agent@123")).toBe("agent123");
    expect(sanitizeAgentName("my#agent!")).toBe("myagent");
  });

  it("should prefix with underscore if starts with number", () => {
    expect(sanitizeAgentName("123agent")).toBe("_123agent");
    expect(sanitizeAgentName("1st_agent")).toBe("_1st_agent");
  });

  it('should return "agent" for empty result', () => {
    expect(sanitizeAgentName("@#$%")).toBe("agent");
    expect(sanitizeAgentName("")).toBe("agent");
  });

  it("should preserve valid Python identifiers", () => {
    expect(sanitizeAgentName("valid_name")).toBe("valid_name");
    expect(sanitizeAgentName("Agent123")).toBe("Agent123");
    expect(sanitizeAgentName("_private")).toBe("_private");
  });
});

describe("isMacOS", () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    // Restore original navigator
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
    });
  });

  it("should return true on macOS", () => {
    Object.defineProperty(global, "navigator", {
      value: { platform: "MacIntel" },
      writable: true,
    });
    expect(isMacOS()).toBe(true);
  });

  it("should return false on Windows", () => {
    Object.defineProperty(global, "navigator", {
      value: { platform: "Win32" },
      writable: true,
    });
    expect(isMacOS()).toBe(false);
  });

  it("should return false on Linux", () => {
    Object.defineProperty(global, "navigator", {
      value: { platform: "Linux x86_64" },
      writable: true,
    });
    expect(isMacOS()).toBe(false);
  });

  it("should return false when navigator is undefined (SSR)", () => {
    Object.defineProperty(global, "navigator", {
      value: undefined,
      writable: true,
    });
    expect(isMacOS()).toBe(false);
  });
});

describe("getModifierKey", () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
    });
  });

  it('should return "⌘" on macOS', () => {
    Object.defineProperty(global, "navigator", {
      value: { platform: "MacIntel" },
      writable: true,
    });
    expect(getModifierKey()).toBe("⌘");
  });

  it('should return "Ctrl+" on non-Mac', () => {
    Object.defineProperty(global, "navigator", {
      value: { platform: "Win32" },
      writable: true,
    });
    expect(getModifierKey()).toBe("Ctrl+");
  });
});

describe("formatShortcut", () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
    });
  });

  describe("on macOS", () => {
    beforeEach(() => {
      Object.defineProperty(global, "navigator", {
        value: { platform: "MacIntel" },
        writable: true,
      });
    });

    it("should format basic shortcut", () => {
      expect(formatShortcut("S")).toBe("⌘S");
      expect(formatShortcut("Z")).toBe("⌘Z");
    });

    it("should format shortcut with shift", () => {
      expect(formatShortcut("Z", true)).toBe("⇧⌘Z");
    });
  });

  describe("on Windows/Linux", () => {
    beforeEach(() => {
      Object.defineProperty(global, "navigator", {
        value: { platform: "Win32" },
        writable: true,
      });
    });

    it("should format basic shortcut", () => {
      expect(formatShortcut("S")).toBe("Ctrl+S");
      expect(formatShortcut("Z")).toBe("Ctrl+Z");
    });

    it("should format shortcut with shift", () => {
      expect(formatShortcut("Z", true)).toBe("Shift+Ctrl+Z");
    });
  });
});
