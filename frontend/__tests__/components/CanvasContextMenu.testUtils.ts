import { vi } from "vitest";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

/**
 * Default props for CanvasContextMenu tests
 */
export const createDefaultProps = () => ({
  x: 100,
  y: 200,
  onSelect: vi.fn(),
  onClose: vi.fn(),
});

/**
 * Mock custom node schemas for testing
 */
export const mockCustomSchemas: CustomNodeSchema[] = [
  {
    unit_id: "custom1",
    label: "Custom Tool 1",
    menu_location: "My Extensions/Tools",
    description: "A custom tool",
    version: "1.0.0",
    ui: {
      inputs: [],
      outputs: [],
      fields: [],
      color: "#3b82f6",
      expandable: true,
      default_width: 300,
      default_height: 200,
      layout: "pill",
    },
  },
  {
    unit_id: "custom2",
    label: "Custom Tool 2",
    menu_location: "My Extensions/Utilities",
    description: "Another custom tool",
    version: "1.0.0",
    ui: {
      inputs: [],
      outputs: [],
      fields: [],
      color: "#3b82f6",
      expandable: true,
      default_width: 300,
      default_height: 200,
      layout: "pill",
    },
  },
];

/**
 * Creates a minimal custom node schema for testing
 */
export const createCustomSchema = (
  overrides: Partial<CustomNodeSchema> = {},
): CustomNodeSchema => ({
  unit_id: "test-id",
  label: "Test Schema",
  menu_location: "Test",
  description: "Test schema",
  version: "1.0.0",
  ui: {
    inputs: [],
    outputs: [],
    fields: [],
    color: "#3b82f6",
    expandable: true,
    default_width: 300,
    default_height: 200,
    layout: "pill",
  },
  ...overrides,
});
