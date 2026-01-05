import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LogRunFilter } from "@/components/LogExplorer/toolbar/LogRunFilter";
import type { RunInfo } from "@/lib/api";

describe("LogRunFilter", () => {
  const mockRuns: RunInfo[] = [
    { runId: "run-1", firstTimestamp: "2024-01-15T10:30:00Z", entryCount: 50 },
    { runId: "run-2", firstTimestamp: "2024-01-15T11:00:00Z", entryCount: 30 },
    { runId: "run-3", firstTimestamp: "2024-01-15T11:30:00Z", entryCount: 20 },
  ];

  const defaultProps = {
    runs: mockRuns,
    selectedRunId: null as string | null,
    lastRunOnly: false,
    isLoading: false,
    onRunIdChange: vi.fn(),
    onLastRunOnlyChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render Last run button", () => {
      render(<LogRunFilter {...defaultProps} />);
      expect(screen.getByText("Last run")).toBeInTheDocument();
    });

    it("should render All runs button when no run selected", () => {
      render(<LogRunFilter {...defaultProps} />);
      expect(screen.getByText("All runs")).toBeInTheDocument();
    });

    it("should show selected run ID when a run is selected", () => {
      render(<LogRunFilter {...defaultProps} selectedRunId="run-2" />);
      expect(screen.getByText("run-2")).toBeInTheDocument();
    });
  });

  describe("Last run toggle", () => {
    it("should call onLastRunOnlyChange when Last run button clicked", () => {
      const onLastRunOnlyChange = vi.fn();
      render(
        <LogRunFilter
          {...defaultProps}
          onLastRunOnlyChange={onLastRunOnlyChange}
        />,
      );

      fireEvent.click(screen.getByText("Last run"));
      expect(onLastRunOnlyChange).toHaveBeenCalledWith(true);
    });

    it("should toggle off when lastRunOnly is true and button clicked", () => {
      const onLastRunOnlyChange = vi.fn();
      render(
        <LogRunFilter
          {...defaultProps}
          lastRunOnly={true}
          onLastRunOnlyChange={onLastRunOnlyChange}
        />,
      );

      fireEvent.click(screen.getByText("Last run"));
      expect(onLastRunOnlyChange).toHaveBeenCalledWith(false);
    });
  });

  describe("disabled states", () => {
    it("should disable Last run button when loading", () => {
      render(<LogRunFilter {...defaultProps} isLoading={true} />);
      const button = screen.getByText("Last run").closest("button");
      expect(button).toBeDisabled();
    });

    it("should disable Last run button when no runs", () => {
      render(<LogRunFilter {...defaultProps} runs={[]} />);
      const button = screen.getByText("Last run").closest("button");
      expect(button).toBeDisabled();
    });

    it("should disable run selector when lastRunOnly is true", () => {
      render(<LogRunFilter {...defaultProps} lastRunOnly={true} />);
      const allRunsButton = screen.getByText("All runs").closest("button");
      expect(allRunsButton).toBeDisabled();
    });
  });

  describe("run selector", () => {
    it("should show All runs text when no run selected", () => {
      render(<LogRunFilter {...defaultProps} />);
      expect(screen.getByText("All runs")).toBeInTheDocument();
    });

    it("should show selected run ID when run is selected", () => {
      render(<LogRunFilter {...defaultProps} selectedRunId="run-2" />);
      expect(screen.getByText("run-2")).toBeInTheDocument();
    });

    it("should be disabled when lastRunOnly is true", () => {
      render(<LogRunFilter {...defaultProps} lastRunOnly={true} />);
      const allRunsButton = screen.getByText("All runs").closest("button");
      expect(allRunsButton).toBeDisabled();
    });

    it("should be disabled when loading", () => {
      render(<LogRunFilter {...defaultProps} isLoading={true} />);
      const allRunsButton = screen.getByText("All runs").closest("button");
      expect(allRunsButton).toBeDisabled();
    });

    it("should be disabled when no runs", () => {
      render(<LogRunFilter {...defaultProps} runs={[]} />);
      const allRunsButton = screen.getByText("All runs").closest("button");
      expect(allRunsButton).toBeDisabled();
    });
  });
});
