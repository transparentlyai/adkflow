/**
 * Project API functions
 */

import axios from "axios";
import type {
  ReactFlowJSON,
  ProjectLoadResponse,
  ProjectSaveResponse,
  PromptCreateResponse,
  PromptReadResponse,
  PromptSaveResponse,
  FileChunkResponse,
} from "@/lib/types";
import { apiClient } from "./client";

/**
 * Load project from filesystem
 */
export async function loadProject(path: string): Promise<ProjectLoadResponse> {
  try {
    const response = await apiClient.get<ProjectLoadResponse>(
      "/api/project/load",
      { params: { path } },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to load project");
    }
    throw error;
  }
}

/**
 * Save project to filesystem
 */
export async function saveProject(
  path: string,
  flow: ReactFlowJSON,
): Promise<ProjectSaveResponse> {
  try {
    const response = await apiClient.post<ProjectSaveResponse>(
      "/api/project/save",
      { path, flow },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const detail = error.response.data.detail;
      let errorMessage = "Failed to save project";
      if (typeof detail === "string") {
        errorMessage = detail;
      } else if (Array.isArray(detail)) {
        errorMessage = detail
          .map((err: { loc?: string[]; msg: string }) => {
            const loc = err.loc ? err.loc.join(" -> ") : "";
            return `${loc}: ${err.msg}`;
          })
          .join("\n");
      } else if (typeof detail === "object") {
        errorMessage = JSON.stringify(detail);
      }
      throw new Error(errorMessage);
    }
    throw error;
  }
}

/**
 * Create a new prompt file in the project
 */
export async function createPrompt(
  projectPath: string,
  promptName: string,
): Promise<PromptCreateResponse> {
  try {
    const response = await apiClient.post<PromptCreateResponse>(
      "/api/project/prompt/create",
      { project_path: projectPath, prompt_name: promptName },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to create prompt");
    }
    throw error;
  }
}

/**
 * Create a new context file in the project
 */
export async function createContext(
  projectPath: string,
  contextName: string,
): Promise<PromptCreateResponse> {
  try {
    const response = await apiClient.post<PromptCreateResponse>(
      "/api/project/context/create",
      { project_path: projectPath, context_name: contextName },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to create context");
    }
    throw error;
  }
}

/**
 * Create a new tool file in the project
 */
export async function createTool(
  projectPath: string,
  toolName: string,
): Promise<PromptCreateResponse> {
  try {
    const response = await apiClient.post<PromptCreateResponse>(
      "/api/project/tool/create",
      { project_path: projectPath, tool_name: toolName },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to create tool");
    }
    throw error;
  }
}

/**
 * Read a prompt file content
 */
export async function readPrompt(
  projectPath: string,
  filePath: string,
): Promise<PromptReadResponse> {
  try {
    const response = await apiClient.post<PromptReadResponse>(
      "/api/project/prompt/read",
      { project_path: projectPath, file_path: filePath },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to read prompt");
    }
    throw error;
  }
}

/**
 * Save content to a prompt file
 */
export async function savePrompt(
  projectPath: string,
  filePath: string,
  content: string,
): Promise<PromptSaveResponse> {
  try {
    const response = await apiClient.post<PromptSaveResponse>(
      "/api/project/prompt/save",
      { project_path: projectPath, file_path: filePath, content },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to save prompt");
    }
    throw error;
  }
}

/**
 * Read a chunk of a file (for paginated loading of large files)
 */
export async function readFileChunk(
  projectPath: string,
  filePath: string,
  offset: number = 0,
  limit: number = 500,
  reverse: boolean = true,
): Promise<FileChunkResponse> {
  try {
    const response = await apiClient.post<FileChunkResponse>(
      "/api/project/file/chunk",
      {
        project_path: projectPath,
        file_path: filePath,
        offset,
        limit,
        reverse,
      },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.detail || "Failed to read file chunk",
      );
    }
    throw error;
  }
}
