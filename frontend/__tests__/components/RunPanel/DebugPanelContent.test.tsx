import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { DebugPanelContent } from "@/components/RunPanel/DebugPanelContent";
import type { LoggingConfig, CategoryInfo } from "@/lib/api";

// Mock the DebugPanelControls components
vi.mock("@/components/RunPanel/DebugPanelControls", () => ({
  LevelSelector: ({
    value,
    onChange,
    disabled,
  }: {
    value: string;
    onChange: (level: string) => void;
    disabled: boolean;
  }) => (
    <select
      data-testid="level-selector"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="DEBUG">DEBUG</option>
      <option value="INFO">INFO</option>
      <option value="WARNING">WARNING</option>
      <option value="ERROR">ERROR</option>
    </select>
  ),
  CategoryItem: ({
    node,
    disabled,
  }: {
    node: { name: string };
    disabled: boolean;
    expanded: Set<string>;
    onToggle: (name: string) => void;
    onLevelChange: (name: string, level: string) => void;
    isRoot: boolean;
  }) => (
    <div data-testid={`category-${node.name}`} data-disabled={disabled}>
      {node.name}
    </div>
  ),
  PresetCard: ({
    preset,
    onClick,
    disabled,
  }: {
    preset: { id: string; name: string };
    onClick: () => void;
    disabled: boolean;
  }) => (
    <button
      data-testid={`preset-${preset.id}`}
      onClick={onClick}
      disabled={disabled}
    >
      {preset.name}
    </button>
  ),
}));

// Mock the debugPanelUtils
vi.mock("@/components/RunPanel/debugPanelUtils", () => ({
  LOGGING_PRESETS: [
    { id: "production", name: "Production", apply: () => ({}) },
    { id: "debug-all", name: "Debug All", apply: () => ({}) },
    { id: "silent", name: "Silent", apply: () => ({}) },
  ],
  buildCategoryTree: (
    categories: CategoryInfo[],
    _levels: Record<string, string>,
    _globalLevel: string,
  ) =>
    categories.map((c) => ({
      name: c.name,
      description: c.description,
      level: "INFO",
      isInherited: true,
      children: [],
    })),
}));

