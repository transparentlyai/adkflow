import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ReactFlowDialogs } from "@/components/ReactFlowDialogs";
import type { Theme } from "@/lib/themes/types";
import type {
  DeleteConfirmState,
  GroupDeleteConfirmState,
  TeleportNamePromptState,
} from "@/components/hooks/canvas";

describe("ReactFlowDialogs", () => {
  const mockTheme: Theme = {
    id: "test-theme",
    name: "Test Theme",
    version: "1.0.0",
    colors: {
      canvas: {
        background: "#ffffff",
        grid: "#e0e0e0",
        minimap: {
          background: "#f5f5f5",
          mask: "rgba(0, 0, 0, 0.1)",
          nodeStroke: "#333333",
        },
      },
      nodes: {
        common: {
          container: {
            background: "#ffffff",
            border: "#e0e0e0",
            shadow: "rgba(0, 0, 0, 0.1)",
          },
          footer: {
            background: "#f5f5f5",
            border: "#e0e0e0",
            text: "#666666",
          },
          text: {
            primary: "#333333",
            secondary: "#666666",
            muted: "#999999",
          },
        },
        agent: {
          header: "#4a90d9",
          text: "#ffffff",
          ring: "#4a90d9",
          badges: {
            llm: { background: "#4a90d9", text: "#ffffff" },
            sequential: { background: "#4a90d9", text: "#ffffff" },
            parallel: { background: "#4a90d9", text: "#ffffff" },
            loop: { background: "#4a90d9", text: "#ffffff" },
          },
        },
      } as Theme["colors"]["nodes"],
      handles: {} as Theme["colors"]["handles"],
      edges: {} as Theme["colors"]["edges"],
      ui: {} as Theme["colors"]["ui"],
      form: {} as Theme["colors"]["form"],
      scrollbar: {} as Theme["colors"]["scrollbar"],
      topology: {} as Theme["colors"]["topology"],
      state: {} as Theme["colors"]["state"],
      monaco: "vs",
      agentPrism: {} as Theme["colors"]["agentPrism"],
    },
  };

  const defaultProps = {
    deleteConfirm: null as DeleteConfirmState | null,
    onDeleteConfirm: vi.fn(),
    onDeleteCancel: vi.fn(),
    groupDeleteConfirm: null as GroupDeleteConfirmState | null,
    onGroupDeleteGroupOnly: vi.fn(),
    onGroupDeleteAll: vi.fn(),
    onGroupDeleteCancel: vi.fn(),
    teleportNamePrompt: null as TeleportNamePromptState | null,
    teleportNameInput: "",
    onTeleportNameChange: vi.fn(),
    onTeleportNameSubmit: vi.fn(),
    onTeleportNameCancel: vi.fn(),
    theme: mockTheme,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ConfirmDialog integration", () => {
    it("should not render ConfirmDialog content when deleteConfirm is null", () => {
      render(<ReactFlowDialogs {...defaultProps} deleteConfirm={null} />);
      expect(screen.queryByText("Delete Selection")).not.toBeInTheDocument();
    });

    it("should render ConfirmDialog when deleteConfirm is provided", () => {
      const deleteConfirm: DeleteConfirmState = {
        nodeIds: ["node-1"],
        edgeIds: [],
        message: "Delete 1 node?",
      };

      render(
        <ReactFlowDialogs {...defaultProps} deleteConfirm={deleteConfirm} />,
      );

      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      expect(screen.getByText("Delete Selection")).toBeInTheDocument();
      expect(screen.getByText("Delete 1 node?")).toBeInTheDocument();
    });

    it("should show Delete button with destructive styling", () => {
      const deleteConfirm: DeleteConfirmState = {
        nodeIds: ["node-1", "node-2"],
        edgeIds: ["edge-1"],
        message: "Delete 2 nodes and 1 edge?",
      };

      render(
        <ReactFlowDialogs {...defaultProps} deleteConfirm={deleteConfirm} />,
      );

      const deleteButton = screen.getByRole("button", { name: "Delete" });
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toHaveClass("bg-destructive");
    });

    it("should call onDeleteConfirm when Delete is clicked", () => {
      const onDeleteConfirm = vi.fn();
      const deleteConfirm: DeleteConfirmState = {
        nodeIds: ["node-1"],
        edgeIds: [],
        message: "Delete 1 node?",
      };

      render(
        <ReactFlowDialogs
          {...defaultProps}
          deleteConfirm={deleteConfirm}
          onDeleteConfirm={onDeleteConfirm}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      expect(onDeleteConfirm).toHaveBeenCalledTimes(1);
    });

    it("should call onDeleteCancel when Cancel is clicked", () => {
      const onDeleteCancel = vi.fn();
      const deleteConfirm: DeleteConfirmState = {
        nodeIds: ["node-1"],
        edgeIds: [],
        message: "Delete 1 node?",
      };

      render(
        <ReactFlowDialogs
          {...defaultProps}
          deleteConfirm={deleteConfirm}
          onDeleteCancel={onDeleteCancel}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(onDeleteCancel).toHaveBeenCalled();
    });
  });

  describe("GroupDeleteDialog integration", () => {
    it("should not render GroupDeleteDialog content when groupDeleteConfirm is null", () => {
      render(<ReactFlowDialogs {...defaultProps} groupDeleteConfirm={null} />);
      expect(screen.queryByText("Delete group?")).not.toBeInTheDocument();
      expect(screen.queryByText("Delete groups?")).not.toBeInTheDocument();
    });

    it("should render GroupDeleteDialog when groupDeleteConfirm is provided", () => {
      const groupDeleteConfirm: GroupDeleteConfirmState = {
        groupIds: ["group-1"],
        childIds: ["child-1", "child-2", "child-3"],
        otherNodeIds: [],
        edgeIds: [],
      };

      render(
        <ReactFlowDialogs
          {...defaultProps}
          groupDeleteConfirm={groupDeleteConfirm}
        />,
      );

      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      expect(screen.getByText("Delete group?")).toBeInTheDocument();
    });

    it("should show correct counts in GroupDeleteDialog", () => {
      const groupDeleteConfirm: GroupDeleteConfirmState = {
        groupIds: ["group-1", "group-2"],
        childIds: ["child-1", "child-2", "child-3", "child-4", "child-5"],
        otherNodeIds: [],
        edgeIds: [],
      };

      render(
        <ReactFlowDialogs
          {...defaultProps}
          groupDeleteConfirm={groupDeleteConfirm}
        />,
      );

      expect(screen.getByText("Delete groups?")).toBeInTheDocument();
      expect(
        screen.getByText(/These 2 groups contain 5 nodes total/),
      ).toBeInTheDocument();
    });

    it("should call onGroupDeleteGroupOnly when clicked", () => {
      const onGroupDeleteGroupOnly = vi.fn();
      const groupDeleteConfirm: GroupDeleteConfirmState = {
        groupIds: ["group-1"],
        childIds: ["child-1"],
        otherNodeIds: [],
        edgeIds: [],
      };

      render(
        <ReactFlowDialogs
          {...defaultProps}
          groupDeleteConfirm={groupDeleteConfirm}
          onGroupDeleteGroupOnly={onGroupDeleteGroupOnly}
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Delete group only" }),
      );

      expect(onGroupDeleteGroupOnly).toHaveBeenCalledTimes(1);
    });

    it("should call onGroupDeleteAll when clicked", () => {
      const onGroupDeleteAll = vi.fn();
      const groupDeleteConfirm: GroupDeleteConfirmState = {
        groupIds: ["group-1"],
        childIds: ["child-1"],
        otherNodeIds: [],
        edgeIds: [],
      };

      render(
        <ReactFlowDialogs
          {...defaultProps}
          groupDeleteConfirm={groupDeleteConfirm}
          onGroupDeleteAll={onGroupDeleteAll}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Delete all" }));

      expect(onGroupDeleteAll).toHaveBeenCalledTimes(1);
    });

    it("should call onGroupDeleteCancel when cancelled", () => {
      const onGroupDeleteCancel = vi.fn();
      const groupDeleteConfirm: GroupDeleteConfirmState = {
        groupIds: ["group-1"],
        childIds: ["child-1"],
        otherNodeIds: [],
        edgeIds: [],
      };

      render(
        <ReactFlowDialogs
          {...defaultProps}
          groupDeleteConfirm={groupDeleteConfirm}
          onGroupDeleteCancel={onGroupDeleteCancel}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(onGroupDeleteCancel).toHaveBeenCalled();
    });
  });

  describe("TeleportNameDialog integration", () => {
    it("should not render TeleportNameDialog when teleportNamePrompt is null", () => {
      render(<ReactFlowDialogs {...defaultProps} teleportNamePrompt={null} />);
      // TeleportNameDialog specific content should not be visible
      expect(
        screen.queryByText(/New Output Connector/i),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/New Input Connector/i),
      ).not.toBeInTheDocument();
    });

    it("should render TeleportNameDialog for teleportOut type", () => {
      const teleportNamePrompt: TeleportNamePromptState = {
        type: "teleportOut",
        position: { x: 100, y: 200 },
      };

      render(
        <ReactFlowDialogs
          {...defaultProps}
          teleportNamePrompt={teleportNamePrompt}
        />,
      );

      // TeleportNameDialog shows "New Output Connector" for teleportOut
      expect(screen.getByText("New Output Connector")).toBeInTheDocument();
    });

    it("should render TeleportNameDialog for teleportIn type", () => {
      const teleportNamePrompt: TeleportNamePromptState = {
        type: "teleportIn",
        position: { x: 100, y: 200 },
      };

      render(
        <ReactFlowDialogs
          {...defaultProps}
          teleportNamePrompt={teleportNamePrompt}
        />,
      );

      // TeleportNameDialog shows "New Input Connector" for teleportIn
      expect(screen.getByText("New Input Connector")).toBeInTheDocument();
    });
  });

  describe("multiple dialogs state", () => {
    it("should render no dialogs when all states are null", () => {
      render(<ReactFlowDialogs {...defaultProps} />);

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should handle both deleteConfirm and teleportNamePrompt simultaneously", () => {
      const deleteConfirm: DeleteConfirmState = {
        nodeIds: ["node-1"],
        edgeIds: [],
        message: "Delete?",
      };
      const teleportNamePrompt: TeleportNamePromptState = {
        type: "teleportOut",
        position: { x: 0, y: 0 },
      };

      render(
        <ReactFlowDialogs
          {...defaultProps}
          deleteConfirm={deleteConfirm}
          teleportNamePrompt={teleportNamePrompt}
        />,
      );

      // Both dialogs should be rendered
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      expect(screen.getByText("New Output Connector")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle empty message in deleteConfirm", () => {
      const deleteConfirm: DeleteConfirmState = {
        nodeIds: [],
        edgeIds: [],
        message: "",
      };

      render(
        <ReactFlowDialogs {...defaultProps} deleteConfirm={deleteConfirm} />,
      );

      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      expect(screen.getByText("Delete Selection")).toBeInTheDocument();
    });

    it("should handle empty arrays in groupDeleteConfirm", () => {
      const groupDeleteConfirm: GroupDeleteConfirmState = {
        groupIds: [],
        childIds: [],
        otherNodeIds: [],
        edgeIds: [],
      };

      render(
        <ReactFlowDialogs
          {...defaultProps}
          groupDeleteConfirm={groupDeleteConfirm}
        />,
      );

      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });
  });
});
