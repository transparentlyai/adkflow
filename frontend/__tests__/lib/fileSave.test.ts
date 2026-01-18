import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Node } from "@xyflow/react";
import type { CustomNodeData } from "@/components/nodes/CustomNode/types";

/** Test node data type for file save state tests */
interface TestNodeData extends Record<string, unknown> {
  label?: string;
  fileSaveState?: {
    isDirty: boolean;
    filePath: string;
    content: string;
  };
}

type TestNode = Node<TestNodeData>;

/** Helper to get fileSaveState from node data */
const getFileSaveState = (node: Node) =>
  (node.data as unknown as CustomNodeData)?.fileSaveState;

const mockSavePrompt = vi.fn();

vi.mock("@/lib/api", () => ({
  savePrompt: mockSavePrompt,
}));

const { collectDirtyFiles, saveAllDirtyFiles, clearDirtyStatesForNodes } =
  await import("@/lib/fileSave");

describe("collectDirtyFiles", () => {
  it("should return empty array for empty nodes", () => {
    const result = collectDirtyFiles([]);
    expect(result).toEqual([]);
  });

  it("should return empty array for nodes without fileSaveState", () => {
    const nodes: TestNode[] = [
      {
        id: "node-1",
        type: "custom",
        position: { x: 0, y: 0 },
        data: {},
      },
      {
        id: "node-2",
        type: "custom",
        position: { x: 100, y: 100 },
        data: { label: "Test" },
      },
    ];

    const result = collectDirtyFiles(nodes);
    expect(result).toEqual([]);
  });

  it("should return empty array for nodes with non-dirty files", () => {
    const nodes: TestNode[] = [
      {
        id: "node-1",
        type: "custom",
        position: { x: 0, y: 0 },
        data: {
          fileSaveState: {
            isDirty: false,
            filePath: "test.txt",
            content: "test content",
          },
        },
      },
    ];

    const result = collectDirtyFiles(nodes);
    expect(result).toEqual([]);
  });

  it("should return empty array when filePath is missing", () => {
    const nodes: TestNode[] = [
      {
        id: "node-1",
        type: "custom",
        position: { x: 0, y: 0 },
        data: {
          fileSaveState: {
            isDirty: true,
            filePath: "",
            content: "test content",
          },
        },
      },
    ];

    const result = collectDirtyFiles(nodes);
    expect(result).toEqual([]);
  });

  it("should collect single dirty file", () => {
    const nodes: TestNode[] = [
      {
        id: "node-1",
        type: "custom",
        position: { x: 0, y: 0 },
        data: {
          fileSaveState: {
            isDirty: true,
            filePath: "prompts/test.txt",
            content: "test content",
          },
        },
      },
    ];

    const result = collectDirtyFiles(nodes);
    expect(result).toEqual([
      {
        nodeId: "node-1",
        filePath: "prompts/test.txt",
        content: "test content",
      },
    ]);
  });

  it("should collect multiple dirty files", () => {
    const nodes: TestNode[] = [
      {
        id: "node-1",
        type: "custom",
        position: { x: 0, y: 0 },
        data: {
          fileSaveState: {
            isDirty: true,
            filePath: "prompts/test1.txt",
            content: "content 1",
          },
        },
      },
      {
        id: "node-2",
        type: "custom",
        position: { x: 100, y: 100 },
        data: {
          fileSaveState: {
            isDirty: true,
            filePath: "prompts/test2.txt",
            content: "content 2",
          },
        },
      },
    ];

    const result = collectDirtyFiles(nodes);
    expect(result).toEqual([
      {
        nodeId: "node-1",
        filePath: "prompts/test1.txt",
        content: "content 1",
      },
      {
        nodeId: "node-2",
        filePath: "prompts/test2.txt",
        content: "content 2",
      },
    ]);
  });

  it("should collect only dirty files in mixed scenario", () => {
    const nodes: TestNode[] = [
      {
        id: "node-1",
        type: "custom",
        position: { x: 0, y: 0 },
        data: {
          fileSaveState: {
            isDirty: true,
            filePath: "prompts/dirty.txt",
            content: "dirty content",
          },
        },
      },
      {
        id: "node-2",
        type: "custom",
        position: { x: 100, y: 100 },
        data: {
          fileSaveState: {
            isDirty: false,
            filePath: "prompts/clean.txt",
            content: "clean content",
          },
        },
      },
      {
        id: "node-3",
        type: "custom",
        position: { x: 200, y: 200 },
        data: {},
      },
    ];

    const result = collectDirtyFiles(nodes);
    expect(result).toEqual([
      {
        nodeId: "node-1",
        filePath: "prompts/dirty.txt",
        content: "dirty content",
      },
    ]);
  });
});

