import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode/types";

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

describe("useFileOperations - error handling", () => {
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

  it("should handle file read error gracefully", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    vi.mocked(apiModule.readPrompt).mockRejectedValueOnce(
      new Error("File not found"),
    );

    render(
      <ProjectProvider projectPath="/project" onSaveFile={mockOnSaveFile}>
        <TestConsumer
          config={{ code: "fallback", file_path: "/missing.py" }}
        />
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(vi.mocked(apiModule.readPrompt)).toHaveBeenCalledWith(
        "/project",
        "/missing.py",
      );
    });

    // Should still mark as loaded with fallback content
    await waitFor(() => {
      expect(screen.getByTestId("isContentLoaded")).toHaveTextContent("yes");
    });

    consoleError.mockRestore();
  });

  it("should handle missing project path", () => {
    render(
      <ProjectProvider projectPath={null}>
        <TestConsumer config={{ code: "content", file_path: "/test.py" }} />
      </ProjectProvider>,
    );

    // Should not attempt to load file
    expect(vi.mocked(apiModule.readPrompt)).not.toHaveBeenCalled();
  });
});

describe("useFileOperations - schema variations", () => {
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

  it("should work with monaco_editor widget", async () => {
    const schemaWithMonaco: CustomNodeSchema = {
      ui: {
        name: "Test Node",
        fields: [
          {
            id: "code",
            label: "Code",
            widget: "monaco_editor",
            language: "python",
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
      <ProjectProvider projectPath="/project" onSaveFile={mockOnSaveFile}>
        <TestConsumer
          schema={schemaWithMonaco}
          config={{ code: "", file_path: "/test.py" }}
        />
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(vi.mocked(apiModule.readPrompt)).toHaveBeenCalledWith(
        "/project",
        "/test.py",
      );
    });
  });

  it("should work without file_picker field", async () => {
    const schemaWithoutPicker: CustomNodeSchema = {
      ui: {
        name: "Test Node",
        fields: [
          {
            id: "code",
            label: "Code",
            widget: "code_editor",
            language: "python",
          },
        ],
      },
      input: {},
      output: {},
    };

    render(
      <ProjectProvider projectPath="/project" onSaveFile={mockOnSaveFile}>
        <TestConsumer
          schema={schemaWithoutPicker}
          config={{ code: "content", file_path: "/test.py" }}
        />
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(vi.mocked(apiModule.readPrompt)).toHaveBeenCalledWith(
        "/project",
        "/test.py",
      );
    });
  });

  it("should handle node without code_editor", async () => {
    const schemaWithoutEditor: CustomNodeSchema = {
      ui: {
        name: "Test Node",
        fields: [
          {
            id: "text",
            label: "Text",
            widget: "text_input",
          },
        ],
      },
      input: {},
      output: {},
    };

    render(
      <ProjectProvider projectPath="/project" onSaveFile={mockOnSaveFile}>
        <TestConsumer
          schema={schemaWithoutEditor}
          config={{ text: "some text" }}
        />
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("isContentLoaded")).toHaveTextContent("yes");
    });

    expect(vi.mocked(apiModule.readPrompt)).not.toHaveBeenCalled();
    expect(screen.getByTestId("isDirty")).toHaveTextContent("no");
  });
});
