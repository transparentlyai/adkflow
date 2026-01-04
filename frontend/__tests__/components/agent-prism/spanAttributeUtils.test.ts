import { describe, it, expect } from "vitest";
import {
  getModelName,
  getToolName,
} from "@/components/agent-prism/spanAttributeUtils";
import type { TraceSpan } from "@evilmartians/agent-prism-types";

describe("spanAttributeUtils", () => {
  describe("getModelName", () => {
    it("should return undefined when no model info exists", () => {
      const span: TraceSpan = {
        id: "1",
        type: "llm_call",
        name: "test",
        startTime: 0,
        endTime: 100,
        children: [],
      };
      expect(getModelName(span)).toBeUndefined();
    });

    it("should get model from metadata.model", () => {
      const span: TraceSpan = {
        id: "1",
        type: "llm_call",
        name: "test",
        startTime: 0,
        endTime: 100,
        children: [],
        metadata: { model: "gpt-4" },
      };
      expect(getModelName(span)).toBe("gpt-4");
    });

    it("should get model from metadata.modelName", () => {
      const span: TraceSpan = {
        id: "1",
        type: "llm_call",
        name: "test",
        startTime: 0,
        endTime: 100,
        children: [],
        metadata: { modelName: "claude-3" },
      };
      expect(getModelName(span)).toBe("claude-3");
    });

    it("should get model from metadata.model_name", () => {
      const span: TraceSpan = {
        id: "1",
        type: "llm_call",
        name: "test",
        startTime: 0,
        endTime: 100,
        children: [],
        metadata: { model_name: "gemini-pro" },
      };
      expect(getModelName(span)).toBe("gemini-pro");
    });

    it("should get model from gen_ai.request.model attribute", () => {
      const span: TraceSpan = {
        id: "1",
        type: "llm_call",
        name: "test",
        startTime: 0,
        endTime: 100,
        children: [],
        attributes: [
          {
            key: "gen_ai.request.model",
            value: { stringValue: "gpt-4-turbo" },
          },
        ],
      };
      expect(getModelName(span)).toBe("gpt-4-turbo");
    });

    it("should get model from llm.model_name attribute", () => {
      const span: TraceSpan = {
        id: "1",
        type: "llm_call",
        name: "test",
        startTime: 0,
        endTime: 100,
        children: [],
        attributes: [
          { key: "llm.model_name", value: { stringValue: "claude-3-opus" } },
        ],
      };
      expect(getModelName(span)).toBe("claude-3-opus");
    });

    it("should get model from model attribute (case insensitive)", () => {
      const span: TraceSpan = {
        id: "1",
        type: "llm_call",
        name: "test",
        startTime: 0,
        endTime: 100,
        children: [],
        attributes: [{ key: "MODEL", value: { stringValue: "mistral-7b" } }],
      };
      expect(getModelName(span)).toBe("mistral-7b");
    });

    it("should get model from model_name attribute", () => {
      const span: TraceSpan = {
        id: "1",
        type: "llm_call",
        name: "test",
        startTime: 0,
        endTime: 100,
        children: [],
        attributes: [{ key: "model_name", value: { stringValue: "llama-3" } }],
      };
      expect(getModelName(span)).toBe("llama-3");
    });

    it("should return undefined when attributes exist but no model key matches", () => {
      const span: TraceSpan = {
        id: "1",
        type: "llm_call",
        name: "test",
        startTime: 0,
        endTime: 100,
        children: [],
        attributes: [
          { key: "some_other_key", value: { stringValue: "value" } },
          { key: "another_key", value: { stringValue: "value2" } },
        ],
      };
      expect(getModelName(span)).toBeUndefined();
    });
  });

  describe("getToolName", () => {
    it("should return undefined for non-tool spans", () => {
      const span: TraceSpan = {
        id: "1",
        type: "llm_call",
        name: "test",
        startTime: 0,
        endTime: 100,
        children: [],
      };
      expect(getToolName(span)).toBeUndefined();
    });

    it("should return undefined when no tool info exists", () => {
      const span: TraceSpan = {
        id: "1",
        type: "tool_execution",
        name: "test",
        startTime: 0,
        endTime: 100,
        children: [],
      };
      expect(getToolName(span)).toBeUndefined();
    });

    it("should get tool from metadata.tool", () => {
      const span: TraceSpan = {
        id: "1",
        type: "tool_execution",
        name: "test",
        startTime: 0,
        endTime: 100,
        children: [],
        metadata: { tool: "search" },
      };
      expect(getToolName(span)).toBe("search");
    });

    it("should get tool from metadata.toolName", () => {
      const span: TraceSpan = {
        id: "1",
        type: "tool_execution",
        name: "test",
        startTime: 0,
        endTime: 100,
        children: [],
        metadata: { toolName: "calculator" },
      };
      expect(getToolName(span)).toBe("calculator");
    });

    it("should get tool from metadata.tool_name", () => {
      const span: TraceSpan = {
        id: "1",
        type: "tool_execution",
        name: "test",
        startTime: 0,
        endTime: 100,
        children: [],
        metadata: { tool_name: "browser" },
      };
      expect(getToolName(span)).toBe("browser");
    });

    it("should get tool from metadata.function", () => {
      const span: TraceSpan = {
        id: "1",
        type: "tool_execution",
        name: "test",
        startTime: 0,
        endTime: 100,
        children: [],
        metadata: { function: "get_weather" },
      };
      expect(getToolName(span)).toBe("get_weather");
    });

    it("should get tool from tool.name attribute", () => {
      const span: TraceSpan = {
        id: "1",
        type: "tool_execution",
        name: "test",
        startTime: 0,
        endTime: 100,
        children: [],
        attributes: [{ key: "tool.name", value: { stringValue: "code_exec" } }],
      };
      expect(getToolName(span)).toBe("code_exec");
    });

    it("should get tool from function.name attribute", () => {
      const span: TraceSpan = {
        id: "1",
        type: "tool_execution",
        name: "test",
        startTime: 0,
        endTime: 100,
        children: [],
        attributes: [
          { key: "function.name", value: { stringValue: "fetch_data" } },
        ],
      };
      expect(getToolName(span)).toBe("fetch_data");
    });

    it("should get tool from gen_ai.tool.name attribute", () => {
      const span: TraceSpan = {
        id: "1",
        type: "tool_execution",
        name: "test",
        startTime: 0,
        endTime: 100,
        children: [],
        attributes: [
          { key: "gen_ai.tool.name", value: { stringValue: "web_search" } },
        ],
      };
      expect(getToolName(span)).toBe("web_search");
    });

    it("should return undefined when attributes exist but no tool key matches", () => {
      const span: TraceSpan = {
        id: "1",
        type: "tool_execution",
        name: "test",
        startTime: 0,
        endTime: 100,
        children: [],
        attributes: [
          { key: "some_other_key", value: { stringValue: "value" } },
          { key: "another_key", value: { stringValue: "value2" } },
        ],
      };
      expect(getToolName(span)).toBeUndefined();
    });
  });
});
