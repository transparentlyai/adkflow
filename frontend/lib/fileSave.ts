/**
 * File Save Utilities
 *
 * Utilities for collecting and saving dirty files during project save.
 */

import type { Node } from "@xyflow/react";
import type { CustomNodeData } from "@/components/nodes/CustomNode/types";
import { savePrompt } from "@/lib/api";

/** Represents a dirty file that needs to be saved */
export interface DirtyFile {
  nodeId: string;
  filePath: string;
  content: string;
}

/** Result of saving a single file */
export interface FileSaveResult {
  nodeId: string;
  filePath: string;
  success: boolean;
  error?: string;
}

/** Summary of all file saves */
export interface FileSavesSummary {
  totalFiles: number;
  successCount: number;
  errorCount: number;
  results: FileSaveResult[];
}

/**
 * Collects all dirty files from the given nodes.
 *
 * @param nodes - Array of ReactFlow nodes to check for dirty files
 * @returns Array of dirty files with their content
 */
export function collectDirtyFiles(nodes: Node[]): DirtyFile[] {
  const dirtyFiles: DirtyFile[] = [];

  for (const node of nodes) {
    const data = node.data as unknown as CustomNodeData | undefined;
    const fileSaveState = data?.fileSaveState;

    if (fileSaveState?.isDirty && fileSaveState.filePath) {
      dirtyFiles.push({
        nodeId: node.id,
        filePath: fileSaveState.filePath,
        content: fileSaveState.content,
      });
    }
  }

  return dirtyFiles;
}

/**
 * Saves all dirty files to disk in parallel.
 *
 * @param projectPath - The project root path
 * @param dirtyFiles - Array of dirty files to save
 * @returns Summary of all save operations
 */
export async function saveAllDirtyFiles(
  projectPath: string,
  dirtyFiles: DirtyFile[],
): Promise<FileSavesSummary> {
  if (dirtyFiles.length === 0) {
    return {
      totalFiles: 0,
      successCount: 0,
      errorCount: 0,
      results: [],
    };
  }

  // Save all files in parallel
  const savePromises = dirtyFiles.map(async (file): Promise<FileSaveResult> => {
    try {
      await savePrompt(projectPath, file.filePath, file.content);
      return {
        nodeId: file.nodeId,
        filePath: file.filePath,
        success: true,
      };
    } catch (error) {
      return {
        nodeId: file.nodeId,
        filePath: file.filePath,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  const results = await Promise.all(savePromises);
  const successCount = results.filter((r) => r.success).length;

  return {
    totalFiles: dirtyFiles.length,
    successCount,
    errorCount: results.length - successCount,
    results,
  };
}

/**
 * Clears the dirty state for successfully saved files by updating node data.
 *
 * @param nodes - Current nodes array
 * @param successfulNodeIds - Node IDs that were successfully saved
 * @returns Updated nodes array with cleared dirty states
 */
export function clearDirtyStatesForNodes(
  nodes: Node[],
  successfulNodeIds: Set<string>,
): Node[] {
  return nodes.map((node) => {
    if (!successfulNodeIds.has(node.id)) {
      return node;
    }

    const data = node.data as unknown as CustomNodeData;
    if (!data.fileSaveState) {
      return node;
    }

    return {
      ...node,
      data: {
        ...data,
        fileSaveState: {
          ...data.fileSaveState,
          isDirty: false,
        },
      },
    };
  });
}