describe("saveAllDirtyFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty summary for empty list", async () => {
    const result = await saveAllDirtyFiles("/project/path", []);

    expect(result).toEqual({
      totalFiles: 0,
      successCount: 0,
      errorCount: 0,
      results: [],
    });
    expect(mockSavePrompt).not.toHaveBeenCalled();
  });

  it("should save single file successfully", async () => {
    mockSavePrompt.mockResolvedValueOnce(undefined);

    const dirtyFiles = [
      {
        nodeId: "node-1",
        filePath: "prompts/test.txt",
        content: "test content",
      },
    ];

    const result = await saveAllDirtyFiles("/project/path", dirtyFiles);

    expect(mockSavePrompt).toHaveBeenCalledTimes(1);
    expect(mockSavePrompt).toHaveBeenCalledWith(
      "/project/path",
      "prompts/test.txt",
      "test content",
    );
    expect(result).toEqual({
      totalFiles: 1,
      successCount: 1,
      errorCount: 0,
      results: [
        {
          nodeId: "node-1",
          filePath: "prompts/test.txt",
          success: true,
        },
      ],
    });
  });

  it("should save multiple files successfully", async () => {
    mockSavePrompt.mockResolvedValue(undefined);

    const dirtyFiles = [
      {
        nodeId: "node-1",
        filePath: "prompts/test1.txt",
        content: "content 1",
      },
      {
        nodeId: "node-2",
        filePath: "prompts/test2.txt",
        content: "content 2",
      },
      {
        nodeId: "node-3",
        filePath: "prompts/test3.txt",
        content: "content 3",
      },
    ];

    const result = await saveAllDirtyFiles("/project/path", dirtyFiles);

    expect(mockSavePrompt).toHaveBeenCalledTimes(3);
    expect(result).toEqual({
      totalFiles: 3,
      successCount: 3,
      errorCount: 0,
      results: [
        {
          nodeId: "node-1",
          filePath: "prompts/test1.txt",
          success: true,
        },
        {
          nodeId: "node-2",
          filePath: "prompts/test2.txt",
          success: true,
        },
        {
          nodeId: "node-3",
          filePath: "prompts/test3.txt",
          success: true,
        },
      ],
    });
  });

  it("should handle single file failure", async () => {
    mockSavePrompt.mockRejectedValueOnce(new Error("Failed to write file"));

    const dirtyFiles = [
      {
        nodeId: "node-1",
        filePath: "prompts/test.txt",
        content: "test content",
      },
    ];

    const result = await saveAllDirtyFiles("/project/path", dirtyFiles);

    expect(result).toEqual({
      totalFiles: 1,
      successCount: 0,
      errorCount: 1,
      results: [
        {
          nodeId: "node-1",
          filePath: "prompts/test.txt",
          success: false,
          error: "Failed to write file",
        },
      ],
    });
  });

  it("should handle all files failing", async () => {
    mockSavePrompt.mockRejectedValue(new Error("Disk full"));

    const dirtyFiles = [
      {
        nodeId: "node-1",
        filePath: "prompts/test1.txt",
        content: "content 1",
      },
      {
        nodeId: "node-2",
        filePath: "prompts/test2.txt",
        content: "content 2",
      },
    ];

    const result = await saveAllDirtyFiles("/project/path", dirtyFiles);

    expect(result).toEqual({
      totalFiles: 2,
      successCount: 0,
      errorCount: 2,
      results: [
        {
          nodeId: "node-1",
          filePath: "prompts/test1.txt",
          success: false,
          error: "Disk full",
        },
        {
          nodeId: "node-2",
          filePath: "prompts/test2.txt",
          success: false,
          error: "Disk full",
        },
      ],
    });
  });

  it("should handle mixed success and failure", async () => {
    mockSavePrompt
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Permission denied"))
      .mockResolvedValueOnce(undefined);

    const dirtyFiles = [
      {
        nodeId: "node-1",
        filePath: "prompts/test1.txt",
        content: "content 1",
      },
      {
        nodeId: "node-2",
        filePath: "prompts/test2.txt",
        content: "content 2",
      },
      {
        nodeId: "node-3",
        filePath: "prompts/test3.txt",
        content: "content 3",
      },
    ];

    const result = await saveAllDirtyFiles("/project/path", dirtyFiles);

    expect(result).toEqual({
      totalFiles: 3,
      successCount: 2,
      errorCount: 1,
      results: [
        {
          nodeId: "node-1",
          filePath: "prompts/test1.txt",
          success: true,
        },
        {
          nodeId: "node-2",
          filePath: "prompts/test2.txt",
          success: false,
          error: "Permission denied",
        },
        {
          nodeId: "node-3",
          filePath: "prompts/test3.txt",
          success: true,
        },
      ],
    });
  });

  it("should handle non-Error exceptions", async () => {
    mockSavePrompt.mockRejectedValueOnce("String error");

    const dirtyFiles = [
      {
        nodeId: "node-1",
        filePath: "prompts/test.txt",
        content: "test content",
      },
    ];

    const result = await saveAllDirtyFiles("/project/path", dirtyFiles);

    expect(result).toEqual({
      totalFiles: 1,
      successCount: 0,
      errorCount: 1,
      results: [
        {
          nodeId: "node-1",
          filePath: "prompts/test.txt",
          success: false,
          error: "String error",
        },
      ],
    });
  });
});

