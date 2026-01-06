import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, afterAll, vi } from "vitest";
import React from "react";

// Mock @xyflow/react
vi.mock("@xyflow/react", () => ({
  useReactFlow: vi.fn(() => ({
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    getNodes: vi.fn(() => []),
    getEdges: vi.fn(() => []),
    getNode: vi.fn(),
    getEdge: vi.fn(),
    fitView: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    getZoom: vi.fn(() => 1),
    setCenter: vi.fn(),
    project: vi.fn((pos) => pos),
    screenToFlowPosition: vi.fn((pos) => pos),
    flowToScreenPosition: vi.fn((pos) => pos),
    getViewport: vi.fn(() => ({ x: 0, y: 0, zoom: 1 })),
    setViewport: vi.fn(),
    viewportInitialized: true,
  })),
  useNodes: vi.fn(() => []),
  useEdges: vi.fn(() => []),
  useNodesState: vi.fn(() => [[], vi.fn(), vi.fn()]),
  useEdgesState: vi.fn(() => [[], vi.fn(), vi.fn()]),
  useOnSelectionChange: vi.fn(),
  useNodeId: vi.fn(() => "test-node-id"),
  useStore: vi.fn(() => ({})),
  useStoreApi: vi.fn(() => ({
    getState: vi.fn(() => ({
      nodeInternals: new Map(),
      nodes: [],
      edges: [],
    })),
    setState: vi.fn(),
    subscribe: vi.fn(),
  })),
  useUpdateNodeInternals: vi.fn(() => vi.fn()),
  ReactFlow: ({ children }: { children?: React.ReactNode }) => children,
  ReactFlowProvider: ({ children }: { children?: React.ReactNode }) => children,
  Background: () => null,
  Controls: ({ children }: { children?: React.ReactNode }) => children,
  ControlButton: ({
    onClick,
    title,
    className,
    children,
  }: {
    onClick?: () => void;
    title?: string;
    className?: string;
    children?: React.ReactNode;
  }) => React.createElement("button", { onClick, title, className }, children),
  MiniMap: () => null,
  Panel: ({ children }: { children?: React.ReactNode }) => children,
  Handle: ({
    id,
    type,
    position,
  }: {
    id?: string;
    type?: string;
    position?: string;
  }) => null,
  NodeResizer: ({
    isVisible,
    onResizeEnd,
  }: {
    isVisible?: boolean;
    onResizeEnd?: () => void;
    minWidth?: number;
    minHeight?: number;
    lineStyle?: object;
    handleStyle?: object;
  }) =>
    isVisible
      ? React.createElement("div", { "data-testid": "node-resizer" })
      : null,
  Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
  MarkerType: { Arrow: "arrow", ArrowClosed: "arrowclosed" },
  ConnectionMode: { Strict: "strict", Loose: "loose" },
  ConnectionLineType: {
    Bezier: "bezier",
    Step: "step",
    SmoothStep: "smoothstep",
    Straight: "straight",
  },
  SelectionMode: { Partial: "partial", Full: "full" },
  getConnectedEdges: vi.fn(() => []),
  getIncomers: vi.fn(() => []),
  getOutgoers: vi.fn(() => []),
  addEdge: vi.fn((edge, edges) => [...edges, edge]),
  applyNodeChanges: vi.fn((changes, nodes) => nodes),
  applyEdgeChanges: vi.fn((changes, edges) => edges),
  getBezierPath: vi.fn(() => ["M0,0", 0, 0]),
  getSmoothStepPath: vi.fn(() => ["M0,0", 0, 0]),
  getStraightPath: vi.fn(() => ["M0,0", 0, 0]),
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock scrollTo and scrollIntoView
Element.prototype.scrollTo = vi.fn();
Element.prototype.scrollIntoView = vi.fn();
window.scrollTo = vi.fn();

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  cb(0);
  return 0;
});
global.cancelAnimationFrame = vi.fn();

// Suppress console errors for expected test failures
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Suppress React act() warnings and other expected errors in tests
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning:") ||
        args[0].includes("act(...)") ||
        args[0].includes("ReactDOMTestUtils.act"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
