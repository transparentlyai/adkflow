/**
 * Settings API functions
 */

import axios from "axios";
import type {
  ProjectSettings,
  ProjectEnvSettingsUpdate,
  ProjectSettingsResponse,
  ProjectSettingsUpdateResponse,
} from "@/lib/types";
import { apiClient } from "./client";

/**
 * Load project settings from manifest.json and .env
 */
export async function loadProjectSettings(
  projectPath: string,
): Promise<ProjectSettingsResponse> {
  try {
    const response = await apiClient.get<ProjectSettingsResponse>(
      "/api/project/settings",
      { params: { path: projectPath } },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.detail || "Failed to load project settings",
      );
    }
    throw error;
  }
}

/**
 * Save project settings to manifest.json and .env
 */
export async function saveProjectSettings(
  projectPath: string,
  settings: ProjectSettings,
  env: ProjectEnvSettingsUpdate,
): Promise<ProjectSettingsUpdateResponse> {
  try {
    const response = await apiClient.put<ProjectSettingsUpdateResponse>(
      "/api/project/settings",
      { project_path: projectPath, settings, env },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.detail || "Failed to save project settings",
      );
    }
    throw error;
  }
}