describe("clearDirtyStatesForNodes", () => {
  it("should return unchanged nodes for empty set", () => {
    const nodes: TestNode[] = [
      {
        id: "node-1",
        type: "custom",
        position: { x: 0, y: 0 },
        data: {
          fileSaveState: {
            isDirty: true,
            filePath: "test.txt",
            content: "test",
          },
        },
      },
    ];

    const result = clearDirtyStatesForNodes(nodes, new Set());
    expect(result).toEqual(nodes);
  });

  it("should clear dirty state for specified node", () => {
    const nodes: TestNode[] = [
      {
        id: "node-1",
        type: "custom",
        position: { x: 0, y: 0 },
        data: {
          fileSaveState: {
            isDirty: true,
            filePath: "test.txt",
            content: "test content",
          },
        },
      },
    ];

    const result = clearDirtyStatesForNodes(nodes, new Set(["node-1"]));

    expect(getFileSaveState(result[0])?.isDirty).toBe(false);
    expect(getFileSaveState(result[0])?.filePath).toBe("test.txt");
    expect(getFileSaveState(result[0])?.content).toBe("test content");
  });

  it("should preserve other node data when clearing dirty state", () => {
    const nodes: TestNode[] = [
      {
        id: "node-1",
        type: "custom",
        position: { x: 0, y: 0 },
        data: {
          fileSaveState: {
            isDirty: true,
            filePath: "test.txt",
            content: "test",
          },
        },
      },
    ];

    const result = clearDirtyStatesForNodes(nodes, new Set(["node-1"]));
    const resultData = result[0].data as unknown as CustomNodeData;

    expect(resultData.fileSaveState?.isDirty).toBe(false);
  });

  it("should not modify nodes without fileSaveState", () => {
    const nodes: TestNode[] = [
      {
        id: "node-1",
        type: "custom",
        position: { x: 0, y: 0 },
        data: {
          label: "Test Node",
        },
      },
    ];

    const result = clearDirtyStatesForNodes(nodes, new Set(["node-1"]));
    expect(result).toEqual(nodes);
  });

  it("should clear dirty state for multiple nodes", () => {
    const nodes: TestNode[] = [
      {
        id: "node-1",
        type: "custom",
        position: { x: 0, y: 0 },
        data: {
          fileSaveState: {
            isDirty: true,
            filePath: "test1.txt",
            content: "content 1",
          },
        },
      },
      {
        id: "node-2",
        type: "custom",
        position: { x: 100, y: 100 },
        data: {
          fileSaveState: {
            isDirty: true,
            filePath: "test2.txt",
            content: "content 2",
          },
        },
      },
      {
        id: "node-3",
        type: "custom",
        position: { x: 200, y: 200 },
        data: {
          fileSaveState: {
            isDirty: true,
            filePath: "test3.txt",
            content: "content 3",
          },
        },
      },
    ];

    const result = clearDirtyStatesForNodes(
      nodes,
      new Set(["node-1", "node-3"]),
    );

    expect(getFileSaveState(result[0])?.isDirty).toBe(false);
    expect(getFileSaveState(result[1])?.isDirty).toBe(true);
    expect(getFileSaveState(result[2])?.isDirty).toBe(false);
  });

  it("should preserve nodes not in the success set", () => {
    const nodes: TestNode[] = [
      {
        id: "node-1",
        type: "custom",
        position: { x: 0, y: 0 },
        data: {
          fileSaveState: {
            isDirty: true,
            filePath: "test1.txt",
            content: "content 1",
          },
        },
      },
      {
        id: "node-2",
        type: "custom",
        position: { x: 100, y: 100 },
        data: {
          fileSaveState: {
            isDirty: true,
            filePath: "test2.txt",
            content: "content 2",
          },
        },
      },
    ];

    const result = clearDirtyStatesForNodes(nodes, new Set(["node-1"]));

    expect(getFileSaveState(result[0])?.isDirty).toBe(false);
    expect(getFileSaveState(result[1])?.isDirty).toBe(true);
  });

  it("should create new node objects without mutating originals", () => {
    const nodes: TestNode[] = [
      {
        id: "node-1",
        type: "custom",
        position: { x: 0, y: 0 },
        data: {
          fileSaveState: {
            isDirty: true,
            filePath: "test.txt",
            content: "test",
          },
        },
      },
    ];

    const result = clearDirtyStatesForNodes(nodes, new Set(["node-1"]));

    expect(result[0]).not.toBe(nodes[0]);
    expect(result[0].data).not.toBe(nodes[0].data);
    expect(getFileSaveState(nodes[0])?.isDirty).toBe(true);
    expect(getFileSaveState(result[0])?.isDirty).toBe(false);
  });
});
