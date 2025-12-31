/**
 * Execution API functions
 */

import axios from "axios";
import type {
  RunRequest,
  RunResponse,
  RunStatusResponse,
  ValidateResponse,
  TopologyResponse,
  UserInputSubmission,
  UserInputResponse,
} from "@/lib/types";
import { apiClient, API_BASE_URL } from "./client";

/**
 * Start a workflow run
 */
export async function startRun(request: RunRequest): Promise<RunResponse> {
  try {
    const response = await apiClient.post<RunResponse>(
      "/api/execution/run",
      request,
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
      `/api/execution/run/${runId}/status`,
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
export async function cancelRun(
  runId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
    }>(`/api/execution/run/${runId}/cancel`);
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
export async function validateWorkflow(
  projectPath: string,
): Promise<ValidateResponse> {
  try {
    const response = await apiClient.post<ValidateResponse>(
      "/api/execution/validate",
      { project_path: projectPath },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.detail || "Failed to validate workflow",
      );
    }
    throw error;
  }
}

/**
 * Get the compiled agent topology of a workflow
 */
export async function getTopology(
  projectPath: string,
): Promise<TopologyResponse> {
  try {
    const response = await apiClient.post<TopologyResponse>(
      "/api/execution/topology",
      { project_path: projectPath },
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
  submission: UserInputSubmission,
): Promise<UserInputResponse> {
  try {
    const response = await apiClient.post<UserInputResponse>(
      `/api/execution/run/${runId}/input`,
      submission,
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.detail || "Failed to submit user input",
      );
    }
    throw error;
  }
}
