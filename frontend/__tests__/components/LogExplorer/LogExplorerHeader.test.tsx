import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LogExplorerHeader } from "@/components/LogExplorer/LogExplorerHeader";
import type { LogFileInfo, LogStats } from "@/lib/api";

const mockFiles: LogFileInfo[] = [
  { name: "app.log", path: "/logs/app.log", sizeBytes: 1024 },
  { name: "error.log", path: "/logs/error.log", sizeBytes: 2048 },
];

const mockStats: LogStats = {
  totalLines: 100,
  levels: { info: 80, error: 15, warn: 5 },
};

describe("LogExplorerHeader", () => {
  const defaultProps = {
    files: mockFiles,
    selectedFile: "app.log",
    onSelectFile: vi.fn(),
    stats: mockStats,
    totalCount: 100,
    isLoading: false,
    onRefresh: vi.fn(),
    onExport: vi.fn(),
  };

  describe("file selector", () => {
    it("should show selected file name", () => {
      render(<LogExplorerHeader {...defaultProps} />);
      expect(screen.getByText("app.log")).toBeInTheDocument();
    });

    it("should show placeholder when no file selected", () => {
      render(<LogExplorerHeader {...defaultProps} selectedFile={null} />);
      expect(screen.getByText("Select log file")).toBeInTheDocument();
    });

    it("should call onSelectFile when file clicked", async () => {
      const user = userEvent.setup();
      const onSelectFile = vi.fn();
      render(
        <LogExplorerHeader {...defaultProps} onSelectFile={onSelectFile} />,
      );

      // Open dropdown
      await user.click(screen.getByRole("button", { name: /app.log/i }));
      // Click on error.log
      await user.click(screen.getByText("error.log"));

      expect(onSelectFile).toHaveBeenCalledWith("error.log");
    });

    it("should show file sizes in dropdown", async () => {
      const user = userEvent.setup();
      render(<LogExplorerHeader {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /app.log/i }));

      // Multiple elements may show file sizes
      const kb1Elements = screen.getAllByText("1.0 KB");
      expect(kb1Elements.length).toBeGreaterThan(0);
      const kb2Elements = screen.getAllByText("2.0 KB");
      expect(kb2Elements.length).toBeGreaterThan(0);
    });
  });

  describe("stats display", () => {
    it("should show entry count", () => {
      render(<LogExplorerHeader {...defaultProps} />);
      expect(screen.getByText("100 entries")).toBeInTheDocument();
    });

    it("should show filtered count when different from total", () => {
      render(<LogExplorerHeader {...defaultProps} totalCount={50} />);
      expect(screen.getByText("50 entries")).toBeInTheDocument();
      expect(screen.getByText("(of 100)")).toBeInTheDocument();
    });

    it("should not show stats when null", () => {
      render(<LogExplorerHeader {...defaultProps} stats={null} />);
      expect(screen.queryByText(/entries/)).not.toBeInTheDocument();
    });
  });

  describe("actions", () => {
    it("should render refresh button", () => {
      render(<LogExplorerHeader {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /refresh/i }),
      ).toBeInTheDocument();
    });

    it("should render export button", () => {
      render(<LogExplorerHeader {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /export/i }),
      ).toBeInTheDocument();
    });

    it("should call onRefresh when refresh clicked", async () => {
      const user = userEvent.setup();
      const onRefresh = vi.fn();
      render(<LogExplorerHeader {...defaultProps} onRefresh={onRefresh} />);

      await user.click(screen.getByRole("button", { name: /refresh/i }));

      expect(onRefresh).toHaveBeenCalled();
    });

    it("should call onExport when export clicked", async () => {
      const user = userEvent.setup();
      const onExport = vi.fn();
      render(<LogExplorerHeader {...defaultProps} onExport={onExport} />);

      await user.click(screen.getByRole("button", { name: /export/i }));

      expect(onExport).toHaveBeenCalled();
    });

    it("should disable buttons when loading", () => {
      render(<LogExplorerHeader {...defaultProps} isLoading={true} />);
      expect(screen.getByRole("button", { name: /refresh/i })).toBeDisabled();
    });

    it("should disable export when no entries", () => {
      render(<LogExplorerHeader {...defaultProps} totalCount={0} />);
      expect(screen.getByRole("button", { name: /export/i })).toBeDisabled();
    });
  });
});
