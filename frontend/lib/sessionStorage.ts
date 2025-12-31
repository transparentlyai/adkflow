/**
 * Session storage utilities for persisting application state
 */

import type { Node, Edge } from "@xyflow/react";

interface SessionState {
  currentProjectPath: string | null;
  workflowName: string;
  workflow: {
    nodes: Node[];
    edges: Edge[];
    viewport: { x: number; y: number; zoom: number };
  } | null;
  hasUnsavedChanges: boolean;
}

const SESSION_KEY = "adkflow_session";

/**
 * Save current session state to localStorage
 */
export function saveSession(state: SessionState): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save session:", error);
  }
}

/**
 * Load session state from localStorage
 */
export function loadSession(): SessionState | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const session = JSON.parse(stored) as any;

    // Add default viewport if missing (backward compatibility)
    if (session.workflow && !session.workflow.viewport) {
      session.workflow.viewport = { x: 0, y: 0, zoom: 1 };
    }

    return session as SessionState;
  } catch (error) {
    console.error("Failed to load session:", error);
    return null;
  }
}

/**
 * Clear session from localStorage
 */
export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error("Failed to clear session:", error);
  }
}
