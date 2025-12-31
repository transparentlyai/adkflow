/**
 * Filesystem API functions
 */

import axios from "axios";
import type {
  DirectoryListResponse,
  DirectoryCreateResponse,
  ToolsResponse,
} from "@/lib/types";
import { apiClient } from "./client";

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
 * List directory contents on the server
 */
export async function listDirectory(
  path: string,
): Promise<DirectoryListResponse> {
  try {
    const response = await apiClient.get<DirectoryListResponse>(
      "/api/filesystem/list",
      { params: { path } },
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
  name: string,
): Promise<DirectoryCreateResponse> {
  try {
    const response = await apiClient.post<DirectoryCreateResponse>(
      "/api/filesystem/mkdir",
      { path, name },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.detail || "Failed to create directory",
      );
    }
    throw error;
  }
}

/**
 * Ensure a directory exists, creating it and any parent directories if needed
 */
export async function ensureDirectory(
  path: string,
): Promise<DirectoryCreateResponse> {
  try {
    const response = await apiClient.post<DirectoryCreateResponse>(
      "/api/filesystem/ensure-dir",
      { path },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.detail || "Failed to ensure directory",
      );
    }
    throw error;
  }
}
