import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  getSpanCategoryTheme,
  getSpanCategoryLabel,
  getSpanCategoryIcon,
  SPAN_CATEGORY_CONFIG,
  ROUNDED_CLASSES,
  useIsMobile,
} from "@/components/agent-prism/shared";
import type { TraceSpanCategory } from "@evilmartians/agent-prism-types";

describe("shared", () => {
  describe("ROUNDED_CLASSES", () => {
    it("should have all rounded variants", () => {
      expect(ROUNDED_CLASSES.none).toBe("rounded-none");
      expect(ROUNDED_CLASSES.sm).toBe("rounded-sm");
      expect(ROUNDED_CLASSES.md).toBe("rounded-md");
      expect(ROUNDED_CLASSES.lg).toBe("rounded-lg");
      expect(ROUNDED_CLASSES.full).toBe("rounded-full");
    });
  });

  describe("SPAN_CATEGORY_CONFIG", () => {
    it("should have config for llm_call", () => {
      expect(SPAN_CATEGORY_CONFIG.llm_call.label).toBe("LLM");
      expect(SPAN_CATEGORY_CONFIG.llm_call.theme).toBe("purple");
      expect(SPAN_CATEGORY_CONFIG.llm_call.icon).toBeDefined();
    });

    it("should have config for tool_execution", () => {
      expect(SPAN_CATEGORY_CONFIG.tool_execution.label).toBe("TOOL");
      expect(SPAN_CATEGORY_CONFIG.tool_execution.theme).toBe("orange");
    });

    it("should have config for agent_invocation", () => {
      expect(SPAN_CATEGORY_CONFIG.agent_invocation.label).toBe(
        "AGENT INVOCATION",
      );
      expect(SPAN_CATEGORY_CONFIG.agent_invocation.theme).toBe("indigo");
    });

    it("should have config for chain_operation", () => {
      expect(SPAN_CATEGORY_CONFIG.chain_operation.label).toBe("CHAIN");
      expect(SPAN_CATEGORY_CONFIG.chain_operation.theme).toBe("teal");
    });

    it("should have config for retrieval", () => {
      expect(SPAN_CATEGORY_CONFIG.retrieval.label).toBe("RETRIEVAL");
      expect(SPAN_CATEGORY_CONFIG.retrieval.theme).toBe("cyan");
    });

    it("should have config for embedding", () => {
      expect(SPAN_CATEGORY_CONFIG.embedding.label).toBe("EMBEDDING");
      expect(SPAN_CATEGORY_CONFIG.embedding.theme).toBe("emerald");
    });

    it("should have config for create_agent", () => {
      expect(SPAN_CATEGORY_CONFIG.create_agent.label).toBe("CREATE AGENT");
      expect(SPAN_CATEGORY_CONFIG.create_agent.theme).toBe("sky");
    });

    it("should have config for span", () => {
      expect(SPAN_CATEGORY_CONFIG.span.label).toBe("SPAN");
      expect(SPAN_CATEGORY_CONFIG.span.theme).toBe("cyan");
    });

    it("should have config for event", () => {
      expect(SPAN_CATEGORY_CONFIG.event.label).toBe("EVENT");
      expect(SPAN_CATEGORY_CONFIG.event.theme).toBe("emerald");
    });

    it("should have config for guardrail", () => {
      expect(SPAN_CATEGORY_CONFIG.guardrail.label).toBe("GUARDRAIL");
      expect(SPAN_CATEGORY_CONFIG.guardrail.theme).toBe("red");
    });

    it("should have config for unknown", () => {
      expect(SPAN_CATEGORY_CONFIG.unknown.label).toBe("UNKNOWN");
      expect(SPAN_CATEGORY_CONFIG.unknown.theme).toBe("gray");
    });
  });

  describe("getSpanCategoryTheme", () => {
    it("should return theme for each category", () => {
      expect(getSpanCategoryTheme("llm_call")).toBe("purple");
      expect(getSpanCategoryTheme("tool_execution")).toBe("orange");
      expect(getSpanCategoryTheme("agent_invocation")).toBe("indigo");
      expect(getSpanCategoryTheme("unknown")).toBe("gray");
    });
  });

  describe("getSpanCategoryLabel", () => {
    it("should return label for each category", () => {
      expect(getSpanCategoryLabel("llm_call")).toBe("LLM");
      expect(getSpanCategoryLabel("tool_execution")).toBe("TOOL");
      expect(getSpanCategoryLabel("agent_invocation")).toBe("AGENT INVOCATION");
      expect(getSpanCategoryLabel("unknown")).toBe("UNKNOWN");
    });
  });

  describe("getSpanCategoryIcon", () => {
    it("should return icon for each category", () => {
      expect(getSpanCategoryIcon("llm_call")).toBeDefined();
      expect(getSpanCategoryIcon("tool_execution")).toBeDefined();
      expect(getSpanCategoryIcon("agent_invocation")).toBeDefined();
      expect(getSpanCategoryIcon("unknown")).toBeDefined();
    });

    it("should return different icons for different categories", () => {
      const llmIcon = getSpanCategoryIcon("llm_call");
      const toolIcon = getSpanCategoryIcon("tool_execution");
      expect(llmIcon).not.toBe(toolIcon);
    });
  });

  describe("useIsMobile", () => {
    let originalMatchMedia: typeof window.matchMedia;

    beforeEach(() => {
      originalMatchMedia = window.matchMedia;
    });

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
    });

    it("should return false initially before mount", () => {
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      const { result } = renderHook(() => useIsMobile());
      // Initially false before mount
      expect(typeof result.current).toBe("boolean");
    });

    it("should return true on mobile", async () => {
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      const { result } = renderHook(() => useIsMobile());

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it("should return false on desktop", async () => {
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      const { result } = renderHook(() => useIsMobile());

      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });

    it("should respond to media query changes", async () => {
      let listener: ((e: MediaQueryListEvent) => void) | null = null;

      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn((_type, fn) => {
          listener = fn;
        }),
        removeEventListener: vi.fn(),
      }));

      const { result } = renderHook(() => useIsMobile());

      await waitFor(() => {
        expect(result.current).toBe(false);
      });

      // Simulate media query change
      act(() => {
        if (listener) {
          listener({ matches: true } as MediaQueryListEvent);
        }
      });

      expect(result.current).toBe(true);
    });

    it("should clean up event listener on unmount", async () => {
      const removeEventListener = vi.fn();
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener,
      }));

      const { unmount } = renderHook(() => useIsMobile());

      unmount();

      expect(removeEventListener).toHaveBeenCalled();
    });
  });
});
