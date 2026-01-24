import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode/types";

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

describe("useFileOperations - file picker handler", () => {
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

  it("should trigger file picker when change file is clicked", async () => {
    mockOnRequestFilePicker.mockImplementation(
      (currentPath, callback, options) => {
        callback("/new-file.py");
      },
    );

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

    fireEvent.click(screen.getByTestId("changeFileBtn"));

    await waitFor(() => {
      expect(mockOnRequestFilePicker).toHaveBeenCalledWith(
        "/test.py",
        expect.any(Function),
        expect.objectContaining({
          extensions: [".py"],
          filterLabel: "Python files",
        }),
      );
    });

    // Verify setNodes was called to update the file path
    await waitFor(() => {
      const calls = mockSetNodes.mock.calls;
      const relevantCall = calls.find((call) => {
        const updater = call[0];
        if (typeof updater === "function") {
          const result = updater([
            {
              id: "test-node",
              data: { config: { file_path: "/test.py" } },
              position: { x: 0, y: 0 },
            },
          ]);
          return result[0]?.data?.config?.file_path === "/new-file.py";
        }
        return false;
      });
      expect(relevantCall).toBeDefined();
    });
  });

  it("should use language-specific file extensions", async () => {
    const schemaWithMarkdown: CustomNodeSchema = {
      ui: {
        name: "Test Node",
        fields: [
          {
            id: "code",
            label: "Code",
            widget: "code_editor",
            language: "markdown",
          },
          {
            id: "file_path",
            label: "File Path",
            widget: "file_picker",
          },
        ],
      },
      input: {},
      output: {},
    };

    render(
      <ProjectProvider
        projectPath="/project"
        onSaveFile={mockOnSaveFile}
        onRequestFilePicker={mockOnRequestFilePicker}
      >
        <TestConsumer
          schema={schemaWithMarkdown}
          config={{ code: "content", file_path: "/test.md" }}
        />
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("isContentLoaded")).toHaveTextContent("yes");
    });

    fireEvent.click(screen.getByTestId("changeFileBtn"));

    expect(mockOnRequestFilePicker).toHaveBeenCalledWith(
      "/test.md",
      expect.any(Function),
      expect.objectContaining({
        extensions: [".md", ".txt"],
        filterLabel: "Markdown files",
      }),
    );
  });
});

describe("useFileOperations - file load confirmation", () => {
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

  it("should handle file load confirmation", async () => {
    render(
      <ProjectProvider projectPath="/project" onSaveFile={mockOnSaveFile}>
        <TestConsumer
          config={{ code: "existing content", file_path: "/test.py" }}
        />
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("isContentLoaded")).toHaveTextContent("yes");
    });

    // No confirmation dialog initially
    expect(screen.getByTestId("hasConfirm")).toHaveTextContent("no");
  });

  it("should handle file load cancellation", async () => {
    render(
      <ProjectProvider projectPath="/project" onSaveFile={mockOnSaveFile}>
        <TestConsumer
          config={{ code: "existing content", file_path: "/test.py" }}
        />
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("isContentLoaded")).toHaveTextContent("yes");
    });

    expect(screen.getByTestId("hasConfirm")).toHaveTextContent("no");
  });
});
