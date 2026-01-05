import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProjectSettingsDialog from "@/components/ProjectSettingsDialog";
import * as api from "@/lib/api";

// Mock API
vi.mock("@/lib/api", () => ({
  loadProjectSettings: vi.fn(),
  saveProjectSettings: vi.fn(),
}));

// Mock constants
vi.mock("@/lib/constants/models", () => ({
  getProjectSettingsModels: () => [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  ],
  DEFAULT_MODEL: "gemini-2.0-flash",
}));

vi.mock("@/lib/constants/modelSchemas", () => ({
  VERTEX_AI_LOCATIONS: [
    { value: "us-central1", label: "US Central" },
    { value: "europe-west1", label: "Europe West" },
  ],
}));

const mockLoadProjectSettings = api.loadProjectSettings as ReturnType<
  typeof vi.fn
>;
const mockSaveProjectSettings = api.saveProjectSettings as ReturnType<
  typeof vi.fn
>;

describe("ProjectSettingsDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    projectPath: "/test/project",
    onSaved: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadProjectSettings.mockResolvedValue({
      settings: { defaultModel: "gemini-2.0-flash" },
      env: {
        authMode: "api_key",
        hasApiKey: false,
        apiKeyMasked: null,
        googleCloudProject: "",
        googleCloudLocation: "us-central1",
      },
    });
    mockSaveProjectSettings.mockResolvedValue({});
  });

  describe("loading", () => {
    it("should show loading state", () => {
      mockLoadProjectSettings.mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );
      render(<ProjectSettingsDialog {...defaultProps} />);
      // Loading state is shown via spinner
    });

    it("should load settings on open", async () => {
      render(<ProjectSettingsDialog {...defaultProps} />);
      await waitFor(() => {
        expect(mockLoadProjectSettings).toHaveBeenCalledWith("/test/project");
      });
    });
  });

  describe("form fields", () => {
    it("should render location selector", async () => {
      render(<ProjectSettingsDialog {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByLabelText("Location")).toBeInTheDocument();
      });
    });

    it("should render model selector", async () => {
      render(<ProjectSettingsDialog {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByLabelText("Default Model")).toBeInTheDocument();
      });
    });

    it("should render auth section", async () => {
      render(<ProjectSettingsDialog {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText("Authentication")).toBeInTheDocument();
      });
    });
  });

  describe("save", () => {
    it("should save settings when save clicked", async () => {
      const user = userEvent.setup();
      const onSaved = vi.fn();
      render(<ProjectSettingsDialog {...defaultProps} onSaved={onSaved} />);

      await waitFor(() => {
        expect(screen.getByText("Save")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(mockSaveProjectSettings).toHaveBeenCalled();
        expect(onSaved).toHaveBeenCalled();
      });
    });

    it("should close dialog on save", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <ProjectSettingsDialog {...defaultProps} onOpenChange={onOpenChange} />,
      );

      await waitFor(() => {
        expect(screen.getByText("Save")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe("cancel", () => {
    it("should call onOpenChange when cancel clicked", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <ProjectSettingsDialog {...defaultProps} onOpenChange={onOpenChange} />,
      );

      await waitFor(() => {
        expect(screen.getByText("Cancel")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Cancel"));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("authentication section", () => {
    it("should expand auth section when clicked", async () => {
      const user = userEvent.setup();
      render(<ProjectSettingsDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Authentication")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Authentication"));

      await waitFor(() => {
        expect(screen.getByLabelText("Mode")).toBeInTheDocument();
      });
    });

    it("should show API key input when api_key mode selected", async () => {
      const user = userEvent.setup();
      render(<ProjectSettingsDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Authentication")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Authentication"));

      await waitFor(() => {
        expect(screen.getByLabelText("API Key")).toBeInTheDocument();
      });
    });

    it("should show existing API key status", async () => {
      mockLoadProjectSettings.mockResolvedValue({
        settings: { defaultModel: "gemini-2.0-flash" },
        env: {
          authMode: "api_key",
          hasApiKey: true,
          apiKeyMasked: "AIza...xyz",
          googleCloudProject: "",
          googleCloudLocation: "us-central1",
        },
      });

      render(<ProjectSettingsDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/AIza...xyz/)).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("should show error when load fails", async () => {
      mockLoadProjectSettings.mockRejectedValue(new Error("Load failed"));
      render(<ProjectSettingsDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Load failed")).toBeInTheDocument();
      });
    });

    it("should show error when save fails", async () => {
      const user = userEvent.setup();
      mockSaveProjectSettings.mockRejectedValue(new Error("Save failed"));

      render(<ProjectSettingsDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Save")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(screen.getByText("Save failed")).toBeInTheDocument();
      });
    });
  });

  describe("no project path", () => {
    it("should not load when no project path", () => {
      render(<ProjectSettingsDialog {...defaultProps} projectPath={null} />);
      expect(mockLoadProjectSettings).not.toHaveBeenCalled();
    });
  });

  describe("when closed", () => {
    it("should not render when not open", () => {
      render(<ProjectSettingsDialog {...defaultProps} open={false} />);
      expect(screen.queryByText("Project Settings")).not.toBeInTheDocument();
    });
  });
});
