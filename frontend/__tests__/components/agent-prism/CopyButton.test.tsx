import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { CopyButton } from "@/components/agent-prism/CopyButton";

describe("CopyButton", () => {
  const originalClipboard = navigator.clipboard;

  afterEach(() => {
    // @ts-expect-error restoring clipboard
    navigator.clipboard = originalClipboard;
    vi.clearAllMocks();
  });

  it("should render copy button with aria-label", () => {
    render(<CopyButton label="content" content="test" />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Copy content",
    );
  });

  it("should copy content to clipboard on click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<CopyButton label="test" content="Hello World" />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("Hello World");
    });
  });

  it("should show success state after copying", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<CopyButton label="test" content="content" />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-label",
        "test Copied",
      );
    });
  });

  it("should show error state when clipboard API fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Failed"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<CopyButton label="data" content="content" />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-label",
        "Failed to copy data",
      );
    });
  });

  it("should show error state when clipboard API not supported", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    render(<CopyButton label="test" content="content" />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-label",
        "Failed to copy test",
      );
    });
  });

  it("should be disabled during copy operation", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<CopyButton label="test" content="content" />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  it("should use ghost variant for IconButton", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<CopyButton label="test" content="content" />);
    // Ghost variant doesn't have border class
    expect(screen.getByRole("button")).not.toHaveClass("border");
  });
});
