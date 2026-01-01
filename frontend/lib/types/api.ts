/**
 * API response type definitions
 * These interfaces match the backend Pydantic response models
 */

import type { Node, Edge } from "@xyflow/react";
import type { Workflow } from "./agent";

/**
 * API response types
 */
export interface ValidationResponse {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface ImportResponse {
  workflow: Workflow;
  success: boolean;
  message?: string;
}

export interface ToolsResponse {
  tools: string[];
  categories?: Record<string, string[]>;
}

export interface ReactFlowJSON {
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
}

export interface ProjectLoadResponse {
  exists: boolean;
  flow: ReactFlowJSON | null;
  path: string;
}

export interface ProjectSaveRequest {
  path: string;
  flow: ReactFlowJSON;
}

export interface ProjectSaveResponse {
  success: boolean;
  path: string;
  message: string;
}

export interface PromptCreateResponse {
  success: boolean;
  file_path: string;
  absolute_path: string;
  message: string;
}

export interface PromptReadResponse {
  success: boolean;
  content: string;
  file_path: string;
}

export interface PromptSaveRequest {
  project_path: string;
  file_path: string;
  content: string;
}

export interface PromptSaveResponse {
  success: boolean;
  file_path: string;
  message: string;
}

export interface FileChunkResponse {
  success: boolean;
  content: string;
  file_path: string;
  total_lines: number;
  offset: number;
  has_more: boolean;
}

export interface DirectoryEntry {
  name: string;
  path: string;
  is_directory: boolean;
}

export interface DirectoryListResponse {
  current_path: string;
  parent_path: string | null;
  entries: DirectoryEntry[];
}

export interface DirectoryCreateResponse {
  success: boolean;
  created_path: string;
  message: string;
}

// Tab/Page types for multi-tab support
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface TabMetadata {
  id: string;
  name: string;
  order: number;
  viewport: Viewport;
}

export interface TabState extends TabMetadata {
  hasUnsavedChanges: boolean;
  isLoading: boolean;
}

export interface TabListResponse {
  tabs: TabMetadata[];
  name: string;
}

export interface TabCreateResponse {
  tab: TabMetadata;
}

export interface TabLoadResponse {
  flow: ReactFlowJSON;
}

export interface TabSaveResponse {
  success: boolean;
  message: string;
}

// Project Settings types
export interface ProjectSettings {
  defaultModel: string;
}

export interface ProjectEnvSettings {
  authMode: "api_key" | "vertex_ai";
  hasApiKey: boolean;
  apiKeyMasked?: string;
  googleCloudProject?: string;
  googleCloudLocation?: string;
}

export interface ProjectSettingsResponse {
  settings: ProjectSettings;
  env: ProjectEnvSettings;
}

export interface ProjectEnvSettingsUpdate {
  authMode: "api_key" | "vertex_ai";
  apiKey?: string;
  googleCloudProject?: string;
  googleCloudLocation?: string;
}

export interface ProjectSettingsUpdateRequest {
  project_path: string;
  settings: ProjectSettings;
  env: ProjectEnvSettingsUpdate;
}

export interface ProjectSettingsUpdateResponse {
  success: boolean;
}
