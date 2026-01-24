import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CanvasContextMenu from "@/components/CanvasContextMenu";
import { createDefaultProps } from "./CanvasContextMenu.testUtils";

// Mock formatShortcut utility
vi.mock("@/lib/utils", () => ({
  formatShortcut: (key: string) => `Ctrl+${key}`,
  cn: (...args: unknown[]) => args.join(" "),
  isMacOS: () => false,
  getModifierKey: () => "Ctrl+",
  sanitizeAgentName: (name: string) => name,
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Monitor: () => <svg data-testid="icon-monitor" />,
  SquareDashed: () => <svg data-testid="icon-square-dashed" />,
  FileText: () => <svg data-testid="icon-file-text" />,
  Database: () => <svg data-testid="icon-database" />,
  Tag: () => <svg data-testid="icon-tag" />,
  Settings: () => <svg data-testid="icon-settings" />,
  Terminal: () => <svg data-testid="icon-terminal" />,
  LogIn: () => <svg data-testid="icon-log-in" />,
  LogOut: () => <svg data-testid="icon-log-out" />,
  FileInput: () => <svg data-testid="icon-file-input" />,
  Code: () => <svg data-testid="icon-code" />,
  Lock: () => <svg data-testid="icon-lock" />,
  Unlock: () => <svg data-testid="icon-unlock" />,
  Type: () => <svg data-testid="icon-type" />,
  Wrench: () => <svg data-testid="icon-wrench" />,
  Activity: () => <svg data-testid="icon-activity" />,
  Layout: () => <svg data-testid="icon-layout" />,
  List: () => <svg data-testid="icon-list" />,
  Copy: () => <svg data-testid="icon-copy" />,
  Scissors: () => <svg data-testid="icon-scissors" />,
  Clipboard: () => <svg data-testid="icon-clipboard" />,
  Trash2: () => <svg data-testid="icon-trash2" />,
  ArrowRightFromLine: () => <svg data-testid="icon-arrow-right-from-line" />,
  ArrowLeftToLine: () => <svg data-testid="icon-arrow-left-to-line" />,
  MessageSquare: () => <svg data-testid="icon-message-square" />,
  Play: () => <svg data-testid="icon-play" />,
  Square: () => <svg data-testid="icon-square" />,
  Puzzle: () => <svg data-testid="icon-puzzle" />,
  Layers: () => <svg data-testid="icon-layers" />,
  ChevronRight: () => <svg data-testid="icon-chevron-right" />,
  Zap: () => <svg data-testid="icon-zap" />,
  Eye: () => <svg data-testid="icon-eye" />,
}));

describe("CanvasContextMenu - Lock/Unlock Functionality", () => {
  const defaultProps = createDefaultProps();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("lock option visibility", () => {
    it("should not render lock option when onToggleLock is not provided", () => {
      render(<CanvasContextMenu {...defaultProps} />);
      expect(screen.queryByText("Lock Canvas")).not.toBeInTheDocument();
      expect(screen.queryByText("Unlock Canvas")).not.toBeInTheDocument();
    });

    it("should render Lock Canvas when unlocked", () => {
      render(
        <CanvasContextMenu
          {...defaultProps}
          isLocked={false}
          onToggleLock={vi.fn()}
        />,
      );

      expect(screen.getByText("Lock Canvas")).toBeInTheDocument();
    });

    it("should render Unlock Canvas when locked", () => {
      render(
        <CanvasContextMenu
          {...defaultProps}
          isLocked={true}
          onToggleLock={vi.fn()}
        />,
      );

      expect(screen.getByText("Unlock Canvas")).toBeInTheDocument();
    });
  });

  describe("toggle lock interaction", () => {
    it("should call onToggleLock when lock option clicked", () => {
      const onToggleLock = vi.fn();
      render(
        <CanvasContextMenu
          {...defaultProps}
          isLocked={false}
          onToggleLock={onToggleLock}
        />,
      );

      fireEvent.click(screen.getByText("Lock Canvas"));

      expect(onToggleLock).toHaveBeenCalledTimes(1);
    });

    it("should call onToggleLock when unlock option clicked", () => {
      const onToggleLock = vi.fn();
      render(
        <CanvasContextMenu
          {...defaultProps}
          isLocked={true}
          onToggleLock={onToggleLock}
        />,
      );

      fireEvent.click(screen.getByText("Unlock Canvas"));

      expect(onToggleLock).toHaveBeenCalledTimes(1);
    });
  });

  describe("locked state behavior", () => {
    it("should hide Add Node section when locked", () => {
      render(
        <CanvasContextMenu
          {...defaultProps}
          isLocked={true}
          onToggleLock={vi.fn()}
        />,
      );

      expect(screen.queryByText("Add Node")).not.toBeInTheDocument();
      expect(screen.queryByText("Agent")).not.toBeInTheDocument();
    });

    it("should show Add Node section when unlocked", () => {
      render(
        <CanvasContextMenu
          {...defaultProps}
          isLocked={false}
          onToggleLock={vi.fn()}
        />,
      );

      expect(screen.getByText("Add Node")).toBeInTheDocument();
      expect(screen.getByText("Agent")).toBeInTheDocument();
    });

    it("should not render edit actions when canvas is locked", () => {
      render(
        <CanvasContextMenu
          {...defaultProps}
          hasSelection={true}
          isLocked={true}
          onCopy={vi.fn()}
        />,
      );

      expect(screen.queryByText("Edit")).not.toBeInTheDocument();
      expect(screen.queryByText("Copy")).not.toBeInTheDocument();
    });
  });

  describe("lock icons", () => {
    it("should render Lock icon when unlocked", () => {
      render(
        <CanvasContextMenu
          {...defaultProps}
          isLocked={false}
          onToggleLock={vi.fn()}
        />,
      );

      expect(screen.getByTestId("icon-lock")).toBeInTheDocument();
    });

    it("should render Unlock icon when locked", () => {
      render(
        <CanvasContextMenu
          {...defaultProps}
          isLocked={true}
          onToggleLock={vi.fn()}
        />,
      );

      expect(screen.getByTestId("icon-unlock")).toBeInTheDocument();
    });
  });

  describe("lock with other features", () => {
    it("should show lock toggle with edit actions when unlocked", () => {
      render(
        <CanvasContextMenu
          {...defaultProps}
          hasSelection={true}
          onCopy={vi.fn()}
          onToggleLock={vi.fn()}
        />,
      );

      expect(screen.getByText("Edit")).toBeInTheDocument();
      expect(screen.getByText("Copy")).toBeInTheDocument();
      expect(screen.getByText("Lock Canvas")).toBeInTheDocument();
    });
  });
});
