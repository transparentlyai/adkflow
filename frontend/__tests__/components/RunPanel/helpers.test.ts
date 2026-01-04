import { describe, it, expect } from "vitest";
import {
  formatEventContent,
  getEventColor,
  getStatusIcon,
} from "@/components/RunPanel/helpers";
import type { RunEvent, EventType, RunStatus } from "@/lib/types";

// Helper to create RunEvent objects
function createEvent(
  type: EventType,
  data: Record<string, unknown> = {},
  agentName?: string,
): RunEvent {
  return {
    type,
    timestamp: Date.now(),
    run_id: "test-run-id",
    agent_name: agentName,
    data,
  };
}

describe("helpers", () => {
  describe("formatEventContent", () => {
    const projectPath = "/path/to/project";

    describe("run_start event", () => {
      it("should format with project path from event data", () => {
        const event = createEvent("run_start", {
          project_path: "/custom/path",
        });

        const result = formatEventContent(event, projectPath);

        expect(result).toBe("Run started: /custom/path");
      });

      it("should fall back to provided project path when not in event data", () => {
        const event = createEvent("run_start", {});

        const result = formatEventContent(event, projectPath);

        expect(result).toBe("Run started: /path/to/project");
      });
    });

    describe("run_complete event", () => {
      it("should return completion message", () => {
        const event = createEvent("run_complete");

        const result = formatEventContent(event, projectPath);

        expect(result).toBe("Run completed successfully");
      });
    });

    describe("agent_start event", () => {
      it("should format with agent name", () => {
        const event = createEvent("agent_start", {}, "MainAgent");

        const result = formatEventContent(event, projectPath);

        expect(result).toBe("Agent started: MainAgent");
      });

      it("should handle undefined agent name", () => {
        const event = createEvent("agent_start");

        const result = formatEventContent(event, projectPath);

        expect(result).toBe("Agent started: undefined");
      });
    });

    describe("agent_end event", () => {
      it("should format with agent name", () => {
        const event = createEvent("agent_end", {}, "MainAgent");

        const result = formatEventContent(event, projectPath);

        expect(result).toBe("Agent finished: MainAgent");
      });
    });

    describe("agent_output event", () => {
      it("should return output content", () => {
        const event = createEvent("agent_output", {
          output: "Hello, this is the agent output",
        });

        const result = formatEventContent(event, projectPath);

        expect(result).toBe("Hello, this is the agent output");
      });

      it("should return empty string when no output", () => {
        const event = createEvent("agent_output", {});

        const result = formatEventContent(event, projectPath);

        expect(result).toBe("");
      });

      it("should return empty string for null output", () => {
        const event = createEvent("agent_output", { output: null });

        const result = formatEventContent(event, projectPath);

        expect(result).toBe("");
      });
    });

    describe("tool_call event", () => {
      it("should format with tool name and arguments", () => {
        const event = createEvent("tool_call", {
          tool_name: "search",
          args: '{"query": "test"}',
        });

        const result = formatEventContent(event, projectPath);

        expect(result).toBe('Calling search({"query": "test"})');
      });

      it("should format without arguments when not provided", () => {
        const event = createEvent("tool_call", {
          tool_name: "search",
        });

        const result = formatEventContent(event, projectPath);

        expect(result).toBe("Calling tool: search");
      });

      it("should format without arguments when args is empty string", () => {
        const event = createEvent("tool_call", {
          tool_name: "search",
          args: "",
        });

        const result = formatEventContent(event, projectPath);

        expect(result).toBe("Calling tool: search");
      });
    });

    describe("tool_result event", () => {
      it("should format with tool name and result", () => {
        const event = createEvent("tool_result", {
          tool_name: "search",
          result: "Found 10 items",
        });

        const result = formatEventContent(event, projectPath);

        expect(result).toBe("Tool search: Found 10 items");
      });

      it("should format without result when not provided", () => {
        const event = createEvent("tool_result", {
          tool_name: "search",
        });

        const result = formatEventContent(event, projectPath);

        expect(result).toBe("Tool result: search");
      });

      it("should format without result when result is empty string", () => {
        const event = createEvent("tool_result", {
          tool_name: "search",
          result: "",
        });

        const result = formatEventContent(event, projectPath);

        expect(result).toBe("Tool result: search");
      });
    });

    describe("thinking event", () => {
      it("should return thinking message", () => {
        const event = createEvent("thinking");

        const result = formatEventContent(event, projectPath);

        expect(result).toBe("Thinking...");
      });
    });

    describe("run_error event", () => {
      it("should format with error message", () => {
        const event = createEvent("run_error", {
          error: "Something went wrong",
        });

        const result = formatEventContent(event, projectPath);

        expect(result).toBe("Error: Something went wrong");
      });

      it("should show unknown error when error is not provided", () => {
        const event = createEvent("run_error", {});

        const result = formatEventContent(event, projectPath);

        expect(result).toBe("Error: Unknown error");
      });
    });

    describe("user_input_required event", () => {
      it("should format with node name", () => {
        const event = createEvent("user_input_required", {
          node_name: "InputNode",
        });

        const result = formatEventContent(event, projectPath);

        expect(result).toContain("Waiting for input: InputNode");
      });
    });

    describe("user_input_received event", () => {
      it("should format with node name", () => {
        const event = createEvent("user_input_received", {
          node_name: "InputNode",
        });

        const result = formatEventContent(event, projectPath);

        expect(result).toContain("Input received: InputNode");
      });
    });

    describe("user_input_timeout event", () => {
      it("should format with node name", () => {
        const event = createEvent("user_input_timeout", {
          node_name: "InputNode",
        });

        const result = formatEventContent(event, projectPath);

        expect(result).toContain("Input timeout: InputNode");
      });
    });

    describe("warning event", () => {
      it("should return JSON stringified data for warning type", () => {
        const event = createEvent("warning", { message: "Warning message" });

        const result = formatEventContent(event, projectPath);

        expect(result).toBe('{"message":"Warning message"}');
      });
    });

    describe("unknown event type", () => {
      it("should return JSON stringified data", () => {
        // TypeScript would normally prevent this, but test defensive coding
        const event = {
          type: "unknown_type" as EventType,
          timestamp: Date.now(),
          run_id: "test-run-id",
          data: { key: "value" },
        };

        const result = formatEventContent(event, projectPath);

        expect(result).toBe('{"key":"value"}');
      });
    });
  });

  describe("getEventColor", () => {
    it("should return blue for agent_start", () => {
      expect(getEventColor("agent_start")).toBe("text-blue-400");
    });

    it("should return green for agent_end", () => {
      expect(getEventColor("agent_end")).toBe("text-green-400");
    });

    it("should return gray-300 for agent_output", () => {
      expect(getEventColor("agent_output")).toBe("text-gray-300");
    });

    it("should return yellow-400 for tool_call", () => {
      expect(getEventColor("tool_call")).toBe("text-yellow-400");
    });

    it("should return yellow-300 for tool_result", () => {
      expect(getEventColor("tool_result")).toBe("text-yellow-300");
    });

    it("should return gray-500 for thinking", () => {
      expect(getEventColor("thinking")).toBe("text-gray-500");
    });

    it("should return red for run_error", () => {
      expect(getEventColor("run_error")).toBe("text-red-400");
    });

    it("should return yellow for warning", () => {
      expect(getEventColor("warning")).toBe("text-yellow-400");
    });

    it("should return cyan for run_start", () => {
      expect(getEventColor("run_start")).toBe("text-cyan-400");
    });

    it("should return cyan for run_complete", () => {
      expect(getEventColor("run_complete")).toBe("text-cyan-400");
    });

    it("should return amber for user_input_required", () => {
      expect(getEventColor("user_input_required")).toBe("text-amber-400");
    });

    it("should return green for user_input_received", () => {
      expect(getEventColor("user_input_received")).toBe("text-green-400");
    });

    it("should return orange for user_input_timeout", () => {
      expect(getEventColor("user_input_timeout")).toBe("text-orange-400");
    });

    it("should return gray for info type", () => {
      expect(getEventColor("info")).toBe("text-gray-400");
    });

    it("should return default gray-300 for unknown type", () => {
      // TypeScript would prevent this, but test defensive coding
      expect(getEventColor("unknown" as EventType)).toBe("text-gray-300");
    });
  });

  describe("getStatusIcon", () => {
    it("should return loader icon and blue color for running status", () => {
      const result = getStatusIcon("running");

      expect(result).toEqual({ icon: "loader", color: "text-blue-500" });
    });

    it("should return check icon and green color for completed status", () => {
      const result = getStatusIcon("completed");

      expect(result).toEqual({ icon: "check", color: "text-green-500" });
    });

    it("should return alert icon and red color for failed status", () => {
      const result = getStatusIcon("failed");

      expect(result).toEqual({ icon: "alert", color: "text-red-500" });
    });

    it("should return square icon and yellow color for cancelled status", () => {
      const result = getStatusIcon("cancelled");

      expect(result).toEqual({ icon: "square", color: "text-yellow-500" });
    });

    it("should return play icon and gray color for pending status", () => {
      const result = getStatusIcon("pending");

      expect(result).toEqual({ icon: "play", color: "text-gray-500" });
    });

    it("should return default play icon and gray for unknown status", () => {
      // TypeScript would prevent this, but test defensive coding
      const result = getStatusIcon("unknown" as RunStatus);

      expect(result).toEqual({ icon: "play", color: "text-gray-500" });
    });
  });

  describe("integration scenarios", () => {
    it("should handle a typical workflow sequence", () => {
      const projectPath = "/my/project";

      // Simulate a workflow execution sequence
      const events: Array<{ event: RunEvent; expectedContent: string }> = [
        {
          event: createEvent("run_start", { project_path: projectPath }),
          expectedContent: `Run started: ${projectPath}`,
        },
        {
          event: createEvent("agent_start", {}, "RootAgent"),
          expectedContent: "Agent started: RootAgent",
        },
        {
          event: createEvent("tool_call", {
            tool_name: "web_search",
            args: "query=test",
          }),
          expectedContent: "Calling web_search(query=test)",
        },
        {
          event: createEvent("tool_result", {
            tool_name: "web_search",
            result: "Results found",
          }),
          expectedContent: "Tool web_search: Results found",
        },
        {
          event: createEvent("agent_output", {
            output: "Based on the search...",
          }),
          expectedContent: "Based on the search...",
        },
        {
          event: createEvent("agent_end", {}, "RootAgent"),
          expectedContent: "Agent finished: RootAgent",
        },
        {
          event: createEvent("run_complete"),
          expectedContent: "Run completed successfully",
        },
      ];

      for (const { event, expectedContent } of events) {
        expect(formatEventContent(event, projectPath)).toBe(expectedContent);
      }
    });

    it("should handle error workflow sequence", () => {
      const projectPath = "/my/project";

      const startEvent = createEvent("run_start", {
        project_path: projectPath,
      });
      expect(formatEventContent(startEvent, projectPath)).toBe(
        `Run started: ${projectPath}`,
      );

      const errorEvent = createEvent("run_error", {
        error: "Connection timeout",
      });
      expect(formatEventContent(errorEvent, projectPath)).toBe(
        "Error: Connection timeout",
      );
      expect(getEventColor("run_error")).toBe("text-red-400");
    });

    it("should handle user input workflow", () => {
      const projectPath = "/my/project";

      // User input required
      const inputRequiredEvent = createEvent("user_input_required", {
        node_name: "UserConfirmation",
      });
      expect(formatEventContent(inputRequiredEvent, projectPath)).toContain(
        "Waiting for input: UserConfirmation",
      );
      expect(getEventColor("user_input_required")).toBe("text-amber-400");

      // User input received
      const inputReceivedEvent = createEvent("user_input_received", {
        node_name: "UserConfirmation",
      });
      expect(formatEventContent(inputReceivedEvent, projectPath)).toContain(
        "Input received: UserConfirmation",
      );
      expect(getEventColor("user_input_received")).toBe("text-green-400");
    });
  });

  describe("edge cases", () => {
    it("should handle empty project path", () => {
      const event = createEvent("run_start", {});

      const result = formatEventContent(event, "");

      expect(result).toBe("Run started: ");
    });

    it("should handle special characters in tool arguments", () => {
      const event = createEvent("tool_call", {
        tool_name: "execute",
        args: '{"command": "echo \\"hello\\""}',
      });

      const result = formatEventContent(event, "/project");

      expect(result).toBe('Calling execute({"command": "echo \\"hello\\""})');
    });

    it("should handle very long output strings", () => {
      const longOutput = "A".repeat(10000);
      const event = createEvent("agent_output", { output: longOutput });

      const result = formatEventContent(event, "/project");

      expect(result).toBe(longOutput);
      expect(result.length).toBe(10000);
    });

    it("should handle unicode characters in content", () => {
      const event = createEvent("agent_output", {
        output: "Hello, World!",
      });

      const result = formatEventContent(event, "/project");

      expect(result).toContain("Hello");
    });

    it("should handle empty data object", () => {
      const event = createEvent("run_error", {});

      const result = formatEventContent(event, "/project");

      expect(result).toBe("Error: Unknown error");
    });

    it("should handle numeric values in data", () => {
      const event = createEvent("tool_result", {
        tool_name: "calculate",
        result: 42,
      });

      // result is expected to be string, but when cast as string | undefined,
      // the number 42 is truthy and gets coerced to string in template literal
      const result = formatEventContent(event, "/project");

      expect(result).toBe("Tool calculate: 42");
    });
  });
});
