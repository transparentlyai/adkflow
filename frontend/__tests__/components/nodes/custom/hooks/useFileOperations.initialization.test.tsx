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

describe("useFileOperations - initialization", () => {
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

  it("should initialize with default state", () => {
    render(
      <ProjectProvider projectPath="/project" onSaveFile={mockOnSaveFile}>
        <TestConsumer config={{ code: "initial code", file_path: "" }} />
      </ProjectProvider>,
    );

    expect(screen.getByTestId("isSaving")).toHaveTextContent("no");
    expect(screen.getByTestId("isDirty")).toHaveTextContent("no");
    expect(screen.getByTestId("filePath")).toHaveTextContent("");
  });

  it("should load content when expanded with file path", async () => {
    render(
      <ProjectProvider projectPath="/project" onSaveFile={mockOnSaveFile}>
        <TestConsumer
          config={{ code: "", file_path: "/test.py" }}
          isExpanded={true}
        />
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(vi.mocked(apiModule.readPrompt)).toHaveBeenCalledWith(
        "/project",
        "/test.py",
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("isContentLoaded")).toHaveTextContent("yes");
    });

    expect(mockSetNodes).toHaveBeenCalled();
  });

  it("should not load content when not expanded", () => {
    render(
      <ProjectProvider projectPath="/project" onSaveFile={mockOnSaveFile}>
        <TestConsumer
          config={{ code: "", file_path: "/test.py" }}
          isExpanded={false}
        />
      </ProjectProvider>,
    );

    expect(vi.mocked(apiModule.readPrompt)).not.toHaveBeenCalled();
    expect(screen.getByTestId("isContentLoaded")).toHaveTextContent("no");
  });

  it("should initialize dirty tracking for inline content", async () => {
    render(
      <ProjectProvider projectPath="/project" onSaveFile={mockOnSaveFile}>
        <TestConsumer config={{ code: "inline code", file_path: "" }} />
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("isContentLoaded")).toHaveTextContent("yes");
    });

    expect(screen.getByTestId("savedContent")).toHaveTextContent("inline code");
  });
});
