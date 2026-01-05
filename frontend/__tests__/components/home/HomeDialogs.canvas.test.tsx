import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock all dialog components - must be in test file for hoisting
vi.mock("@/components/ConfirmDialog", () => ({
  default: ({
    isOpen,
    title,
    description,
    confirmLabel,
    onConfirm,
    onCancel,
    variant,
  }: {
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: string;
  }) =>
    isOpen ? (
      <div
        data-testid={`confirm-dialog-${title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <span data-testid="dialog-title">{title}</span>
        <span data-testid="dialog-description">{description}</span>
        <button onClick={onConfirm} data-testid="confirm-button">
          {confirmLabel || "Confirm"}
        </button>
        <button onClick={onCancel} data-testid="cancel-button">
          Cancel
        </button>
        {variant && <span data-testid="dialog-variant">{variant}</span>}
      </div>
    ) : null,
}));

vi.mock("@/components/SaveConfirmDialog", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="save-confirm-dialog" /> : null,
}));

vi.mock("@/components/RunConfirmDialog", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="run-confirm-dialog" /> : null,
}));

vi.mock("@/components/PromptNameDialog", () => ({
  default: ({ isOpen, type }: { isOpen: boolean; type?: string }) =>
    isOpen ? (
      <div data-testid={`prompt-name-dialog-${type || "prompt"}`} />
    ) : null,
}));

vi.mock("@/components/TopologyDialog", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="topology-dialog" /> : null,
}));

vi.mock("@/components/FilePicker", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="file-picker" /> : null,
}));

vi.mock("@/components/RunPanel", () => ({
  default: () => <div data-testid="run-panel" />,
}));

vi.mock("@/components/ProjectSettingsDialog", () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="project-settings-dialog" /> : null,
}));

import { HomeDialogs } from "@/components/home/HomeDialogs";
import { createDefaultProps } from "./HomeDialogs.testUtils";

describe("HomeDialogs Canvas Dialogs", () => {
  let defaultProps: ReturnType<typeof createDefaultProps>;

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps = createDefaultProps();
  });

  describe("Clear Canvas Dialog", () => {
    it("should not render when closed", () => {
      render(<HomeDialogs {...defaultProps} />);
      expect(
        screen.queryByTestId("confirm-dialog-clear-canvas"),
      ).not.toBeInTheDocument();
    });

    it("should render when open", () => {
      render(<HomeDialogs {...defaultProps} isClearDialogOpen={true} />);
      expect(
        screen.getByTestId("confirm-dialog-clear-canvas"),
      ).toBeInTheDocument();
    });

    it("should have destructive variant", () => {
      render(<HomeDialogs {...defaultProps} isClearDialogOpen={true} />);
      expect(screen.getByTestId("dialog-variant")).toHaveTextContent(
        "destructive",
      );
    });

    it("should call onClearCanvasConfirm when confirm clicked", () => {
      const onClearCanvasConfirm = vi.fn();
      render(
        <HomeDialogs
          {...defaultProps}
          isClearDialogOpen={true}
          onClearCanvasConfirm={onClearCanvasConfirm}
        />,
      );

      screen.getByTestId("confirm-button").click();
      expect(onClearCanvasConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe("Tab Delete Dialog", () => {
    it("should not render when closed", () => {
      render(<HomeDialogs {...defaultProps} />);
      expect(
        screen.queryByTestId("confirm-dialog-delete-tab"),
      ).not.toBeInTheDocument();
    });

    it("should render when open", () => {
      render(<HomeDialogs {...defaultProps} isTabDeleteDialogOpen={true} />);
      expect(
        screen.getByTestId("confirm-dialog-delete-tab"),
      ).toBeInTheDocument();
    });

    it("should display tab name in description when tab exists", () => {
      render(
        <HomeDialogs
          {...defaultProps}
          isTabDeleteDialogOpen={true}
          pendingDeleteTabId="tab1"
        />,
      );
      expect(screen.getByTestId("dialog-description")).toHaveTextContent(
        'Are you sure you want to delete "Main"?',
      );
    });

    it("should display fallback text when tab not found", () => {
      render(
        <HomeDialogs
          {...defaultProps}
          isTabDeleteDialogOpen={true}
          pendingDeleteTabId="unknown-tab"
        />,
      );
      expect(screen.getByTestId("dialog-description")).toHaveTextContent(
        'Are you sure you want to delete "this tab"?',
      );
    });

    it("should have destructive variant", () => {
      render(<HomeDialogs {...defaultProps} isTabDeleteDialogOpen={true} />);
      expect(screen.getByTestId("dialog-variant")).toHaveTextContent(
        "destructive",
      );
    });
  });
});
