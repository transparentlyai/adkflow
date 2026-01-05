import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import type { TopologyResponse, RunStatus, DisplayEvent } from "@/lib/types";

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
  default: ({
    isOpen,
    result,
    onClose,
  }: {
    isOpen: boolean;
    result: { mermaid: string; ascii: string; agent_count: number } | null;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="topology-dialog">
        {result && (
          <>
            <span data-testid="mermaid">{result.mermaid}</span>
            <span data-testid="ascii">{result.ascii}</span>
            <span data-testid="agent-count">{result.agent_count}</span>
          </>
        )}
        <button onClick={onClose} data-testid="close-btn">
          Close
        </button>
      </div>
    ) : null,
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

describe("HomeDialogs Topology Dialogs", () => {
  let defaultProps: ReturnType<typeof createDefaultProps>;

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps = createDefaultProps();
  });

  describe("Topology Save Dialog", () => {
    it("should not render when closed", () => {
      render(<HomeDialogs {...defaultProps} />);
      expect(
        screen.queryByTestId("confirm-dialog-save-before-viewing-topology?"),
      ).not.toBeInTheDocument();
    });

    it("should render when open", () => {
      render(<HomeDialogs {...defaultProps} isTopologySaveDialogOpen={true} />);
      expect(
        screen.getByTestId("confirm-dialog-save-before-viewing-topology?"),
      ).toBeInTheDocument();
    });

    it("should display correct title and description", () => {
      render(<HomeDialogs {...defaultProps} isTopologySaveDialogOpen={true} />);
      expect(screen.getByTestId("dialog-title")).toHaveTextContent(
        "Save Before Viewing Topology?",
      );
      expect(screen.getByTestId("dialog-description")).toHaveTextContent(
        "You have unsaved changes. The workflow needs to be saved to generate an accurate topology.",
      );
    });
  });

  describe("Validation Save Dialog", () => {
    it("should not render when closed", () => {
      render(<HomeDialogs {...defaultProps} />);
      expect(
        screen.queryByTestId("confirm-dialog-save-before-validating?"),
      ).not.toBeInTheDocument();
    });

    it("should render when open", () => {
      render(
        <HomeDialogs {...defaultProps} isValidationSaveDialogOpen={true} />,
      );
      expect(
        screen.getByTestId("confirm-dialog-save-before-validating?"),
      ).toBeInTheDocument();
    });
  });

  describe("Topology Dialog", () => {
    const mockTopologyResult: TopologyResponse = {
      mermaid: "graph TD; A-->B;",
      ascii: "A --> B",
      agent_count: 2,
    };

    it("should not render when topologyResult is null", () => {
      render(<HomeDialogs {...defaultProps} />);
      expect(screen.queryByTestId("topology-dialog")).not.toBeInTheDocument();
    });

    it("should render when topologyResult is provided", () => {
      render(
        <HomeDialogs {...defaultProps} topologyResult={mockTopologyResult} />,
      );
      expect(screen.getByTestId("topology-dialog")).toBeInTheDocument();
    });

    it("should display topology data", () => {
      render(
        <HomeDialogs {...defaultProps} topologyResult={mockTopologyResult} />,
      );
      expect(screen.getByTestId("mermaid")).toHaveTextContent(
        "graph TD; A-->B;",
      );
      expect(screen.getByTestId("ascii")).toHaveTextContent("A --> B");
      expect(screen.getByTestId("agent-count")).toHaveTextContent("2");
    });

    it("should call onCloseTopology when close clicked", () => {
      const onCloseTopology = vi.fn();
      render(
        <HomeDialogs
          {...defaultProps}
          topologyResult={mockTopologyResult}
          onCloseTopology={onCloseTopology}
        />,
      );

      screen.getByTestId("close-btn").click();
      expect(onCloseTopology).toHaveBeenCalledTimes(1);
    });
  });
});
