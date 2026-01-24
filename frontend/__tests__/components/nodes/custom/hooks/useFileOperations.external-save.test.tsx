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

describe("useFileOperations - external save detection", () => {
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

  it("should detect external save when fileSaveState.isDirty is cleared", async () => {
    // First load will set savedContent to "file content from API"
    const { rerender } = render(
      <ProjectProvider projectPath="/project" onSaveFile={mockOnSaveFile}>
        <TestConsumer
          config={{ code: "changed", file_path: "/test.py" }}
          externalFileSaveState={{
            filePath: "/test.py",
            content: "changed",
            isDirty: true,
          }}
        />
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("isContentLoaded")).toHaveTextContent("yes");
    });

    // Initially savedContent is from file load, and content differs, so should be dirty
    expect(screen.getByTestId("savedContent")).toHaveTextContent(
      "file content from API",
    );
    expect(screen.getByTestId("isDirty")).toHaveTextContent("yes");

    // Wait for the sync effect to set lastSyncedIsDirtyRef
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
          return result[0]?.data?.fileSaveState?.isDirty === true;
        }
        return false;
      });
      return relevantCall !== undefined;
    });

    // Simulate external save - clear isDirty flag and update content
    rerender(
      <ProjectProvider projectPath="/project" onSaveFile={mockOnSaveFile}>
        <TestConsumer
          config={{ code: "changed", file_path: "/test.py" }}
          externalFileSaveState={{
            filePath: "/test.py",
            content: "changed",
            isDirty: false,
          }}
        />
      </ProjectProvider>,
    );

    // Hook should update savedContent to match external save
    await waitFor(() => {
      expect(screen.getByTestId("savedContent")).toHaveTextContent("changed");
    });
  });

  it("should not process external save when content not loaded", () => {
    render(
      <ProjectProvider projectPath="/project" onSaveFile={mockOnSaveFile}>
        <TestConsumer
          config={{ code: "content", file_path: "/test.py" }}
          isExpanded={false}
          externalFileSaveState={{
            filePath: "/test.py",
            content: "saved",
            isDirty: false,
          }}
        />
      </ProjectProvider>,
    );

    // Should not update savedContent since not expanded/loaded
    expect(screen.getByTestId("isContentLoaded")).toHaveTextContent("no");
  });

  it("should only process external save when previously dirty", async () => {
    const { rerender } = render(
      <ProjectProvider projectPath="/project" onSaveFile={mockOnSaveFile}>
        <TestConsumer
          config={{ code: "content", file_path: "/test.py" }}
          externalFileSaveState={{
            filePath: "/test.py",
            content: "content",
            isDirty: false,
          }}
        />
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("isContentLoaded")).toHaveTextContent("yes");
    });

    const initialSavedContent =
      screen.getByTestId("savedContent").textContent;

    // Update external state but isDirty was never true
    rerender(
      <ProjectProvider projectPath="/project" onSaveFile={mockOnSaveFile}>
        <TestConsumer
          config={{ code: "content", file_path: "/test.py" }}
          externalFileSaveState={{
            filePath: "/test.py",
            content: "new content",
            isDirty: false,
          }}
        />
      </ProjectProvider>,
    );

    // Should not update savedContent since we were never dirty
    await waitFor(
      () => {
        expect(screen.getByTestId("savedContent").textContent).toBe(
          initialSavedContent,
        );
      },
      { timeout: 500 },
    );
  });
});
