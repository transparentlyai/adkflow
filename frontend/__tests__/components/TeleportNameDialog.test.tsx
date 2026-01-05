import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import TeleportNameDialog from "@/components/TeleportNameDialog";
import type { Theme } from "@/lib/themes/types";

// Minimal theme mock
const mockTheme: Theme = {
  name: "test",
  colors: {
    nodes: {
      common: {
        container: {
          background: "#ffffff",
          border: "#e0e0e0",
        },
        header: {
          background: "#f0f0f0",
          border: "#d0d0d0",
        },
        footer: {
          background: "#f8f8f8",
        },
        text: {
          primary: "#000000",
          secondary: "#666666",
          link: "#0066cc",
        },
      },
      agent: {
        header: "#4f46e5",
        accent: "#6366f1",
        text: "#ffffff",
      },
      prompt: {
        header: "#059669",
        accent: "#10b981",
        text: "#ffffff",
      },
      context: {
        header: "#d97706",
        accent: "#f59e0b",
        text: "#ffffff",
      },
      variable: {
        header: "#7c3aed",
        accent: "#8b5cf6",
        text: "#ffffff",
      },
      tool: {
        header: "#dc2626",
        accent: "#ef4444",
        text: "#ffffff",
      },
      process: {
        header: "#db2777",
        accent: "#ec4899",
        text: "#ffffff",
      },
      start: {
        header: "#0891b2",
        accent: "#06b6d4",
        text: "#ffffff",
      },
      group: {
        background: "#fafafa",
        border: "#e5e7eb",
        header: "#f3f4f6",
      },
      label: {
        background: "#fffbeb",
        border: "#fcd34d",
        text: "#92400e",
      },
      inputProbe: {
        header: "#14b8a6",
        accent: "#2dd4bf",
        text: "#ffffff",
      },
      outputProbe: {
        header: "#f97316",
        accent: "#fb923c",
        text: "#ffffff",
      },
      logProbe: {
        header: "#6366f1",
        accent: "#818cf8",
        text: "#ffffff",
      },
      teleportOut: {
        header: "#8b5cf6",
        accent: "#a78bfa",
        text: "#ffffff",
      },
      teleportIn: {
        header: "#8b5cf6",
        accent: "#a78bfa",
        text: "#ffffff",
      },
      agentTool: {
        header: "#dc2626",
        accent: "#ef4444",
        text: "#ffffff",
      },
      end: {
        header: "#dc2626",
        accent: "#ef4444",
        text: "#ffffff",
      },
    },
  },
} as Theme;

describe("TeleportNameDialog", () => {
  const defaultProps = {
    type: "teleportOut" as const,
    value: "",
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    theme: mockTheme,
  };

  it("should render teleportOut title", () => {
    render(<TeleportNameDialog {...defaultProps} type="teleportOut" />);
    expect(screen.getByText("New Output Connector")).toBeInTheDocument();
  });

  it("should render teleportIn title", () => {
    render(<TeleportNameDialog {...defaultProps} type="teleportIn" />);
    expect(screen.getByText("New Input Connector")).toBeInTheDocument();
  });

  it("should render description", () => {
    render(<TeleportNameDialog {...defaultProps} />);
    expect(
      screen.getByText(/Enter a name for this connector/),
    ).toBeInTheDocument();
  });

  it("should display input value", () => {
    render(<TeleportNameDialog {...defaultProps} value="test-connector" />);
    expect(screen.getByDisplayValue("test-connector")).toBeInTheDocument();
  });

  it("should call onChange when input changes", () => {
    const onChange = vi.fn();
    render(<TeleportNameDialog {...defaultProps} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText("Connector name"), {
      target: { value: "my-connector" },
    });

    expect(onChange).toHaveBeenCalledWith("my-connector");
  });

  it("should call onSubmit when Create button is clicked", () => {
    const onSubmit = vi.fn();
    render(
      <TeleportNameDialog {...defaultProps} value="test" onSubmit={onSubmit} />,
    );

    fireEvent.click(screen.getByText("Create"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("should disable Create button when value is empty", () => {
    render(<TeleportNameDialog {...defaultProps} value="" />);
    expect(screen.getByText("Create")).toBeDisabled();
  });

  it("should enable Create button when value has content", () => {
    render(<TeleportNameDialog {...defaultProps} value="test" />);
    expect(screen.getByText("Create")).toBeEnabled();
  });

  it("should call onCancel when Cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<TeleportNameDialog {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByText("Cancel"));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("should call onCancel when backdrop is clicked", () => {
    const onCancel = vi.fn();
    const { container } = render(
      <TeleportNameDialog {...defaultProps} onCancel={onCancel} />,
    );

    // Click the backdrop (the overlay element)
    const backdrop = container.querySelector(".bg-black");
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("should call onSubmit when Enter is pressed with value", () => {
    const onSubmit = vi.fn();
    render(
      <TeleportNameDialog {...defaultProps} value="test" onSubmit={onSubmit} />,
    );

    fireEvent.keyDown(screen.getByPlaceholderText("Connector name"), {
      key: "Enter",
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("should not call onSubmit when Enter is pressed without value", () => {
    const onSubmit = vi.fn();
    render(
      <TeleportNameDialog {...defaultProps} value="" onSubmit={onSubmit} />,
    );

    fireEvent.keyDown(screen.getByPlaceholderText("Connector name"), {
      key: "Enter",
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("should call onCancel when Escape is pressed", () => {
    const onCancel = vi.fn();
    render(<TeleportNameDialog {...defaultProps} onCancel={onCancel} />);

    fireEvent.keyDown(screen.getByPlaceholderText("Connector name"), {
      key: "Escape",
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
