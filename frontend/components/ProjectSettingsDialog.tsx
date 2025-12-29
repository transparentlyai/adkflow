"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ExternalLink, Loader2, ChevronDown } from "lucide-react";
import { loadProjectSettings, saveProjectSettings } from "@/lib/api";
import type {
  ProjectSettings,
  ProjectEnvSettings,
  ProjectEnvSettingsUpdate,
} from "@/lib/types";
import {
  getProjectSettingsModels,
  DEFAULT_MODEL,
} from "@/lib/constants/models";

interface ProjectSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectPath: string | null;
}

const PROJECT_MODELS = getProjectSettingsModels();

const VERTEX_LOCATIONS = [
  "us-central1",
  "us-east1",
  "us-west1",
  "europe-west1",
  "europe-west4",
  "asia-northeast1",
  "asia-southeast1",
];

export default function ProjectSettingsDialog({
  open,
  onOpenChange,
  projectPath,
}: ProjectSettingsDialogProps) {
  // Form state
  const [authMode, setAuthMode] = useState<"api_key" | "vertex_ai">("api_key");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasExistingApiKey, setHasExistingApiKey] = useState(false);
  const [apiKeyMasked, setApiKeyMasked] = useState<string | null>(null);
  const [googleCloudProject, setGoogleCloudProject] = useState("");
  const [googleCloudLocation, setGoogleCloudLocation] = useState("us-central1");
  const [defaultModel, setDefaultModel] = useState(DEFAULT_MODEL);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authExpanded, setAuthExpanded] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!projectPath) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await loadProjectSettings(projectPath);

      setDefaultModel(response.settings.defaultModel || DEFAULT_MODEL);
      setAuthMode(response.env.authMode);
      setHasExistingApiKey(response.env.hasApiKey);
      setApiKeyMasked(response.env.apiKeyMasked || null);
      setApiKey("");
      setGoogleCloudProject(response.env.googleCloudProject || "");
      setGoogleCloudLocation(response.env.googleCloudLocation || "us-central1");

      // Auto-expand if auth is configured
      setAuthExpanded(
        response.env.hasApiKey || !!response.env.googleCloudProject,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  // Load settings when dialog opens
  useEffect(() => {
    if (open && projectPath) {
      loadSettings();
    }
  }, [open, projectPath, loadSettings]);

  const handleSave = async () => {
    if (!projectPath) return;

    setIsSaving(true);
    setError(null);

    try {
      const settings: ProjectSettings = { defaultModel };
      const env: ProjectEnvSettingsUpdate = {
        authMode,
        apiKey: apiKey || undefined,
        googleCloudProject: googleCloudProject || undefined,
        googleCloudLocation: googleCloudLocation || undefined,
      };

      await saveProjectSettings(projectPath, settings, env);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const getAuthSummary = () => {
    if (authMode === "api_key") {
      return hasExistingApiKey
        ? `API Key (${apiKeyMasked || "configured"})`
        : "API Key (not set)";
    }
    return googleCloudProject
      ? `Vertex AI (${googleCloudProject})`
      : "Vertex AI (not configured)";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {error && (
              <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Authentication Section - Progressive Disclosure */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setAuthExpanded(!authExpanded)}
                className="flex items-center justify-between w-full text-left"
              >
                <div>
                  <Label className="text-sm font-medium cursor-pointer">
                    Authentication
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {getAuthSummary()}
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    authExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              {authExpanded && (
                <div className="space-y-3 pt-2 pl-1 border-l-2 border-muted ml-1">
                  {/* Auth Mode Select */}
                  <div className="space-y-1 pl-3">
                    <Label htmlFor="authMode" className="text-xs">
                      Mode
                    </Label>
                    <select
                      id="authMode"
                      value={authMode}
                      onChange={(e) =>
                        setAuthMode(e.target.value as "api_key" | "vertex_ai")
                      }
                      className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="api_key">Google AI (API Key)</option>
                      <option value="vertex_ai">Vertex AI</option>
                    </select>
                  </div>

                  {/* Auth-specific fields */}
                  {authMode === "api_key" ? (
                    <div className="space-y-2 pl-3">
                      <div className="space-y-1">
                        <Label htmlFor="apiKey" className="text-xs">
                          API Key
                        </Label>
                        <div className="relative">
                          <Input
                            id="apiKey"
                            type={showApiKey ? "text" : "password"}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={
                              hasExistingApiKey
                                ? apiKeyMasked || "••••••••"
                                : "Enter API key"
                            }
                            className="h-8 pr-8 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showApiKey ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        {hasExistingApiKey && !apiKey && (
                          <p className="text-[10px] text-muted-foreground">
                            Leave empty to keep existing
                          </p>
                        )}
                      </div>
                      <a
                        href="https://aistudio.google.com/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Get API key <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-2 pl-3">
                      <div className="space-y-1">
                        <Label htmlFor="googleCloudProject" className="text-xs">
                          Project ID
                        </Label>
                        <Input
                          id="googleCloudProject"
                          value={googleCloudProject}
                          onChange={(e) =>
                            setGoogleCloudProject(e.target.value)
                          }
                          placeholder="my-gcp-project"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor="googleCloudLocation"
                          className="text-xs"
                        >
                          Location
                        </Label>
                        <select
                          id="googleCloudLocation"
                          value={googleCloudLocation}
                          onChange={(e) =>
                            setGoogleCloudLocation(e.target.value)
                          }
                          className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          {VERTEX_LOCATIONS.map((loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Model Section - Compact */}
            <div className="space-y-1">
              <Label htmlFor="defaultModel" className="text-sm font-medium">
                Default Model
              </Label>
              <select
                id="defaultModel"
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {PROJECT_MODELS.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Used when creating new agents
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isLoading || isSaving}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
