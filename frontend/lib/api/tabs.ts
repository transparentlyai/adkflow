/**
 * Tab API functions
 */

import axios from "axios";
import type {
  ReactFlowJSON,
  TabListResponse,
  TabCreateResponse,
  TabLoadResponse,
  TabSaveResponse,
} from "@/lib/types";
import { apiClient } from "./client";

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
  name: string = "Untitled",
): Promise<TabCreateResponse> {
  try {
    const response = await apiClient.post<TabCreateResponse>(
      "/api/project/tabs",
      { project_path: projectPath, name },
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
  tabId: string,
): Promise<TabLoadResponse> {
  try {
    const response = await apiClient.get<TabLoadResponse>(
      `/api/project/tabs/${tabId}`,
      { params: { path: projectPath } },
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
  projectName?: string,
): Promise<TabSaveResponse> {
  try {
    const response = await apiClient.put<TabSaveResponse>(
      `/api/project/tabs/${tabId}`,
      { project_path: projectPath, flow, project_name: projectName },
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
  tabId: string,
): Promise<{ success: boolean }> {
  try {
    const response = await apiClient.delete<{ success: boolean }>(
      `/api/project/tabs/${tabId}`,
      { params: { path: projectPath } },
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
  name: string,
): Promise<{ success: boolean }> {
  try {
    const response = await apiClient.patch<{ success: boolean }>(
      `/api/project/tabs/${tabId}/rename`,
      { project_path: projectPath, name },
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
  tabId: string,
): Promise<TabCreateResponse> {
  try {
    const response = await apiClient.post<TabCreateResponse>(
      `/api/project/tabs/${tabId}/duplicate`,
      null,
      { params: { path: projectPath } },
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
  tabIds: string[],
): Promise<{ success: boolean }> {
  try {
    const response = await apiClient.put<{ success: boolean }>(
      "/api/project/tabs/reorder",
      { project_path: projectPath, tab_ids: tabIds },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to reorder tabs");
    }
    throw error;
  }
}
