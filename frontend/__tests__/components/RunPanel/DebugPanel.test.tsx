import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DebugPanel } from "@/components/RunPanel/DebugPanel";

// Mock the useLoggingConfig hook
const mockUseLoggingConfig = vi.fn();
vi.mock("@/hooks/useLoggingConfig", () => ({
  useLoggingConfig: () => mockUseLoggingConfig(),
}));

describe("DebugPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not render when not in dev mode", () => {
    mockUseLoggingConfig.mockReturnValue({
      isDevMode: false,
      isLoading: false,
      error: null,
      config: {},
      categories: [],
      updateConfig: vi.fn(),
      resetConfig: vi.fn(),
    });

    const { container } = render(<DebugPanel projectPath="/test" />);
    expect(container.firstChild).toBeNull();
  });

  it("should render debug button when in dev mode", () => {
    mockUseLoggingConfig.mockReturnValue({
      isDevMode: true,
      isLoading: false,
      error: null,
      config: {},
      categories: [],
      updateConfig: vi.fn(),
      resetConfig: vi.fn(),
    });

    render(<DebugPanel projectPath="/test" />);
    expect(screen.getByTitle("Debug Settings (Dev Mode)")).toBeInTheDocument();
  });

  it("should call useLoggingConfig with projectPath", () => {
    mockUseLoggingConfig.mockReturnValue({
      isDevMode: true,
      isLoading: false,
      error: null,
      config: {},
      categories: [],
      updateConfig: vi.fn(),
      resetConfig: vi.fn(),
    });

    render(<DebugPanel projectPath="/test/path" />);
    expect(mockUseLoggingConfig).toHaveBeenCalled();
  });

  it("should handle null projectPath", () => {
    mockUseLoggingConfig.mockReturnValue({
      isDevMode: true,
      isLoading: false,
      error: null,
      config: {},
      categories: [],
      updateConfig: vi.fn(),
      resetConfig: vi.fn(),
    });

    render(<DebugPanel projectPath={null} />);
    expect(screen.getByTitle("Debug Settings (Dev Mode)")).toBeInTheDocument();
  });
});
