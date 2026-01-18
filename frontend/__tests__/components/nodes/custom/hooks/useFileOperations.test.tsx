import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React, { useState } from "react";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode/types";

// Create mock functions
const mockSetNodes = vi.fn();
const mockOnSaveFile = vi.fn();
const mockOnRequestFilePicker = vi.fn();

// Mock modules BEFORE imports
vi.mock("@/lib/api", () => ({
  readPrompt: vi.fn(),
}));

// Override the global mock for useReactFlow to use our mockSetNodes
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
import { useFileOperations } from "@/components/nodes/custom/hooks/useFileOperations";
import { ProjectProvider } from "@/contexts/ProjectContext";
import * as apiModule from "@/lib/api";
import * as xyflowModule from "@xyflow/react";

const defaultSchema: CustomNodeSchema = {
  ui: {
    name: "Test Node",
    fields: [
      {
        id: "code",
        label: "Code",
        widget: "code_editor",
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

interface TestConsumerProps {
  nodeId?: string;
  schema?: CustomNodeSchema;
  config?: Record<string, unknown>;
  isExpanded?: boolean;
  externalFileSaveState?: {
    filePath: string;
    content: string;
    isDirty: boolean;
  };
}

function TestConsumer({
  nodeId = "test-node",
  schema = defaultSchema,
  config = {},
  isExpanded = true,
  externalFileSaveState,
}: TestConsumerProps) {
  // Use props directly, not state, so rerenders work properly
  const result = useFileOperations(
    nodeId,
    schema,
    config,
    isExpanded,
    externalFileSaveState,
  );

  return (
    <div>
      <span data-testid="isSaving">{result.isSaving ? "yes" : "no"}</span>
      <span data-testid="savedContent">{result.savedContent ?? "null"}</span>
      <span data-testid="isContentLoaded">
        {result.isContentLoaded ? "yes" : "no"}
      </span>
      <span data-testid="isDirty">{result.isDirty ? "yes" : "no"}</span>
      <span data-testid="filePath">{result.filePath}</span>
      <button data-testid="saveBtn" onClick={result.handleFileSave}>
        Save
      </button>
      <button data-testid="changeFileBtn" onClick={result.handleChangeFile}>
        Change File
      </button>
      <span data-testid="hasConfirm">
        {result.fileLoadConfirm ? "yes" : "no"}
      </span>
      {result.fileLoadConfirm && (
        <>
          <button
            data-testid="confirmLoadBtn"
            onClick={result.handleConfirmLoad}
          >
            Confirm Load
          </button>
          <button data-testid="cancelLoadBtn" onClick={result.handleCancelLoad}>
            Cancel Load
          </button>
        </>
      )}
    </div>
  );
}

describe("useFileOperations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up the mocked functions with the module imports
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

  describe("initialization", () => {
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

      expect(screen.getByTestId("savedContent")).toHaveTextContent(
        "inline code",
      );
    });
  });

  describe("dirty state tracking", () => {
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

  describe("external save detection", () => {
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

  describe("file save handler", () => {
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

  describe("file picker handler", () => {
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

  describe("file load confirmation", () => {
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

  describe("error handling", () => {
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

  describe("schema variations", () => {
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
});
