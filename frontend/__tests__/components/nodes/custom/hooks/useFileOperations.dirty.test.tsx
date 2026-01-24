import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";

// Create mock functions
const mockSetNodes = vi.fn();
const mockOnSaveFile = vi.fn();

// Mock modules BEFORE imports
vi.mock("@/lib/api", () => ({
  readPrompt: vi.fn(),
}));

vi.mock("@xyflow/react", async () => {
  const actual = await vi.importActual("@xyflow/react");
  return {
    ...actual,
    useReactFlow: vi.fn(() => ({
      setNodes: vi.fn(),
      getNodes: vi.fn(() => []),
      getNode: vi.fn(),
    })),
  };
});

// Import after mocks
import { ProjectProvider } from "@/contexts/ProjectContext";
import * as apiModule from "@/lib/api";
import * as xyflowModule from "@xyflow/react";
import { TestConsumer } from "./useFileOperations.fixtures";

describe("useFileOperations - dirty state tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiModule.readPrompt).mockResolvedValue({
      content: "file content from API",
    });
    vi.mocked(xyflowModule.useReactFlow).mockReturnValue({
      setNodes: mockSetNodes,
      getNodes: vi.fn(() => []),
      getNode: vi.fn(),
      setEdges: vi.fn(),
      getEdges: vi.fn(() => []),
      getEdge: vi.fn(),
      fitView: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      getZoom: vi.fn(() => 1),
      setCenter: vi.fn(),
      project: vi.fn((pos) => pos),
      screenToFlowPosition: vi.fn((pos) => pos),
      flowToScreenPosition: vi.fn((pos) => pos),
      getViewport: vi.fn(() => ({ x: 0, y: 0, zoom: 1 })),
      setViewport: vi.fn(),
      viewportInitialized: true,
    } as unknown as ReturnType<typeof xyflowModule.useReactFlow>);
  });

  it("should track dirty state when content differs from file", async () => {
    render(
      <ProjectProvider projectPath="/project" onSaveFile={mockOnSaveFile}>
        <TestConsumer
          config={{ code: "changed content", file_path: "/test.py" }}
        />
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("isContentLoaded")).toHaveTextContent("yes");
    });

    // Content loaded from file is "file content from API", but config has "changed content"
    // So it should be dirty
    expect(screen.getByTestId("isDirty")).toHaveTextContent("yes");
    expect(screen.getByTestId("savedContent")).toHaveTextContent(
      "file content from API",
    );
  });

  it("should not track dirty state for inline content without file", async () => {
    render(
      <ProjectProvider projectPath="/project" onSaveFile={mockOnSaveFile}>
        <TestConsumer config={{ code: "inline", file_path: "" }} />
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("isContentLoaded")).toHaveTextContent("yes");
    });

    // No file path, so should never be dirty
    expect(screen.getByTestId("isDirty")).toHaveTextContent("no");
  });

  it("should sync dirty state to node data via fileSaveState", async () => {
    render(
      <ProjectProvider projectPath="/project" onSaveFile={mockOnSaveFile}>
        <TestConsumer
          config={{ code: "changed content", file_path: "/test.py" }}
        />
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("isContentLoaded")).toHaveTextContent("yes");
    });

    // Wait for setNodes to be called with fileSaveState
    await waitFor(() => {
      const calls = mockSetNodes.mock.calls;
      const relevantCall = calls.find((call) => {
        const updater = call[0];
        if (typeof updater === "function") {
          const result = updater([
            {
              id: "test-node",
              data: {},
              position: { x: 0, y: 0 },
            },
          ]);
          return result[0]?.data?.fileSaveState !== undefined;
        }
        return false;
      });
      expect(relevantCall).toBeDefined();
    });
  });

  it("should clear fileSaveState when no file path", async () => {
    render(
      <ProjectProvider projectPath="/project" onSaveFile={mockOnSaveFile}>
        <TestConsumer config={{ code: "content", file_path: "" }} />
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("isContentLoaded")).toHaveTextContent("yes");
    });

    // Should call setNodes to clear fileSaveState
    await waitFor(
      () => {
        const calls = mockSetNodes.mock.calls;
        const relevantCall = calls.find((call) => {
          const updater = call[0];
          if (typeof updater === "function") {
            const result = updater([
              {
                id: "test-node",
                data: { fileSaveState: { something: "here" } },
                position: { x: 0, y: 0 },
              },
            ]);
            return result[0]?.data?.fileSaveState === undefined;
          }
          return false;
        });
        return relevantCall !== undefined;
      },
      { timeout: 2000 },
    );
  });
});
