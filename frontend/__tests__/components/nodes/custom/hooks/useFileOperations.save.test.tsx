import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// Create mock functions
const mockSetNodes = vi.fn();
const mockOnSaveFile = vi.fn();
const mockOnRequestFilePicker = vi.fn();

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

describe("useFileOperations - file save handler", () => {
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

  it("should save file and update saved content", async () => {
    mockOnSaveFile.mockResolvedValueOnce(undefined);

    render(
      <ProjectProvider
        projectPath="/project"
        onSaveFile={mockOnSaveFile}
        onRequestFilePicker={mockOnRequestFilePicker}
      >
        <TestConsumer
          config={{ code: "new content", file_path: "/test.py" }}
        />
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("isContentLoaded")).toHaveTextContent("yes");
    });

    fireEvent.click(screen.getByTestId("saveBtn"));

    await waitFor(() => {
      expect(screen.getByTestId("isSaving")).toHaveTextContent("yes");
    });

    await waitFor(() => {
      expect(mockOnSaveFile).toHaveBeenCalledWith("/test.py", "new content");
    });

    await waitFor(() => {
      expect(screen.getByTestId("isSaving")).toHaveTextContent("no");
    });
  });

  it("should handle save errors gracefully", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockOnSaveFile.mockRejectedValueOnce(new Error("Save failed"));

    render(
      <ProjectProvider
        projectPath="/project"
        onSaveFile={mockOnSaveFile}
        onRequestFilePicker={mockOnRequestFilePicker}
      >
        <TestConsumer config={{ code: "content", file_path: "/test.py" }} />
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("isContentLoaded")).toHaveTextContent("yes");
    });

    fireEvent.click(screen.getByTestId("saveBtn"));

    await waitFor(() => {
      expect(mockOnSaveFile).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByTestId("isSaving")).toHaveTextContent("no");
    });

    expect(consoleError).toHaveBeenCalledWith(
      "Failed to save:",
      expect.any(Error),
    );

    consoleError.mockRestore();
  });

  it("should not save when no file path", async () => {
    render(
      <ProjectProvider
        projectPath="/project"
        onSaveFile={mockOnSaveFile}
        onRequestFilePicker={mockOnRequestFilePicker}
      >
        <TestConsumer config={{ code: "content", file_path: "" }} />
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("isContentLoaded")).toHaveTextContent("yes");
    });

    fireEvent.click(screen.getByTestId("saveBtn"));

    expect(mockOnSaveFile).not.toHaveBeenCalled();
  });
});
