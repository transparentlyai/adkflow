/**
 * Dev mode API functions
 */

import { apiClient } from "./client";

export interface DevInfo {
  devMode: boolean;
  branch: string | null;
}

/**
 * Fetch dev mode info from the backend.
 * Returns devMode status and current git branch.
 */
export async function getDevInfo(): Promise<DevInfo> {
  const response = await apiClient.get<DevInfo>("/api/dev/info");
  return response.data;
}
