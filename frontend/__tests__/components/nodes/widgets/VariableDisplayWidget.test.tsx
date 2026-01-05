import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import React from "react";
import VariableDisplayWidget from "@/components/nodes/widgets/VariableDisplayWidget";

// Mock the ThemeContext
vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      colors: {
        nodes: {
          common: {
            container: { background: "#1e1e1e", border: "#333" },
            text: { primary: "#fff", secondary: "#aaa", muted: "#666" },
          },
          variable: { header: "#10b981" },
        },
      },
    },
  }),
}));

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn(),
};
Object.assign(navigator, { clipboard: mockClipboard });

describe("VariableDisplayWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClipboard.writeText.mockResolvedValue(undefined);
  });

  describe("rendering", () => {
    it("should render variable name with braces", () => {
      render(<VariableDisplayWidget variableName="my_variable" />);

      expect(screen.getByText("{my_variable}")).toBeInTheDocument();
    });

    it("should render copy button", () => {
      render(<VariableDisplayWidget variableName="test" />);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("should have 'Copy to clipboard' title on button", () => {
      render(<VariableDisplayWidget variableName="test" />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("title", "Copy to clipboard");
    });

    it("should render copy icon initially", () => {
      const { container } = render(
        <VariableDisplayWidget variableName="test" />,
      );

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("should apply theme background color", () => {
      const { container } = render(
        <VariableDisplayWidget variableName="test" />,
      );

      const wrapper = container.querySelector(".flex");
      expect(wrapper).toHaveStyle({
        backgroundColor: "#1e1e1e",
      });
    });

    it("should apply theme border color", () => {
      const { container } = render(
        <VariableDisplayWidget variableName="test" />,
      );

      const wrapper = container.querySelector(".flex");
      expect(wrapper).toHaveStyle({
        borderColor: "#333",
      });
    });

    it("should apply variable header color to text", () => {
      const { container } = render(
        <VariableDisplayWidget variableName="test" />,
      );

      const wrapper = container.querySelector(".flex");
      expect(wrapper).toHaveStyle({
        color: "#10b981",
      });
    });

    it("should have mono font for code appearance", () => {
      const { container } = render(
        <VariableDisplayWidget variableName="test" />,
      );

      const wrapper = container.querySelector(".font-mono");
      expect(wrapper).toBeInTheDocument();
    });

    it("should have rounded border", () => {
      const { container } = render(
        <VariableDisplayWidget variableName="test" />,
      );

      const wrapper = container.querySelector(".rounded");
      expect(wrapper).toBeInTheDocument();
    });

    it("should have proper padding", () => {
      const { container } = render(
        <VariableDisplayWidget variableName="test" />,
      );

      const wrapper = container.querySelector(".px-3.py-2");
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe("copy functionality", () => {
    it("should copy variable with braces to clipboard when button clicked", async () => {
      render(<VariableDisplayWidget variableName="my_variable" />);

      const button = screen.getByRole("button");

      await act(async () => {
        fireEvent.click(button);
      });

      expect(mockClipboard.writeText).toHaveBeenCalledWith("{my_variable}");
    });

    it("should show check icon after successful copy", async () => {
      render(<VariableDisplayWidget variableName="test" />);

      const button = screen.getByRole("button");

      await act(async () => {
        fireEvent.click(button);
      });

      // Button title should change to "Copied!"
      await waitFor(() => {
        expect(button).toHaveAttribute("title", "Copied!");
      });
    });

    it("should revert to copy icon after 2 seconds", async () => {
      vi.useFakeTimers();

      render(<VariableDisplayWidget variableName="test" />);

      const button = screen.getByRole("button");

      await act(async () => {
        fireEvent.click(button);
      });

      expect(button).toHaveAttribute("title", "Copied!");

      // Advance timers
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(button).toHaveAttribute("title", "Copy to clipboard");

      vi.useRealTimers();
    });

    it("should handle clipboard error gracefully", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockClipboard.writeText.mockRejectedValue(new Error("Clipboard error"));

      render(<VariableDisplayWidget variableName="test" />);

      const button = screen.getByRole("button");

      await act(async () => {
        fireEvent.click(button);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Failed to copy to clipboard:",
          expect.any(Error),
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe("variable name handling", () => {
    it("should handle simple variable name", () => {
      render(<VariableDisplayWidget variableName="x" />);

      expect(screen.getByText("{x}")).toBeInTheDocument();
    });

    it("should handle snake_case variable name", () => {
      render(<VariableDisplayWidget variableName="my_long_variable_name" />);

      expect(screen.getByText("{my_long_variable_name}")).toBeInTheDocument();
    });

    it("should handle camelCase variable name", () => {
      render(<VariableDisplayWidget variableName="myVariableName" />);

      expect(screen.getByText("{myVariableName}")).toBeInTheDocument();
    });

    it("should handle variable name with numbers", () => {
      render(<VariableDisplayWidget variableName="var123" />);

      expect(screen.getByText("{var123}")).toBeInTheDocument();
    });

    it("should handle empty variable name", () => {
      render(<VariableDisplayWidget variableName="" />);

      expect(screen.getByText("{}")).toBeInTheDocument();
    });

    it("should handle variable name with dots", () => {
      render(<VariableDisplayWidget variableName="config.setting.value" />);

      expect(screen.getByText("{config.setting.value}")).toBeInTheDocument();
    });

    it("should handle variable name with special characters", () => {
      render(<VariableDisplayWidget variableName="user-input_data" />);

      expect(screen.getByText("{user-input_data}")).toBeInTheDocument();
    });
  });

  describe("truncation behavior", () => {
    it("should have truncate class for long names", () => {
      const { container } = render(
        <VariableDisplayWidget variableName="very_long_variable_name_that_should_be_truncated" />,
      );

      const textSpan = container.querySelector(".truncate");
      expect(textSpan).toBeInTheDocument();
    });

    it("should have flex-1 to allow text to take available space", () => {
      const { container } = render(
        <VariableDisplayWidget variableName="test" />,
      );

      const textSpan = container.querySelector(".flex-1");
      expect(textSpan).toBeInTheDocument();
    });
  });

  describe("button styling", () => {
    it("should have flex-shrink-0 to prevent button from shrinking", () => {
      const { container } = render(
        <VariableDisplayWidget variableName="test" />,
      );

      const button = screen.getByRole("button");
      expect(button).toHaveClass("flex-shrink-0");
    });

    it("should have hover styling", () => {
      const button = render(
        <VariableDisplayWidget variableName="test" />,
      ).container.querySelector("button");

      expect(button).toHaveClass("hover:bg-accent");
    });

    it("should have transition for smooth color change", () => {
      const button = render(
        <VariableDisplayWidget variableName="test" />,
      ).container.querySelector("button");

      expect(button).toHaveClass("transition-colors");
    });

    it("should have proper padding", () => {
      const button = render(
        <VariableDisplayWidget variableName="test" />,
      ).container.querySelector("button");

      expect(button).toHaveClass("p-1");
    });

    it("should apply muted color to copy icon", () => {
      const { container } = render(
        <VariableDisplayWidget variableName="test" />,
      );

      const svg = container.querySelector("svg");
      expect(svg).toHaveStyle({ color: "#666" });
    });
  });

  describe("accessibility", () => {
    it("should have button with accessible title", () => {
      render(<VariableDisplayWidget variableName="test" />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("title");
    });

    it("should update title when copied", async () => {
      render(<VariableDisplayWidget variableName="test" />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("title", "Copy to clipboard");

      await act(async () => {
        fireEvent.click(button);
      });

      await waitFor(() => {
        expect(button).toHaveAttribute("title", "Copied!");
      });
    });
  });

  describe("icon sizing", () => {
    it("should have w-4 h-4 size for icons", () => {
      const { container } = render(
        <VariableDisplayWidget variableName="test" />,
      );

      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("w-4", "h-4");
    });
  });
});
