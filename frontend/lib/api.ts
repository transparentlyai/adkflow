/**
 * API client for ADKFlow backend
 * Handles all HTTP requests to the FastAPI backend
 */

import axios, { AxiosInstance } from "axios";
import type {
  ReactFlowJSON,
  ToolsResponse,
  ProjectLoadResponse,
  ProjectSaveRequest,
  ProjectSaveResponse,
  PromptCreateResponse,
  PromptReadResponse,
  PromptSaveResponse,
  FileChunkResponse,
  DirectoryListResponse,
  DirectoryCreateResponse,
  TabMetadata,
  TabListResponse,
  TabCreateResponse,
  TabLoadResponse,
  TabSaveResponse,
  RunRequest,
  RunResponse,
  RunStatusResponse,
  ValidateResponse,
  TopologyResponse,
  UserInputSubmission,
  UserInputResponse,
} from "@/lib/types";

// Base URL for the API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Axios instance with default configuration
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds
});

/**
 * API functions
 */

/**
 * Get list of available tools
 */
export async function getAvailableTools(): Promise<ToolsResponse> {
  try {
    const response = await apiClient.get<ToolsResponse>("/api/tools");
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to fetch tools");
    }
    throw error;
  }
}

/**
 * Load project from filesystem
 */
export async function loadProject(path: string): Promise<ProjectLoadResponse> {
  try {
    const response = await apiClient.get<ProjectLoadResponse>(
      "/api/project/load",
      { params: { path } }
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
  flow: ReactFlowJSON
): Promise<ProjectSaveResponse> {
  try {
    const response = await apiClient.post<ProjectSaveResponse>(
      "/api/project/save",
      { path, flow }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const detail = error.response.data.detail;
      let errorMessage = "Failed to save project";
      if (typeof detail === "string") {
        errorMessage = detail;
      } else if (Array.isArray(detail)) {
        // Handle Pydantic validation errors
        errorMessage = detail
          .map((err: any) => {
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
  promptName: string
): Promise<PromptCreateResponse> {
  try {
    const response = await apiClient.post<PromptCreateResponse>(
      "/api/project/prompt/create",
      { project_path: projectPath, prompt_name: promptName }
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
  contextName: string
): Promise<PromptCreateResponse> {
  try {
    const response = await apiClient.post<PromptCreateResponse>(
      "/api/project/context/create",
      { project_path: projectPath, context_name: contextName }
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
  toolName: string
): Promise<PromptCreateResponse> {
  try {
    const response = await apiClient.post<PromptCreateResponse>(
      "/api/project/tool/create",
      { project_path: projectPath, tool_name: toolName }
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
  filePath: string
): Promise<PromptReadResponse> {
  try {
    const response = await apiClient.post<PromptReadResponse>(
      "/api/project/prompt/read",
      { project_path: projectPath, file_path: filePath }
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
  content: string
): Promise<PromptSaveResponse> {
  try {
    const response = await apiClient.post<PromptSaveResponse>(
      "/api/project/prompt/save",
      { project_path: projectPath, file_path: filePath, content }
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
  reverse: boolean = true
): Promise<FileChunkResponse> {
  try {
    const response = await apiClient.post<FileChunkResponse>(
      "/api/project/file/chunk",
      { project_path: projectPath, file_path: filePath, offset, limit, reverse }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to read file chunk");
    }
    throw error;
  }
}

/**
 * List directory contents on the server
 */
export async function listDirectory(path: string): Promise<DirectoryListResponse> {
  try {
    const response = await apiClient.get<DirectoryListResponse>(
      "/api/filesystem/list",
      { params: { path } }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to list directory");
    }
    throw error;
  }
}

/**
 * Create a new directory on the server
 */
export async function createDirectory(
  path: string,
  name: string
): Promise<DirectoryCreateResponse> {
  try {
    const response = await apiClient.post<DirectoryCreateResponse>(
      "/api/filesystem/mkdir",
      { path, name }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to create directory");
    }
    throw error;
  }
}

/**
 * Ensure a directory exists, creating it and any parent directories if needed
 */
export async function ensureDirectory(
  path: string
): Promise<DirectoryCreateResponse> {
  try {
    const response = await apiClient.post<DirectoryCreateResponse>(
      "/api/filesystem/ensure-dir",
      { path }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to ensure directory");
    }
    throw error;
  }
}

/**
 * List all tabs for a project
 */
export async function listTabs(projectPath: string): Promise<TabListResponse> {
  try {
    const response = await apiClient.get<TabListResponse>("/api/project/tabs", {
      params: { path: projectPath },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to list tabs");
    }
    throw error;
  }
}

/**
 * Create a new tab
 */
export async function createTab(
  projectPath: string,
  name: string = "Untitled"
): Promise<TabCreateResponse> {
  try {
    const response = await apiClient.post<TabCreateResponse>(
      "/api/project/tabs",
      { project_path: projectPath, name }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to create tab");
    }
    throw error;
  }
}

/**
 * Load a tab's flow data
 */
export async function loadTab(
  projectPath: string,
  tabId: string
): Promise<TabLoadResponse> {
  try {
    const response = await apiClient.get<TabLoadResponse>(
      `/api/project/tabs/${tabId}`,
      { params: { path: projectPath } }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to load tab");
    }
    throw error;
  }
}

/**
 * Save a tab's flow data
 */
export async function saveTab(
  projectPath: string,
  tabId: string,
  flow: ReactFlowJSON,
  projectName?: string
): Promise<TabSaveResponse> {
  try {
    const response = await apiClient.put<TabSaveResponse>(
      `/api/project/tabs/${tabId}`,
      { project_path: projectPath, flow, project_name: projectName }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to save tab");
    }
    throw error;
  }
}

/**
 * Delete a tab
 */
export async function deleteTab(
  projectPath: string,
  tabId: string
): Promise<{ success: boolean }> {
  try {
    const response = await apiClient.delete<{ success: boolean }>(
      `/api/project/tabs/${tabId}`,
      { params: { path: projectPath } }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to delete tab");
    }
    throw error;
  }
}

/**
 * Rename a tab
 */
export async function renameTab(
  projectPath: string,
  tabId: string,
  name: string
): Promise<{ success: boolean }> {
  try {
    const response = await apiClient.patch<{ success: boolean }>(
      `/api/project/tabs/${tabId}/rename`,
      { project_path: projectPath, name }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to rename tab");
    }
    throw error;
  }
}

/**
 * Duplicate a tab
 */
export async function duplicateTab(
  projectPath: string,
  tabId: string
): Promise<TabCreateResponse> {
  try {
    const response = await apiClient.post<TabCreateResponse>(
      `/api/project/tabs/${tabId}/duplicate`,
      null,
      { params: { path: projectPath } }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to duplicate tab");
    }
    throw error;
  }
}

/**
 * Reorder tabs
 */
export async function reorderTabs(
  projectPath: string,
  tabIds: string[]
): Promise<{ success: boolean }> {
  try {
    const response = await apiClient.put<{ success: boolean }>(
      "/api/project/tabs/reorder",
      { project_path: projectPath, tab_ids: tabIds }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to reorder tabs");
    }
    throw error;
  }
}

// Execution API functions

/**
 * Start a workflow run
 */
export async function startRun(request: RunRequest): Promise<RunResponse> {
  try {
    const response = await apiClient.post<RunResponse>(
      "/api/execution/run",
      request
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to start run");
    }
    throw error;
  }
}

/**
 * Get run status
 */
export async function getRunStatus(runId: string): Promise<RunStatusResponse> {
  try {
    const response = await apiClient.get<RunStatusResponse>(
      `/api/execution/run/${runId}/status`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to get run status");
    }
    throw error;
  }
}

/**
 * Cancel a running workflow
 */
export async function cancelRun(runId: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `/api/execution/run/${runId}/cancel`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to cancel run");
    }
    throw error;
  }
}

/**
 * Validate a workflow without executing
 */
export async function validateWorkflow(projectPath: string): Promise<ValidateResponse> {
  try {
    const response = await apiClient.post<ValidateResponse>(
      "/api/execution/validate",
      { project_path: projectPath }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to validate workflow");
    }
    throw error;
  }
}

/**
 * Get the compiled agent topology of a workflow
 */
export async function getTopology(projectPath: string): Promise<TopologyResponse> {
  try {
    const response = await apiClient.post<TopologyResponse>(
      "/api/execution/topology",
      { project_path: projectPath }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to get topology");
    }
    throw error;
  }
}

/**
 * Create an EventSource for streaming run events
 * Returns the EventSource for the caller to manage
 */
export function createRunEventSource(runId: string): EventSource {
  const url = `${API_BASE_URL}/api/execution/run/${runId}/events`;
  return new EventSource(url);
}

/**
 * Submit user input for a waiting UserInput node
 */
export async function submitUserInput(
  runId: string,
  submission: UserInputSubmission
): Promise<UserInputResponse> {
  try {
    const response = await apiClient.post<UserInputResponse>(
      `/api/execution/run/${runId}/input`,
      submission
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to submit user input");
    }
    throw error;
  }
}

/**
 * Extension nodes response
 */
export interface ExtensionNodesResponse {
  nodes: unknown[];
  menu_tree: Record<string, unknown>;
  count: number;
}

/**
 * Get available extension nodes
 */
export async function getExtensionNodes(): Promise<ExtensionNodesResponse> {
  try {
    const response = await apiClient.get<ExtensionNodesResponse>("/api/extensions/nodes");
    return response.data;
  } catch (error) {
    // Return empty response if extensions not available
    return { nodes: [], menu_tree: {}, count: 0 };
  }
}

export default apiClient;
