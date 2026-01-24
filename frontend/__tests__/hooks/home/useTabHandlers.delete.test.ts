import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTabHandlers } from "@/hooks/home/useTabHandlers";
import {
  mockHandleTabClick,
  createMockCanvasRef,
  createMockRefs,
  createMockFunctions,
  createDefaultProps,
  setupDefaultMockResolvers,
  mockTabs,
} from "./useTabHandlers.fixtures";

vi.mock("@/hooks/home/helpers/useTabNavigation", () => ({
  useTabNavigation: () => ({
    handleTabClick: mockHandleTabClick,
  }),
}));

describe("useTabHandlers - Tab Deletion", () => {
  const mockCanvasRef = createMockCanvasRef();
  const mockRefs = createMockRefs();
  const mocks = createMockFunctions();
  const defaultProps = createDefaultProps(mockCanvasRef, mockRefs, mocks);

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefs.tabFlowCacheRef.current = new Map();
    mockRefs.loadedTabIdRef.current = "tab-1";
    setupDefaultMockResolvers(mocks);
  });

  describe("handleTabDelete", () => {
    it("should do nothing if no project path", () => {
      const props = { ...defaultProps, currentProjectPath: null };
      const { result } = renderHook(() => useTabHandlers(props));

      act(() => {
        result.current.handleTabDelete("tab-2");
      });

      expect(mocks.setPendingDeleteTabId).not.toHaveBeenCalled();
    });

    it("should do nothing if only one tab", () => {
      const props = { ...defaultProps, tabs: [mockTabs[0]] };
      const { result } = renderHook(() => useTabHandlers(props));

      act(() => {
        result.current.handleTabDelete("tab-1");
      });

      expect(mocks.setPendingDeleteTabId).not.toHaveBeenCalled();
    });

    it("should set pending delete tab and open dialog", () => {
      const { result } = renderHook(() => useTabHandlers(defaultProps));

      act(() => {
        result.current.handleTabDelete("tab-2");
      });

      expect(mocks.setPendingDeleteTabId).toHaveBeenCalledWith("tab-2");
      expect(mocks.setIsTabDeleteDialogOpen).toHaveBeenCalledWith(true);
    });
  });

  describe("handleTabDeleteConfirm", () => {
    it("should do nothing if no project path", async () => {
      const props = {
        ...defaultProps,
        currentProjectPath: null,
        pendingDeleteTabId: "tab-2",
      };
      const { result } = renderHook(() => useTabHandlers(props));

      await act(async () => {
        await result.current.handleTabDeleteConfirm();
      });

      expect(mocks.deleteTabById).not.toHaveBeenCalled();
    });

    it("should do nothing if no pending delete tab id", async () => {
      const props = { ...defaultProps, pendingDeleteTabId: null };
      const { result } = renderHook(() => useTabHandlers(props));

      await act(async () => {
        await result.current.handleTabDeleteConfirm();
      });

      expect(mocks.deleteTabById).not.toHaveBeenCalled();
    });

    it("should delete tab and close dialog", async () => {
      const props = { ...defaultProps, pendingDeleteTabId: "tab-2" };
      const { result } = renderHook(() => useTabHandlers(props));

      await act(async () => {
        await result.current.handleTabDeleteConfirm();
      });

      expect(mocks.deleteTabById).toHaveBeenCalledWith(
        "/path/to/project",
        "tab-2",
      );
      expect(mocks.setIsTabDeleteDialogOpen).toHaveBeenCalledWith(false);
      expect(mocks.setPendingDeleteTabId).toHaveBeenCalledWith(null);
    });
  });

  describe("handleTabDeleteCancel", () => {
    it("should close dialog and clear pending tab id", () => {
      const { result } = renderHook(() => useTabHandlers(defaultProps));

      act(() => {
        result.current.handleTabDeleteCancel();
      });

      expect(mocks.setIsTabDeleteDialogOpen).toHaveBeenCalledWith(false);
      expect(mocks.setPendingDeleteTabId).toHaveBeenCalledWith(null);
    });
  });
});