describe("DebugPanelContent", () => {
  const mockConfig: LoggingConfig = {
    globalLevel: "INFO",
    categories: {},
    fileOutput: null,
    traceOutput: null,
    fileClearBeforeRun: false,
    traceClearBeforeRun: false,
  };

  const mockCategories: CategoryInfo[] = [
    { name: "adk", description: "ADK logs" },
    { name: "runner", description: "Runner logs" },
  ];

  const defaultProps = {
    isLoading: false,
    error: null,
    config: mockConfig,
    categories: mockCategories,
    updateConfig: vi.fn(),
    resetConfig: vi.fn(),
    showHeader: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render header when showHeader is true", () => {
      render(<DebugPanelContent {...defaultProps} />);
      expect(screen.getByText("Debug Settings")).toBeInTheDocument();
    });

    it("should not render header when showHeader is false", () => {
      render(<DebugPanelContent {...defaultProps} showHeader={false} />);
      expect(screen.queryByText("Debug Settings")).not.toBeInTheDocument();
    });

    it("should render level selector", () => {
      render(<DebugPanelContent {...defaultProps} />);
      expect(screen.getByText("Default Level")).toBeInTheDocument();
      expect(screen.getByTestId("level-selector")).toBeInTheDocument();
    });

    it("should render clear logs toggle", () => {
      render(<DebugPanelContent {...defaultProps} />);
      expect(screen.getByText("Clear logs before run")).toBeInTheDocument();
    });

    it("should render clear traces toggle", () => {
      render(<DebugPanelContent {...defaultProps} />);
      expect(screen.getByText("Clear traces before run")).toBeInTheDocument();
    });

    it("should render quick presets section", () => {
      render(<DebugPanelContent {...defaultProps} />);
      expect(screen.getByText("Quick Presets")).toBeInTheDocument();
    });

    it("should render categories section", () => {
      render(<DebugPanelContent {...defaultProps} />);
      expect(screen.getByText("Categories")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should show loading spinner when loading with no config", () => {
      render(
        <DebugPanelContent {...defaultProps} isLoading={true} config={null} />,
      );
      // Loading spinner should be present (Loader2 component)
      const loadingContainer = document.querySelector(".animate-spin");
      expect(loadingContainer).toBeInTheDocument();
    });

    it("should show content when loading with existing config", () => {
      render(<DebugPanelContent {...defaultProps} isLoading={true} />);
      expect(screen.getByText("Default Level")).toBeInTheDocument();
    });

    it("should disable controls when loading", () => {
      render(<DebugPanelContent {...defaultProps} isLoading={true} />);
      expect(screen.getByTestId("level-selector")).toBeDisabled();
    });
  });

  describe("error state", () => {
    it("should display error message when error is present", () => {
      render(
        <DebugPanelContent
          {...defaultProps}
          error="Failed to load configuration"
        />,
      );
      expect(
        screen.getByText("Failed to load configuration"),
      ).toBeInTheDocument();
    });

    it("should render content even with error", () => {
      render(<DebugPanelContent {...defaultProps} error="Some error" />);
      expect(screen.getByText("Default Level")).toBeInTheDocument();
    });
  });

  describe("level selector interaction", () => {
    it("should update pending level on change", () => {
      render(<DebugPanelContent {...defaultProps} />);

      fireEvent.change(screen.getByTestId("level-selector"), {
        target: { value: "DEBUG" },
      });

      // Save button should become active
      const saveButton = screen.getByText("Save");
      expect(saveButton.closest("button")).not.toBeDisabled();
    });
  });

  describe("clear before run toggles", () => {
    it("should toggle clear logs setting", () => {
      render(<DebugPanelContent {...defaultProps} />);

      // There are two "Off" buttons (for logs and traces), get the first one
      const toggleButtons = screen.getAllByRole("button", { name: "Off" });
      fireEvent.click(toggleButtons[0]);

      // After clicking, Save should be enabled
      const saveButton = screen.getByText("Save");
      expect(saveButton.closest("button")).not.toBeDisabled();
    });

    it("should show On when clearBeforeRun is true", () => {
      const config = { ...mockConfig, fileClearBeforeRun: true };
      render(<DebugPanelContent {...defaultProps} config={config} />);

      expect(screen.getAllByRole("button", { name: "On" })).toHaveLength(1);
    });
  });

  describe("save and reset buttons", () => {
    it("should disable Save button when no changes", () => {
      render(<DebugPanelContent {...defaultProps} />);

      const saveButton = screen.getByText("Save").closest("button");
      expect(saveButton).toBeDisabled();
    });

    it("should enable Save button when there are changes", () => {
      render(<DebugPanelContent {...defaultProps} />);

      // Make a change
      fireEvent.change(screen.getByTestId("level-selector"), {
        target: { value: "DEBUG" },
      });

      const saveButton = screen.getByText("Save").closest("button");
      expect(saveButton).not.toBeDisabled();
    });

    it("should call updateConfig when Save is clicked", async () => {
      const updateConfig = vi.fn().mockResolvedValue({});
      render(
        <DebugPanelContent {...defaultProps} updateConfig={updateConfig} />,
      );

      // Make a change
      fireEvent.change(screen.getByTestId("level-selector"), {
        target: { value: "DEBUG" },
      });

      // Click save
      fireEvent.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(updateConfig).toHaveBeenCalled();
      });
    });

    it("should call resetConfig when reset button is clicked", async () => {
      const resetConfig = vi.fn().mockResolvedValue({});
      render(<DebugPanelContent {...defaultProps} resetConfig={resetConfig} />);

      // Find and click the reset button (RotateCcw icon button)
      const resetButton = screen.getByTitle("Reset to defaults");
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(resetConfig).toHaveBeenCalled();
      });
    });
  });

  describe("presets", () => {
    it("should render all presets", () => {
      render(<DebugPanelContent {...defaultProps} />);

      expect(screen.getByTestId("preset-production")).toBeInTheDocument();
      expect(screen.getByTestId("preset-debug-all")).toBeInTheDocument();
      expect(screen.getByTestId("preset-silent")).toBeInTheDocument();
    });

    it("should enable Save when preset is applied", () => {
      render(<DebugPanelContent {...defaultProps} />);

      fireEvent.click(screen.getByTestId("preset-production"));

      const saveButton = screen.getByText("Save").closest("button");
      expect(saveButton).not.toBeDisabled();
    });

    it("should disable presets when loading", () => {
      render(<DebugPanelContent {...defaultProps} isLoading={true} />);

      expect(screen.getByTestId("preset-production")).toBeDisabled();
    });
  });

  describe("categories", () => {
    it("should render categories when available", () => {
      render(<DebugPanelContent {...defaultProps} />);

      expect(screen.getByTestId("category-adk")).toBeInTheDocument();
      expect(screen.getByTestId("category-runner")).toBeInTheDocument();
    });

    it("should show category count", () => {
      render(<DebugPanelContent {...defaultProps} />);

      expect(screen.getByText("2 registered")).toBeInTheDocument();
    });

    it("should show no categories message when empty", () => {
      render(<DebugPanelContent {...defaultProps} categories={[]} />);

      expect(screen.getByText("No categories registered")).toBeInTheDocument();
    });

    it("should disable categories when loading", () => {
      render(<DebugPanelContent {...defaultProps} isLoading={true} />);

      expect(screen.getByTestId("category-adk")).toHaveAttribute(
        "data-disabled",
        "true",
      );
    });
  });

  describe("config null handling", () => {
    it("should show loading spinner when config is null and loading", () => {
      render(
        <DebugPanelContent {...defaultProps} config={null} isLoading={true} />,
      );

      // Loading spinner should be present
      const loadingContainer = document.querySelector(".animate-spin");
      expect(loadingContainer).toBeInTheDocument();
    });

    it("should use fallback values when config is null but not loading", () => {
      render(
        <DebugPanelContent {...defaultProps} config={null} isLoading={false} />,
      );

      // Content should still render with fallback values
      expect(screen.getByText("Default Level")).toBeInTheDocument();
    });
  });

  describe("saving state", () => {
    it("should show loading spinner on Save button while saving", async () => {
      const updateConfig = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100)),
        );
      render(
        <DebugPanelContent {...defaultProps} updateConfig={updateConfig} />,
      );

      // Make a change
      fireEvent.change(screen.getByTestId("level-selector"), {
        target: { value: "DEBUG" },
      });

      // Click save
      fireEvent.click(screen.getByText("Save"));

      // Check for loading state on button
      await waitFor(() => {
        expect(updateConfig).toHaveBeenCalled();
      });
    });
  });

  describe("resetting state", () => {
    it("should show loading spinner on reset button while resetting", async () => {
      const resetConfig = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100)),
        );
      render(<DebugPanelContent {...defaultProps} resetConfig={resetConfig} />);

      const resetButton = screen.getByTitle("Reset to defaults");
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(resetConfig).toHaveBeenCalled();
      });
    });
  });
});
