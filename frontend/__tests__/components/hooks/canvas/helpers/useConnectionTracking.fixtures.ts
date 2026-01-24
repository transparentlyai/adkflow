import { vi } from "vitest";
import type { HandleTypeInfo } from "@/lib/types";
import type { Edge } from "@xyflow/react";

// Mock functions for ConnectionContext
export const mockStartConnection = vi.fn();
export const mockEndConnection = vi.fn();
export const mockExpandNodeForConnection = vi.fn();

// Mock function for isTypeCompatible
export const mockIsTypeCompatible = vi.fn();

// Standard handle type registry used across tests
export const handleTypeRegistry: Record<string, HandleTypeInfo> = {
  "node1:output": {
    outputSource: "agent",
    outputType: "str",
  },
  "node2:input": {
    acceptedSources: ["agent"],
    acceptedTypes: ["str"],
  },
  "prompt1:output": {
    outputSource: "prompt",
    outputType: "str",
  },
  "tool1:output": {
    outputSource: "tool",
    outputType: "dict",
  },
};

// Registry with multiple: false for single-connection handles
export const registryWithMultipleFalse: Record<string, HandleTypeInfo> = {
  "callback1:output": {
    outputSource: "callback",
    outputType: "callable",
  },
  "agent_1:before_agent_callback": {
    acceptedSources: ["callback"],
    acceptedTypes: ["callable"],
    multiple: false,
  },
};

// Registry with multiple: true for multi-connection handles
export const registryWithMultipleTrue: Record<string, HandleTypeInfo> = {
  "tool1:output": {
    outputSource: "tool",
    outputType: "callable",
  },
  "agent_1:tools-input": {
    acceptedSources: ["tool"],
    acceptedTypes: ["callable"],
    multiple: true,
  },
};

// Sample edges for testing existing connections
export const existingEdgesToCallback: Edge[] = [
  {
    id: "edge1",
    source: "callback1",
    sourceHandle: "output",
    target: "agent_1",
    targetHandle: "before_agent_callback",
  },
];

export const existingEdgesToTools: Edge[] = [
  {
    id: "edge1",
    source: "tool1",
    sourceHandle: "output",
    target: "agent_1",
    targetHandle: "tools-input",
  },
];

// Setup function to configure mocks
export function setupMocks() {
  vi.mock("@/contexts/ConnectionContext", () => ({
    useConnection: vi.fn(() => ({
      startConnection: mockStartConnection,
      endConnection: mockEndConnection,
      expandNodeForConnection: mockExpandNodeForConnection,
    })),
  }));

  vi.mock("@/lib/types", () => ({
    isTypeCompatible: (...args: unknown[]) => mockIsTypeCompatible(...args),
  }));
}

// Clear all mocks helper
export function clearMocks() {
  mockStartConnection.mockClear();
  mockEndConnection.mockClear();
  mockExpandNodeForConnection.mockClear();
  mockIsTypeCompatible.mockClear();
}
