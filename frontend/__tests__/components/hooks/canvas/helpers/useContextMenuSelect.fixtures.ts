import { vi } from "vitest";
import type { ContextMenuState } from "@/components/hooks/canvas/helpers/useDialogState";

export function createContextMenuMocks() {
  return {
    mockSetNodes: vi.fn(),
    mockSetContextMenu: vi.fn(),
    mockSetTeleportNamePrompt: vi.fn(),
    mockSetTeleportNameInput: vi.fn(),
    mockAddGroupNode: vi.fn(),
    mockAddLabelNode: vi.fn(),
    mockAddBuiltinSchemaNode: vi.fn(),
    mockAddCustomNode: vi.fn(),
    mockCloseContextMenu: vi.fn(),
    mockOnRequestPromptCreation: vi.fn(),
    mockOnRequestContextCreation: vi.fn(),
    mockOnRequestToolCreation: vi.fn(),
    mockOnRequestProcessCreation: vi.fn(),
    mockOnRequestOutputFileCreation: vi.fn(),
  };
}

export function createDefaultParams(mocks: ReturnType<typeof createContextMenuMocks>) {
  return {
    setNodes: mocks.mockSetNodes,
    contextMenu: null as ContextMenuState | null,
    setContextMenu: mocks.mockSetContextMenu,
    setTeleportNamePrompt: mocks.mockSetTeleportNamePrompt,
    setTeleportNameInput: mocks.mockSetTeleportNameInput,
    addGroupNode: mocks.mockAddGroupNode,
    addLabelNode: mocks.mockAddLabelNode,
    addBuiltinSchemaNode: mocks.mockAddBuiltinSchemaNode,
    addCustomNode: mocks.mockAddCustomNode,
    closeContextMenu: mocks.mockCloseContextMenu,
    onRequestPromptCreation: mocks.mockOnRequestPromptCreation,
    onRequestContextCreation: mocks.mockOnRequestContextCreation,
    onRequestToolCreation: mocks.mockOnRequestToolCreation,
    onRequestProcessCreation: mocks.mockOnRequestProcessCreation,
    onRequestOutputFileCreation: mocks.mockOnRequestOutputFileCreation,
    defaultModel: undefined as string | undefined,
  };
}

export function createContextMenuState(
  overrides: Partial<ContextMenuState> = {},
): ContextMenuState {
  return {
    x: 100,
    y: 200,
    flowPosition: { x: 50, y: 100 },
    ...overrides,
  };
}
