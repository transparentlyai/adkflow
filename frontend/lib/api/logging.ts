/**
 * Logging API functions for debug mode
 *
 * These endpoints are only available when running in dev mode (./adkflow dev).
 */

import axios from "axios";
import { apiClient } from "./client";

/**
 * Category information from the logging system
 */
export interface CategoryInfo {
  name: string;
  level: string;
  enabled: boolean;
  children: string[];
}

/**
 * Logging configuration response
 */
export interface LoggingConfig {
  globalLevel: string;
  categories: Record<string, string>;
  fileEnabled: boolean;
  filePath: string | null;
  consoleColored: boolean;
  consoleFormat: string;
}

/**
 * Logging configuration update request
 */
export interface LoggingConfigUpdate {
  globalLevel?: string;
  categories?: Record<string, string>;
  fileEnabled?: boolean;
  consoleColored?: boolean;
}

/**
 * Check if debug mode is available (dev mode only)
 */
export async function isDebugModeAvailable(): Promise<boolean> {
  try {
    await apiClient.get("/api/debug/logging");
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current logging configuration
 */
export async function getLoggingConfig(): Promise<LoggingConfig> {
  try {
    const response = await apiClient.get<{
      global_level: string;
      categories: Record<string, string>;
      file_enabled: boolean;
      file_path: string | null;
      console_colored: boolean;
      console_format: string;
    }>("/api/debug/logging");

    // Transform snake_case to camelCase
    return {
      globalLevel: response.data.global_level,
      categories: response.data.categories,
      fileEnabled: response.data.file_enabled,
      filePath: response.data.file_path,
      consoleColored: response.data.console_colored,
      consoleFormat: response.data.console_format,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.detail || "Failed to get logging config",
      );
    }
    throw error;
  }
}

/**
 * Update logging configuration
 */
export async function updateLoggingConfig(
  update: LoggingConfigUpdate,
): Promise<LoggingConfig> {
  try {
    const response = await apiClient.put<{
      success: boolean;
      config: {
        global_level: string;
        categories: Record<string, string>;
        file_enabled: boolean;
        file_path: string | null;
        console_colored: boolean;
        console_format: string;
      };
    }>("/api/debug/logging", {
      global_level: update.globalLevel,
      categories: update.categories,
      file_enabled: update.fileEnabled,
      console_colored: update.consoleColored,
    });

    const config = response.data.config;
    return {
      globalLevel: config.global_level,
      categories: config.categories,
      fileEnabled: config.file_enabled,
      filePath: config.file_path,
      consoleColored: config.console_colored,
      consoleFormat: config.console_format,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.detail || "Failed to update logging config",
      );
    }
    throw error;
  }
}

/**
 * Get all logging categories
 */
export async function getLoggingCategories(): Promise<CategoryInfo[]> {
  try {
    const response = await apiClient.get<CategoryInfo[]>(
      "/api/debug/logging/categories",
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.detail || "Failed to get logging categories",
      );
    }
    throw error;
  }
}

/**
 * Reset logging configuration to defaults
 */
export async function resetLoggingConfig(): Promise<void> {
  try {
    await apiClient.post("/api/debug/logging/reset");
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.detail || "Failed to reset logging config",
      );
    }
    throw error;
  }
}
