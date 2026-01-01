/**
 * Log Explorer API functions for debug mode
 *
 * These endpoints are only available when running in dev mode (./adkflow dev).
 * They provide read access to JSONL log files from the project's logs/ directory.
 */

import axios from "axios";
import { apiClient } from "./client";

/**
 * Information about a log file
 */
export interface LogFileInfo {
  name: string;
  path: string;
  sizeBytes: number;
  modifiedAt: string;
  lineCount: number | null;
}

/**
 * Exception info from a log entry
 */
export interface LogEntryException {
  type: string;
  message: string;
  traceback: string[];
}

/**
 * A single log entry from a JSONL file
 */
export interface LogEntry {
  lineNumber: number;
  timestamp: string;
  level: string;
  category: string;
  message: string;
  context: Record<string, unknown> | null;
  durationMs: number | null;
  exception: LogEntryException | null;
}

/**
 * Response for listing log files
 */
export interface LogFilesResponse {
  files: LogFileInfo[];
  logDir: string;
}

/**
 * Options for reading log entries
 */
export interface LogEntriesOptions {
  fileName?: string;
  offset?: number;
  limit?: number;
  level?: string;
  category?: string;
  search?: string;
  startTime?: string;
  endTime?: string;
}

/**
 * Response for reading log entries
 */
export interface LogEntriesResponse {
  entries: LogEntry[];
  totalCount: number;
  hasMore: boolean;
  fileName: string;
  appliedFilters: Record<string, string>;
}

/**
 * Statistics about a log file
 */
export interface LogStats {
  totalLines: number;
  levelCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  timeRange: { start: string | null; end: string | null };
  fileSizeBytes: number;
}

/**
 * Get list of log files in the project's logs/ directory
 */
export async function getLogFiles(
  projectPath: string,
): Promise<LogFilesResponse> {
  try {
    const response = await apiClient.get<{
      files: Array<{
        name: string;
        path: string;
        size_bytes: number;
        modified_at: string;
        line_count: number | null;
      }>;
      log_dir: string;
    }>("/api/debug/logs", {
      params: { project_path: projectPath },
    });

    return {
      files: response.data.files.map((f) => ({
        name: f.name,
        path: f.path,
        sizeBytes: f.size_bytes,
        modifiedAt: f.modified_at,
        lineCount: f.line_count,
      })),
      logDir: response.data.log_dir,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to get log files");
    }
    throw error;
  }
}

/**
 * Read log entries from a JSONL file with filtering and pagination
 */
export async function getLogEntries(
  projectPath: string,
  options: LogEntriesOptions = {},
): Promise<LogEntriesResponse> {
  try {
    const params: Record<string, string | number> = {
      project_path: projectPath,
    };

    if (options.fileName) params.file_name = options.fileName;
    if (options.offset !== undefined) params.offset = options.offset;
    if (options.limit !== undefined) params.limit = options.limit;
    if (options.level) params.level = options.level;
    if (options.category) params.category = options.category;
    if (options.search) params.search = options.search;
    if (options.startTime) params.start_time = options.startTime;
    if (options.endTime) params.end_time = options.endTime;

    const response = await apiClient.get<{
      entries: Array<{
        line_number: number;
        timestamp: string;
        level: string;
        category: string;
        message: string;
        context: Record<string, unknown> | null;
        duration_ms: number | null;
        exception: {
          type: string;
          message: string;
          traceback: string[];
        } | null;
      }>;
      total_count: number;
      has_more: boolean;
      file_name: string;
      applied_filters: Record<string, string>;
    }>("/api/debug/logs/entries", { params });

    return {
      entries: response.data.entries.map((e) => ({
        lineNumber: e.line_number,
        timestamp: e.timestamp,
        level: e.level,
        category: e.category,
        message: e.message,
        context: e.context,
        durationMs: e.duration_ms,
        exception: e.exception,
      })),
      totalCount: response.data.total_count,
      hasMore: response.data.has_more,
      fileName: response.data.file_name,
      appliedFilters: response.data.applied_filters,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.detail || "Failed to get log entries",
      );
    }
    throw error;
  }
}

/**
 * Get statistics about a log file
 */
export async function getLogStats(
  projectPath: string,
  fileName: string = "adkflow.jsonl",
): Promise<LogStats> {
  try {
    const response = await apiClient.get<{
      total_lines: number;
      level_counts: Record<string, number>;
      category_counts: Record<string, number>;
      time_range: { start: string | null; end: string | null };
      file_size_bytes: number;
    }>("/api/debug/logs/stats", {
      params: { project_path: projectPath, file_name: fileName },
    });

    return {
      totalLines: response.data.total_lines,
      levelCounts: response.data.level_counts,
      categoryCounts: response.data.category_counts,
      timeRange: response.data.time_range,
      fileSizeBytes: response.data.file_size_bytes,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to get log stats");
    }
    throw error;
  }
}
