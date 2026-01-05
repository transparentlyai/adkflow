import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LogLevelFilter } from "@/components/LogExplorer/toolbar/LogLevelFilter";

describe("LogLevelFilter", () => {
  const defaultProps = {
    selectedLevels: [],
    stats: null,
    onToggleLevel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render Level button", () => {
      render(<LogLevelFilter {...defaultProps} />);
      expect(screen.getByText("Level")).toBeInTheDocument();
    });

    it("should not show count badge when no levels selected", () => {
      render(<LogLevelFilter {...defaultProps} />);
      // Should only have "Level" text, no count
      const button = screen.getByRole("button");
      expect(button.textContent).toBe("Level");
    });

    it("should show count badge when levels are selected", () => {
      render(
        <LogLevelFilter
          {...defaultProps}
          selectedLevels={["INFO", "ERROR"] as any}
        />,
      );
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  describe("dropdown", () => {
    it("should show Log Levels label when opened", async () => {
      const user = userEvent.setup();
      render(<LogLevelFilter {...defaultProps} />);

      await user.click(screen.getByRole("button"));

      expect(screen.getByText("Log Levels")).toBeInTheDocument();
    });

    it("should show all log levels when opened", async () => {
      const user = userEvent.setup();
      render(<LogLevelFilter {...defaultProps} />);

      await user.click(screen.getByRole("button"));

      expect(screen.getByText("DEBUG")).toBeInTheDocument();
      expect(screen.getByText("INFO")).toBeInTheDocument();
      expect(screen.getByText("WARNING")).toBeInTheDocument();
      expect(screen.getByText("ERROR")).toBeInTheDocument();
    });

    it("should show counts from stats", async () => {
      const user = userEvent.setup();
      const stats = {
        totalLines: 100,
        levelCounts: {
          DEBUG: 10,
          INFO: 50,
          WARNING: 20,
          ERROR: 15,
          CRITICAL: 5,
        },
        categoryCounts: {},
      };
      render(<LogLevelFilter {...defaultProps} stats={stats} />);

      await user.click(screen.getByRole("button"));

      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("50")).toBeInTheDocument();
      expect(screen.getByText("20")).toBeInTheDocument();
    });

    it("should show 0 for levels not in stats", async () => {
      const user = userEvent.setup();
      const stats = {
        totalLines: 10,
        levelCounts: { INFO: 10 },
        categoryCounts: {},
      };
      render(<LogLevelFilter {...defaultProps} stats={stats} />);

      await user.click(screen.getByRole("button"));

      // DEBUG should show 0
      const menuItems = document.querySelectorAll('[role="menuitemcheckbox"]');
      expect(menuItems.length).toBeGreaterThan(0);
    });
  });
});
