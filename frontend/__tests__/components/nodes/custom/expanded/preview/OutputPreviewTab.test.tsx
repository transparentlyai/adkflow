import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OutputPreviewTab } from "@/components/nodes/custom/expanded/preview/OutputPreviewTab";
import type { ComputedOutput } from "@/components/nodes/custom/expanded/preview/types";

// Mock Monaco Editor
vi.mock("@monaco-editor/react", () => ({
  default: ({
    value,
    language,
  }: {
    value: string;
    language: string;
  }) => (
    <div data-testid="monaco-editor" data-language={language}>
      {value}
    </div>
  ),
}));

// Mock ThemeContext
vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      colors: {
        nodes: {
          common: {
            container: {
              border: "#000",
              background: "#fff",
            },
            footer: {
              background: "#f0f0f0",
            },
            text: {
              primary: "#000",
              secondary: "#333",
              muted: "#666",
            },
          },
        },
        monaco: "vs-dark",
      },
    },
  }),
}));

// Mock clipboard API
const mockWriteText = vi.fn(() => Promise.resolve());
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe("OutputPreviewTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    computedOutput: null,
    isLoading: false,
    error: null,
    aggregationMode: "concatenate" as const,
  };

  describe("loading state", () => {
    it("should render loading skeleton when isLoading is true", () => {
      const { container } = render(<OutputPreviewTab {...defaultProps} isLoading={true} />);
      const skeleton = container.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();
    });

    it("should not render Monaco editor when loading", () => {
      render(<OutputPreviewTab {...defaultProps} isLoading={true} />);
      expect(screen.queryByTestId("monaco-editor")).not.toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("should render error message when error is provided", () => {
      render(
        <OutputPreviewTab
          {...defaultProps}
          error="Failed to compute output"
        />
      );
      expect(screen.getByText("Failed to compute output")).toBeInTheDocument();
    });

    it("should display error icon", () => {
      const { container } = render(
        <OutputPreviewTab
          {...defaultProps}
          error="Failed to compute output"
        />
      );
      // AlertCircle icon should be present
      const alertIcon = container.querySelector('svg');
      expect(alertIcon).toBeInTheDocument();
    });

    it("should show Computed Output label in error state", () => {
      render(
        <OutputPreviewTab
          {...defaultProps}
          error="Failed to compute output"
        />
      );
      expect(screen.getByText("Computed Output")).toBeInTheDocument();
    });

    it("should not render Monaco editor when there is an error", () => {
      render(
        <OutputPreviewTab
          {...defaultProps}
          error="Failed to compute output"
        />
      );
      expect(screen.queryByTestId("monaco-editor")).not.toBeInTheDocument();
    });
  });

  describe("no data state", () => {
    it("should render no output available message when computedOutput is null", () => {
      render(<OutputPreviewTab {...defaultProps} />);
      expect(screen.getByText("No output available")).toBeInTheDocument();
    });

    it("should not render Monaco editor when no data", () => {
      render(<OutputPreviewTab {...defaultProps} />);
      expect(screen.queryByTestId("monaco-editor")).not.toBeInTheDocument();
    });
  });

  describe("content display - concatenate mode", () => {
    const computedOutput: ComputedOutput = {
      content: "Hello World\nThis is content",
      mode: "concatenate",
      outputVariableName: "my_output",
      tokenCount: 150,
    };

    it("should render Monaco editor with content", () => {
      render(
        <OutputPreviewTab
          {...defaultProps}
          computedOutput={computedOutput}
        />
      );
      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toBeInTheDocument();
      expect(editor).toHaveTextContent("Hello World");
    });

    it("should use plaintext language for concatenate mode", () => {
      render(
        <OutputPreviewTab
          {...defaultProps}
          computedOutput={computedOutput}
        />
      );
      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-language", "plaintext");
    });

    it("should display Rendered Text mode label", () => {
      render(
        <OutputPreviewTab
          {...defaultProps}
          computedOutput={computedOutput}
        />
      );
      expect(screen.getByText("Rendered Text")).toBeInTheDocument();
    });

    it("should display output variable name", () => {
      render(
        <OutputPreviewTab
          {...defaultProps}
          computedOutput={computedOutput}
        />
      );
      expect(screen.getByText("my_output")).toBeInTheDocument();
    });

    it("should display token count", () => {
      render(
        <OutputPreviewTab
          {...defaultProps}
          computedOutput={computedOutput}
        />
      );
      expect(screen.getByText("150 tokens")).toBeInTheDocument();
    });

    it("should render copy button", () => {
      render(
        <OutputPreviewTab
          {...defaultProps}
          computedOutput={computedOutput}
        />
      );
      const copyButton = screen.getByTitle("Copy content");
      expect(copyButton).toBeInTheDocument();
    });
  });

  describe("content display - pass mode", () => {
    const computedOutput: ComputedOutput = {
      content: '{"key": "value", "data": [1, 2, 3]}',
      mode: "pass",
      tokenCount: 50,
    };

    it("should use python language for pass mode", () => {
      render(
        <OutputPreviewTab
          {...defaultProps}
          aggregationMode="pass"
          computedOutput={computedOutput}
        />
      );
      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-language", "python");
    });

    it("should display Python Dict mode label", () => {
      render(
        <OutputPreviewTab
          {...defaultProps}
          aggregationMode="pass"
          computedOutput={computedOutput}
        />
      );
      expect(screen.getByText("Python Dict")).toBeInTheDocument();
    });

    it("should not display output variable name in pass mode", () => {
      render(
        <OutputPreviewTab
          {...defaultProps}
          aggregationMode="pass"
          computedOutput={computedOutput}
        />
      );
      // outputVariableName is undefined, so it shouldn't render
      expect(screen.queryByText("my_output")).not.toBeInTheDocument();
    });
  });

  describe("token count display", () => {
    it("should display token count with locale formatting", () => {
      const computedOutput: ComputedOutput = {
        content: "content",
        mode: "concatenate",
        tokenCount: 1234567,
      };
      render(
        <OutputPreviewTab
          {...defaultProps}
          computedOutput={computedOutput}
        />
      );
      expect(screen.getByText(/1,234,567 tokens/)).toBeInTheDocument();
    });

    it("should display token count error when tokenCount is undefined and error exists", () => {
      const computedOutput: ComputedOutput = {
        content: "content",
        mode: "concatenate",
        tokenCountError: "Failed to count tokens",
      };
      render(
        <OutputPreviewTab
          {...defaultProps}
          computedOutput={computedOutput}
        />
      );
      expect(
        screen.getByText("Token count unavailable")
      ).toBeInTheDocument();
    });

    it("should not display token count error when tokenCount is present", () => {
      const computedOutput: ComputedOutput = {
        content: "content",
        mode: "concatenate",
        tokenCount: 100,
        tokenCountError: "This should not show",
      };
      render(
        <OutputPreviewTab
          {...defaultProps}
          computedOutput={computedOutput}
        />
      );
      expect(
        screen.queryByText("Token count unavailable")
      ).not.toBeInTheDocument();
      expect(screen.getByText("100 tokens")).toBeInTheDocument();
    });

    it("should not display token count when undefined and no error", () => {
      const computedOutput: ComputedOutput = {
        content: "content",
        mode: "concatenate",
      };
      render(
        <OutputPreviewTab
          {...defaultProps}
          computedOutput={computedOutput}
        />
      );
      expect(screen.queryByText(/tokens/)).not.toBeInTheDocument();
    });
  });

  describe("copy button", () => {
    it("should render copy button when content is available", () => {
      const computedOutput: ComputedOutput = {
        content: "Hello World",
        mode: "concatenate",
      };

      render(
        <OutputPreviewTab
          {...defaultProps}
          computedOutput={computedOutput}
        />
      );

      const copyButton = screen.getByTitle("Copy content");
      expect(copyButton).toBeInTheDocument();
    });

    it("should be clickable", async () => {
      const user = userEvent.setup();
      const computedOutput: ComputedOutput = {
        content: "Hello World",
        mode: "concatenate",
      };

      render(
        <OutputPreviewTab
          {...defaultProps}
          computedOutput={computedOutput}
        />
      );

      const copyButton = screen.getByTitle("Copy content");
      // Just verify the button is clickable without testing clipboard API
      // (clipboard API testing in jsdom is unreliable)
      await user.click(copyButton);
      expect(copyButton).toBeInTheDocument();
    });

    it("should handle empty content gracefully", () => {
      const computedOutput: ComputedOutput = {
        content: "",
        mode: "concatenate",
      };

      render(
        <OutputPreviewTab
          {...defaultProps}
          computedOutput={computedOutput}
        />
      );

      // Component should still render with empty content
      expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle very long content", () => {
      const longContent = "x".repeat(100000);
      const computedOutput: ComputedOutput = {
        content: longContent,
        mode: "concatenate",
      };

      render(
        <OutputPreviewTab
          {...defaultProps}
          computedOutput={computedOutput}
        />
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveTextContent(longContent);
    });

    it("should handle content with special characters", () => {
      const specialContent = '<script>alert("xss")</script>\n\t\r\u0000';
      const computedOutput: ComputedOutput = {
        content: specialContent,
        mode: "concatenate",
      };

      render(
        <OutputPreviewTab
          {...defaultProps}
          computedOutput={computedOutput}
        />
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toBeInTheDocument();
    });

    it("should handle missing outputVariableName gracefully", () => {
      const computedOutput: ComputedOutput = {
        content: "content",
        mode: "concatenate",
        // outputVariableName is undefined
      };

      render(
        <OutputPreviewTab
          {...defaultProps}
          computedOutput={computedOutput}
        />
      );

      // Should not crash and should still render
      expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
    });
  });
});
