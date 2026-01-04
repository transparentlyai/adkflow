import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFullscreen } from "@/hooks/useFullscreen";

describe("useFullscreen", () => {
  let mockExitFullscreen: ReturnType<typeof vi.fn>;
  let mockRequestFullscreen: ReturnType<typeof vi.fn>;
  let fullscreenChangeHandler: (() => void) | null = null;

  beforeEach(() => {
    mockExitFullscreen = vi.fn().mockResolvedValue(undefined);
    mockRequestFullscreen = vi.fn().mockResolvedValue(undefined);

    // Mock document.fullscreenElement
    Object.defineProperty(document, "fullscreenElement", {
      value: null,
      writable: true,
      configurable: true,
    });

    // Mock document.exitFullscreen
    document.exitFullscreen = mockExitFullscreen;

    // Mock document.documentElement.requestFullscreen
    document.documentElement.requestFullscreen = mockRequestFullscreen;

    // Capture the fullscreenchange handler
    vi.spyOn(document, "addEventListener").mockImplementation(
      (event: string, handler: EventListener) => {
        if (event === "fullscreenchange") {
          fullscreenChangeHandler = handler as () => void;
        }
      },
    );

    vi.spyOn(document, "removeEventListener").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fullscreenChangeHandler = null;
  });

  it("should initialize with isFullscreen as false", () => {
    const { result } = renderHook(() => useFullscreen());

    expect(result.current.isFullscreen).toBe(false);
  });

  it("should add fullscreenchange event listener on mount", () => {
    renderHook(() => useFullscreen());

    expect(document.addEventListener).toHaveBeenCalledWith(
      "fullscreenchange",
      expect.any(Function),
    );
  });

  it("should remove event listener on unmount", () => {
    const { unmount } = renderHook(() => useFullscreen());

    unmount();

    expect(document.removeEventListener).toHaveBeenCalledWith(
      "fullscreenchange",
      expect.any(Function),
    );
  });

  it("should update isFullscreen when fullscreenchange event fires", () => {
    const { result } = renderHook(() => useFullscreen());

    // Simulate entering fullscreen
    Object.defineProperty(document, "fullscreenElement", {
      value: document.documentElement,
      writable: true,
      configurable: true,
    });

    act(() => {
      fullscreenChangeHandler?.();
    });

    expect(result.current.isFullscreen).toBe(true);

    // Simulate exiting fullscreen
    Object.defineProperty(document, "fullscreenElement", {
      value: null,
      writable: true,
      configurable: true,
    });

    act(() => {
      fullscreenChangeHandler?.();
    });

    expect(result.current.isFullscreen).toBe(false);
  });

  it("should call requestFullscreen when not in fullscreen", () => {
    const { result } = renderHook(() => useFullscreen());

    act(() => {
      result.current.toggleFullscreen();
    });

    expect(mockRequestFullscreen).toHaveBeenCalled();
    expect(mockExitFullscreen).not.toHaveBeenCalled();
  });

  it("should call exitFullscreen when in fullscreen", () => {
    // Set up fullscreen state
    Object.defineProperty(document, "fullscreenElement", {
      value: document.documentElement,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useFullscreen());

    act(() => {
      result.current.toggleFullscreen();
    });

    expect(mockExitFullscreen).toHaveBeenCalled();
    expect(mockRequestFullscreen).not.toHaveBeenCalled();
  });

  it("should return stable toggleFullscreen reference", () => {
    const { result, rerender } = renderHook(() => useFullscreen());

    const firstReference = result.current.toggleFullscreen;

    rerender();

    expect(result.current.toggleFullscreen).toBe(firstReference);
  });
});
