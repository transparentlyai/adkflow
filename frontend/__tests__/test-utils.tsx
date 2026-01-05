import { render, RenderOptions, RenderResult } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactElement, ReactNode } from "react";

// Re-export everything from testing-library
export * from "@testing-library/react";
export { userEvent };

/**
 * All providers wrapper for testing components that need context.
 * Add your providers here as the application grows.
 */
function AllProviders({ children }: { children: ReactNode }) {
  // Add providers as needed (ThemeProvider, ProjectProvider, etc.)
  return <>{children}</>;
}

/**
 * Custom render function that wraps components with all necessary providers.
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
): RenderResult {
  return render(ui, { wrapper: AllProviders, ...options });
}

/**
 * Render with user event setup for interaction testing.
 */
function renderWithUser(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return {
    user: userEvent.setup(),
    ...customRender(ui, options),
  };
}

// Override render with custom render
export { customRender as render, renderWithUser };

/**
 * Wait for a condition to be true.
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout = 5000,
  interval = 100,
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error("Condition not met within timeout");
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Create a mock React Flow node for testing.
 */
export function createMockNode(
  overrides: Partial<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }> = {},
) {
  return {
    id: overrides.id ?? "node-1",
    type: overrides.type ?? "agent",
    position: overrides.position ?? { x: 100, y: 100 },
    data: overrides.data ?? {},
  };
}

/**
 * Create a mock React Flow edge for testing.
 */
export function createMockEdge(
  overrides: Partial<{
    id: string;
    source: string;
    target: string;
    sourceHandle: string;
    targetHandle: string;
  }> = {},
) {
  return {
    id: overrides.id ?? "edge-1",
    source: overrides.source ?? "node-1",
    target: overrides.target ?? "node-2",
    sourceHandle: overrides.sourceHandle ?? "output",
    targetHandle: overrides.targetHandle ?? "input",
  };
}

/**
 * Create a mock project manifest for testing.
 */
export function createMockManifest(
  overrides: Partial<{
    name: string;
    version: string;
    tabs: Array<{ id: string; name: string; isDefault: boolean }>;
    nodes: unknown[];
    edges: unknown[];
    settings: Record<string, unknown>;
  }> = {},
) {
  return {
    name: overrides.name ?? "test-project",
    version: overrides.version ?? "3.0",
    tabs: overrides.tabs ?? [{ id: "tab1", name: "Main", isDefault: true }],
    nodes: overrides.nodes ?? [],
    edges: overrides.edges ?? [],
    settings: overrides.settings ?? {},
  };
}
