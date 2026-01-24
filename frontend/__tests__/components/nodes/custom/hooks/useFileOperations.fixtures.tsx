import React from "react";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode/types";
import { useFileOperations } from "@/components/nodes/custom/hooks/useFileOperations";

export const defaultSchema: CustomNodeSchema = {
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

export interface TestConsumerProps {
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

export function TestConsumer({
  nodeId = "test-node",
  schema = defaultSchema,
  config = {},
  isExpanded = true,
  externalFileSaveState,
}: TestConsumerProps) {
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
