/**
 * API client re-exports
 *
 * All API functions are organized by domain and re-exported here
 * for backwards compatibility with existing imports from "@/lib/api"
 */

// Client
export { apiClient, API_BASE_URL } from "./client";
export { default } from "./client";

// Project APIs
export {
  loadProject,
  saveProject,
  createPrompt,
  createContext,
  createTool,
  readPrompt,
  savePrompt,
  readFileChunk,
} from "./project";

// Tab APIs
export {
  listTabs,
  createTab,
  loadTab,
  saveTab,
  deleteTab,
  renameTab,
  duplicateTab,
  reorderTabs,
} from "./tabs";

// Execution APIs
export {
  startRun,
  getRunStatus,
  cancelRun,
  validateWorkflow,
  getTopology,
  createRunEventSource,
  submitUserInput,
} from "./execution";

// Filesystem APIs
export {
  getAvailableTools,
  listDirectory,
  createDirectory,
  ensureDirectory,
} from "./filesystem";

// Settings APIs
export { loadProjectSettings, saveProjectSettings } from "./settings";

// Extensions APIs
export { getExtensionNodes } from "./extensions";
export type { ExtensionNodesResponse } from "./extensions";

// Logging APIs (dev mode only)
export {
  isDebugModeAvailable,
  getLoggingConfig,
  updateLoggingConfig,
  getLoggingCategories,
  resetLoggingConfig,
} from "./logging";
export type {
  CategoryInfo,
  LoggingConfig,
  LoggingConfigUpdate,
} from "./logging";

// Log Explorer APIs (dev mode only)
export { getLogFiles, getLogEntries, getLogStats, getLogRuns } from "./logs";
export type {
  LogFileInfo,
  LogEntry,
  LogEntryException,
  LogFilesResponse,
  LogEntriesOptions,
  LogEntriesResponse,
  LogStats,
  RunInfo,
  RunListResponse,
} from "./logs";

// Context Preview APIs
export { previewContextAggregation } from "./contextPreview";
export type {
  FileInfo,
  PreviewResult,
  PreviewResponse,
  PreviewRequest,
} from "./contextPreview";

// Chat APIs
export {
  createChatSession,
  getChatSession,
  deleteChatSession,
  streamChatMessage,
} from "./chat";
