import { describe, it, expect } from "vitest";
import {
  ACRONYMS,
  OPERATION_PREFIXES,
  formatDuration,
  formatSpanName,
  formatTime,
  getSpanTypeClass,
  getModelName,
  getToolName,
} from "@/components/TraceExplorer/traceUtils";
import type { TraceSpan } from "@/lib/api/traces";

/**
 * Helper to create a minimal valid TraceSpan for testing
 */
function createSpan(overrides: Partial<TraceSpan> = {}): TraceSpan {
  return {
    traceId: "trace1",
    spanId: "span1",
    parentSpanId: null,
    name: "test_span",
    startTime: "2024-01-15T10:00:00Z",
    endTime: "2024-01-15T10:00:01Z",
    durationMs: 1000,
    status: "OK",
    attributes: {},
    children: [],
    ...overrides,
  };
}

describe("traceUtils", () => {
  describe("constants", () => {
    it("should have expected acronyms", () => {
      expect(ACRONYMS.has("llm")).toBe(true);
      expect(ACRONYMS.has("api")).toBe(true);
      expect(ACRONYMS.has("http")).toBe(true);
    });

    it("should have all documented acronyms", () => {
      const expectedAcronyms = ["llm", "api", "id", "url", "sql", "http", "ai"];
      for (const acronym of expectedAcronyms) {
        expect(ACRONYMS.has(acronym)).toBe(true);
      }
    });

    it("should not have non-acronyms", () => {
      expect(ACRONYMS.has("agent")).toBe(false);
      expect(ACRONYMS.has("tool")).toBe(false);
      expect(ACRONYMS.has("invoke")).toBe(false);
    });

    it("should have expected operation prefixes", () => {
      expect(OPERATION_PREFIXES).toContain("invoke_agent");
      expect(OPERATION_PREFIXES).toContain("call_llm");
      expect(OPERATION_PREFIXES).toContain("execute_tool");
    });

    it("should have all documented operation prefixes", () => {
      const expectedPrefixes = [
        "invoke_agent",
        "call_llm",
        "execute_tool",
        "create_agent",
        "run_agent",
        "agent_invocation",
        "tool_execution",
        "chain_operation",
      ];
      expect(OPERATION_PREFIXES).toEqual(expectedPrefixes);
    });
  });

  describe("formatDuration", () => {
    it("should return dash for null", () => {
      expect(formatDuration(null)).toBe("-");
    });

    it("should format sub-millisecond durations", () => {
      expect(formatDuration(0.5)).toBe("<1ms");
    });

    it("should format milliseconds", () => {
      expect(formatDuration(500)).toBe("500ms");
    });

    it("should format seconds", () => {
      expect(formatDuration(2500)).toBe("2.50s");
    });

    // Edge cases
    it("should handle zero duration", () => {
      expect(formatDuration(0)).toBe("<1ms");
    });

    it("should handle exactly 1ms", () => {
      expect(formatDuration(1)).toBe("1ms");
    });

    it("should handle exactly 1000ms (1 second)", () => {
      expect(formatDuration(1000)).toBe("1.00s");
    });

    it("should handle very small sub-millisecond values", () => {
      expect(formatDuration(0.001)).toBe("<1ms");
      expect(formatDuration(0.999)).toBe("<1ms");
    });

    it("should round millisecond values correctly", () => {
      expect(formatDuration(99.4)).toBe("99ms");
      expect(formatDuration(99.5)).toBe("100ms");
      expect(formatDuration(999.4)).toBe("999ms");
      expect(formatDuration(999.5)).toBe("1000ms");
    });

    it("should format large second values", () => {
      expect(formatDuration(60000)).toBe("60.00s");
      expect(formatDuration(3600000)).toBe("3600.00s");
    });

    it("should handle negative values (edge case)", () => {
      // The function treats negative values as < 1ms because they fail the >= 1 check
      expect(formatDuration(-100)).toBe("<1ms");
      expect(formatDuration(-1)).toBe("<1ms");
    });

    it("should format seconds with proper decimal precision", () => {
      expect(formatDuration(1234)).toBe("1.23s");
      expect(formatDuration(1235)).toBe("1.24s");
      expect(formatDuration(1999)).toBe("2.00s");
    });
  });

  describe("formatSpanName", () => {
    it("should format invoke_agent prefix", () => {
      const result = formatSpanName("invoke_agent seq_A1");
      expect(result).toBe("Invoke Agent: seq_A1");
    });

    it("should format call_llm prefix with LLM capitalized", () => {
      const result = formatSpanName("call_llm gemini-1.5");
      expect(result).toBe("Call LLM: gemini-1.5");
    });

    it("should format execute_tool prefix", () => {
      const result = formatSpanName("execute_tool my_tool");
      expect(result).toBe("Execute Tool: my_tool");
    });

    it("should handle prefix without remainder", () => {
      const result = formatSpanName("invoke_agent");
      expect(result).toBe("Invoke Agent");
    });

    it("should handle prefix with leading underscores in remainder", () => {
      const result = formatSpanName("invoke_agent__test");
      expect(result).toBe("Invoke Agent: test");
    });

    it("should capitalize first letter for non-prefixed names", () => {
      const result = formatSpanName("custom_span");
      expect(result).toBe("Custom_span");
    });

    it("should be case insensitive for prefix matching", () => {
      const result = formatSpanName("INVOKE_AGENT test");
      expect(result).toBe("Invoke Agent: test");
    });

    // Additional edge cases
    it("should format all operation prefixes correctly", () => {
      expect(formatSpanName("create_agent myAgent")).toBe(
        "Create Agent: myAgent",
      );
      expect(formatSpanName("run_agent myAgent")).toBe("Run Agent: myAgent");
      expect(formatSpanName("agent_invocation start")).toBe(
        "Agent Invocation: start",
      );
      expect(formatSpanName("tool_execution calc")).toBe(
        "Tool Execution: calc",
      );
      expect(formatSpanName("chain_operation step1")).toBe(
        "Chain Operation: step1",
      );
    });

    it("should handle mixed case prefix with MixedCase remainder", () => {
      const result = formatSpanName("Call_Llm MyModel");
      expect(result).toBe("Call LLM: MyModel");
    });

    it("should handle empty string", () => {
      const result = formatSpanName("");
      expect(result).toBe("");
    });

    it("should handle single character", () => {
      const result = formatSpanName("a");
      expect(result).toBe("A");
    });

    it("should handle prefix with only whitespace remainder", () => {
      const result = formatSpanName("invoke_agent   ");
      expect(result).toBe("Invoke Agent");
    });

    it("should handle prefix with spaces and underscores in remainder", () => {
      // The regex /^[_\s]+/ strips leading underscores and spaces from remainder
      const result = formatSpanName("invoke_agent _ _ test");
      expect(result).toBe("Invoke Agent: test");
    });

    it("should handle API acronym in prefix", () => {
      // 'api' should be uppercase as it's in ACRONYMS
      // But current prefixes don't include 'api' as a word
      // Testing that non-prefix names still work
      const result = formatSpanName("api_request test");
      expect(result).toBe("Api_request test");
    });

    it("should handle prefix that matches start but not completely", () => {
      // 'invoke_agent_extra' starts with 'invoke_agent' but has extra chars
      // This should still match as it starts with the prefix
      const result = formatSpanName("invoke_agent_extra");
      expect(result).toBe("Invoke Agent: extra");
    });

    it("should handle numeric remainder", () => {
      const result = formatSpanName("call_llm 12345");
      expect(result).toBe("Call LLM: 12345");
    });

    it("should handle special characters in remainder", () => {
      const result = formatSpanName("execute_tool @#$%");
      expect(result).toBe("Execute Tool: @#$%");
    });

    it("should handle very long remainder", () => {
      const longName = "a".repeat(1000);
      const result = formatSpanName(`invoke_agent ${longName}`);
      expect(result).toBe(`Invoke Agent: ${longName}`);
    });

    it("should handle unicode characters", () => {
      const result = formatSpanName("invoke_agent 你好世界");
      expect(result).toBe("Invoke Agent: 你好世界");
    });

    it("should handle already capitalized non-prefix names", () => {
      const result = formatSpanName("CustomSpan");
      expect(result).toBe("CustomSpan");
    });
  });

  describe("formatTime", () => {
    it("should format valid timestamp", () => {
      const result = formatTime("2024-01-15T10:30:45.123Z");
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });

    it("should handle invalid timestamp gracefully", () => {
      const result = formatTime("invalid");
      // Invalid dates return "Invalid Date" from toLocaleTimeString
      expect(result).toBe("Invalid Date");
    });

    // Edge cases
    it("should format midnight timestamp", () => {
      const result = formatTime("2024-01-15T00:00:00.000Z");
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });

    it("should format end of day timestamp", () => {
      const result = formatTime("2024-01-15T23:59:59.999Z");
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });

    it("should handle empty string", () => {
      const result = formatTime("");
      expect(result).toBe("Invalid Date");
    });

    it("should handle date-only string", () => {
      const result = formatTime("2024-01-15");
      // This is actually a valid date (parsed as midnight UTC)
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });

    it("should handle timestamp with timezone offset", () => {
      const result = formatTime("2024-01-15T10:30:45.123+05:30");
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });

    it("should handle Unix epoch timestamp string", () => {
      // JavaScript Date parses "0" as Unix epoch (Jan 1, 1970 00:00:00 UTC)
      const result = formatTime("0");
      // Returns a valid time (midnight in local timezone)
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });

    it("should handle null-like timestamp", () => {
      const result = formatTime("null");
      expect(result).toBe("Invalid Date");
    });

    it("should handle ISO format without milliseconds", () => {
      const result = formatTime("2024-01-15T10:30:45Z");
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });
  });

  describe("getSpanTypeClass", () => {
    it("should return LLM type for llm spans", () => {
      const result = getSpanTypeClass("call_llm gemini");
      expect(result.label).toBe("LLM");
    });

    it("should return AGENT type for agent spans", () => {
      const result = getSpanTypeClass("invoke_agent myAgent");
      expect(result.label).toBe("AGENT");
    });

    it("should return TOOL type for tool spans", () => {
      const result = getSpanTypeClass("execute_tool myTool");
      expect(result.label).toBe("TOOL");
    });

    it("should return CHAIN type for chain spans", () => {
      const result = getSpanTypeClass("chain_operation");
      expect(result.label).toBe("CHAIN");
    });

    it("should return RETRIEVAL type for retrieval spans", () => {
      const result = getSpanTypeClass("retrieval_query");
      expect(result.label).toBe("RETRIEVAL");
    });

    it("should return EMBEDDING type for embedding spans", () => {
      const result = getSpanTypeClass("embedding_vector");
      expect(result.label).toBe("EMBEDDING");
    });

    it("should return GUARDRAIL type for guardrail spans", () => {
      const result = getSpanTypeClass("guardrail_check");
      expect(result.label).toBe("GUARDRAIL");
    });

    it("should return INVOKE type for invocation spans", () => {
      const result = getSpanTypeClass("invocation_start");
      expect(result.label).toBe("INVOKE");
    });

    it("should return SPAN type for unknown spans", () => {
      const result = getSpanTypeClass("unknown_operation");
      expect(result.label).toBe("SPAN");
    });

    it("should return icon for each type", () => {
      const types = [
        "call_llm",
        "invoke_agent",
        "execute_tool",
        "chain",
        "retrieval",
        "embedding",
        "guardrail",
        "invocation",
        "unknown",
      ];

      for (const type of types) {
        const result = getSpanTypeClass(type);
        expect(result.icon).toBeDefined();
        expect(result.bg).toBeDefined();
        expect(result.text).toBeDefined();
        expect(result.badge).toBeDefined();
      }
    });

    // Edge cases and priority tests
    it("should be case insensitive", () => {
      expect(getSpanTypeClass("CALL_LLM").label).toBe("LLM");
      expect(getSpanTypeClass("Call_Llm").label).toBe("LLM");
      expect(getSpanTypeClass("INVOKE_AGENT").label).toBe("AGENT");
    });

    it("should handle empty string as unknown", () => {
      const result = getSpanTypeClass("");
      expect(result.label).toBe("SPAN");
    });

    it("should prioritize LLM over agent when both keywords present", () => {
      // LLM check comes first in the function
      const result = getSpanTypeClass("agent_llm_call");
      expect(result.label).toBe("LLM");
    });

    it("should prioritize agent over tool when both keywords present", () => {
      // Agent check comes before tool in the function
      const result = getSpanTypeClass("agent_tool_execution");
      expect(result.label).toBe("AGENT");
    });

    it("should detect LLM keyword anywhere in name", () => {
      expect(getSpanTypeClass("prefix_llm_suffix").label).toBe("LLM");
      expect(getSpanTypeClass("my_llm").label).toBe("LLM");
      expect(getSpanTypeClass("llm_call_v2").label).toBe("LLM");
    });

    it("should detect agent keyword anywhere in name", () => {
      expect(getSpanTypeClass("my_agent_v2").label).toBe("AGENT");
      expect(getSpanTypeClass("super_agent").label).toBe("AGENT");
    });

    it("should detect tool keyword anywhere in name", () => {
      expect(getSpanTypeClass("my_tool_exec").label).toBe("TOOL");
      expect(getSpanTypeClass("toolbox_open").label).toBe("TOOL");
    });

    it("should handle invoke keyword without agent", () => {
      // 'invoke' alone triggers INVOKE type
      const result = getSpanTypeClass("invoke_method");
      expect(result.label).toBe("INVOKE");
    });

    it("should return proper CSS classes for LLM type", () => {
      const result = getSpanTypeClass("call_llm");
      expect(result.bg).toBe("bg-agentprism-badge-llm");
      expect(result.text).toBe("text-agentprism-badge-llm-foreground");
      expect(result.badge).toBe("bg-agentprism-avatar-llm");
    });

    it("should return proper CSS classes for unknown type", () => {
      const result = getSpanTypeClass("random_operation");
      expect(result.bg).toBe("bg-agentprism-badge-unknown");
      expect(result.text).toBe("text-agentprism-badge-unknown-foreground");
      expect(result.badge).toBe("bg-agentprism-avatar-unknown");
    });

    it("should handle special characters in span name", () => {
      expect(getSpanTypeClass("llm@#$%").label).toBe("LLM");
      expect(getSpanTypeClass("agent-v1.0.0").label).toBe("AGENT");
    });

    it("should handle whitespace in span name", () => {
      expect(getSpanTypeClass("  llm  call  ").label).toBe("LLM");
      expect(getSpanTypeClass("\tagent\n").label).toBe("AGENT");
    });

    it("should handle very long span names", () => {
      const longPrefix = "a".repeat(1000);
      expect(getSpanTypeClass(`${longPrefix}_llm`).label).toBe("LLM");
      expect(getSpanTypeClass(`llm_${longPrefix}`).label).toBe("LLM");
    });

    it("should handle partial keyword matches correctly", () => {
      // 'embedding' contains 'bedding' but should still match 'embedding'
      expect(getSpanTypeClass("embedding").label).toBe("EMBEDDING");
      // 'retrieval' is specific
      expect(getSpanTypeClass("retrieval").label).toBe("RETRIEVAL");
    });
  });

  describe("getModelName", () => {
    it("should return model from gen_ai.request.model attribute", () => {
      const span = createSpan({
        name: "call_llm",
        attributes: { "gen_ai.request.model": "gemini-1.5-pro" },
      });
      expect(getModelName(span)).toBe("gemini-1.5-pro");
    });

    it("should return model from llm.model_name attribute", () => {
      const span = createSpan({
        name: "call_llm",
        attributes: { "llm.model_name": "gpt-4" },
      });
      expect(getModelName(span)).toBe("gpt-4");
    });

    it("should return model from model attribute", () => {
      const span = createSpan({
        name: "call_llm",
        attributes: { model: "claude-3" },
      });
      expect(getModelName(span)).toBe("claude-3");
    });

    it("should return model from model_name attribute", () => {
      const span = createSpan({
        name: "call_llm",
        attributes: { model_name: "llama-2" },
      });
      expect(getModelName(span)).toBe("llama-2");
    });

    it("should return undefined when no model attribute", () => {
      const span = createSpan({
        name: "call_llm",
        attributes: {},
      });
      expect(getModelName(span)).toBeUndefined();
    });

    // Edge cases
    it("should prioritize gen_ai.request.model over other attributes", () => {
      const span = createSpan({
        name: "call_llm",
        attributes: {
          "gen_ai.request.model": "gemini-1.5-pro",
          "llm.model_name": "gpt-4",
          model: "claude-3",
          model_name: "llama-2",
        },
      });
      expect(getModelName(span)).toBe("gemini-1.5-pro");
    });

    it("should fall back to llm.model_name when gen_ai.request.model is missing", () => {
      const span = createSpan({
        name: "call_llm",
        attributes: {
          "llm.model_name": "gpt-4",
          model: "claude-3",
        },
      });
      expect(getModelName(span)).toBe("gpt-4");
    });

    it("should handle undefined attributes object", () => {
      const span = createSpan({ name: "call_llm" });
      // Force undefined attributes to test defensive code
      // @ts-expect-error - testing edge case
      span.attributes = undefined;
      expect(getModelName(span)).toBeUndefined();
    });

    it("should handle null-ish model values", () => {
      const span = createSpan({
        name: "call_llm",
        attributes: {
          "gen_ai.request.model": null,
          model: "claude-3",
        },
      });
      // null is falsy, so it should fall through to next option
      expect(getModelName(span)).toBe("claude-3");
    });

    it("should handle empty string model values", () => {
      const span = createSpan({
        name: "call_llm",
        attributes: {
          "gen_ai.request.model": "",
          model: "claude-3",
        },
      });
      // Empty string is falsy, so it should fall through
      expect(getModelName(span)).toBe("claude-3");
    });

    it("should handle non-string model values", () => {
      const span = createSpan({
        name: "call_llm",
        attributes: {
          "gen_ai.request.model": 123,
        },
      });
      // The function casts to string, so numeric value is returned
      expect(getModelName(span)).toBe(123);
    });

    it("should handle spans with children", () => {
      const childSpan = createSpan({
        spanId: "child1",
        name: "inner_call",
        parentSpanId: "span1",
      });
      const parentSpan = createSpan({
        name: "call_llm",
        attributes: { model: "gpt-4" },
        children: [childSpan],
      });
      expect(getModelName(parentSpan)).toBe("gpt-4");
    });
  });

  describe("getToolName", () => {
    it("should return tool name from tool.name attribute", () => {
      const span = createSpan({
        name: "execute_tool",
        attributes: { "tool.name": "search" },
      });
      expect(getToolName(span)).toBe("search");
    });

    it("should return tool name from function.name attribute", () => {
      const span = createSpan({
        name: "execute_tool",
        attributes: { "function.name": "calculator" },
      });
      expect(getToolName(span)).toBe("calculator");
    });

    it("should return tool name from gen_ai.tool.name attribute", () => {
      const span = createSpan({
        name: "execute_tool",
        attributes: { "gen_ai.tool.name": "web_search" },
      });
      expect(getToolName(span)).toBe("web_search");
    });

    it("should return undefined for non-tool spans", () => {
      const span = createSpan({
        name: "call_llm",
        attributes: { "tool.name": "should_not_return" },
      });
      expect(getToolName(span)).toBeUndefined();
    });

    it("should return undefined when no tool attributes", () => {
      const span = createSpan({
        name: "execute_tool",
        attributes: {},
      });
      expect(getToolName(span)).toBeUndefined();
    });

    // Edge cases
    it("should detect tool spans with 'tool' anywhere in name", () => {
      const span = createSpan({
        name: "my_custom_tool_v2",
        attributes: { "tool.name": "custom_tool" },
      });
      expect(getToolName(span)).toBe("custom_tool");
    });

    it("should be case insensitive for tool detection", () => {
      const span = createSpan({
        name: "EXECUTE_TOOL",
        attributes: { "tool.name": "search" },
      });
      expect(getToolName(span)).toBe("search");
    });

    it("should prioritize tool.name over function.name", () => {
      const span = createSpan({
        name: "execute_tool",
        attributes: {
          "tool.name": "primary_tool",
          "function.name": "secondary_function",
        },
      });
      expect(getToolName(span)).toBe("primary_tool");
    });

    it("should handle undefined attributes", () => {
      const span = createSpan({ name: "execute_tool" });
      // @ts-expect-error - testing edge case
      span.attributes = undefined;
      expect(getToolName(span)).toBeUndefined();
    });

    it("should handle empty string tool name", () => {
      const span = createSpan({
        name: "execute_tool",
        attributes: {
          "tool.name": "",
          "function.name": "fallback",
        },
      });
      // Empty string is falsy, so it falls through
      expect(getToolName(span)).toBe("fallback");
    });

    it("should handle null tool name", () => {
      const span = createSpan({
        name: "execute_tool",
        attributes: {
          "tool.name": null,
          "function.name": "fallback",
        },
      });
      expect(getToolName(span)).toBe("fallback");
    });

    it("should handle spans with deeply nested children", () => {
      const level3 = createSpan({
        spanId: "level3",
        name: "deep_nested",
        parentSpanId: "level2",
      });
      const level2 = createSpan({
        spanId: "level2",
        name: "nested",
        parentSpanId: "level1",
        children: [level3],
      });
      const level1 = createSpan({
        spanId: "level1",
        name: "execute_tool",
        attributes: { "tool.name": "parent_tool" },
        children: [level2],
      });
      expect(getToolName(level1)).toBe("parent_tool");
    });
  });

  describe("edge cases - spans with null values", () => {
    it("should handle span with null endTime", () => {
      const span = createSpan({
        endTime: null,
        durationMs: null,
      });
      expect(getModelName(span)).toBeUndefined();
      expect(getToolName(span)).toBeUndefined();
    });

    it("should handle span with null durationMs", () => {
      const span = createSpan({
        name: "call_llm",
        durationMs: null,
        attributes: { model: "gpt-4" },
      });
      expect(getModelName(span)).toBe("gpt-4");
    });

    it("should handle span with empty children array", () => {
      const span = createSpan({
        name: "execute_tool",
        attributes: { "tool.name": "test" },
        children: [],
      });
      expect(getToolName(span)).toBe("test");
    });
  });

  describe("edge cases - complex attribute values", () => {
    it("should handle attributes with object values", () => {
      const span = createSpan({
        name: "call_llm",
        attributes: {
          model: "gpt-4",
          metadata: { key: "value" },
          tokens: { input: 100, output: 200 },
        },
      });
      expect(getModelName(span)).toBe("gpt-4");
    });

    it("should handle attributes with array values", () => {
      const span = createSpan({
        name: "execute_tool",
        attributes: {
          "tool.name": "search",
          results: [1, 2, 3],
        },
      });
      expect(getToolName(span)).toBe("search");
    });

    it("should handle attributes with boolean values", () => {
      const span = createSpan({
        name: "call_llm",
        attributes: {
          model: "gpt-4",
          streaming: true,
          cache_hit: false,
        },
      });
      expect(getModelName(span)).toBe("gpt-4");
    });
  });
});
