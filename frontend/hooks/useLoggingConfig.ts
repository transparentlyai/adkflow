/**
 * Hook for managing logging configuration in dev mode
 *
 * This hook provides access to runtime logging configuration.
 * Only available when running in dev mode (./adkflow dev).
 * Settings are persisted to manifest.json under the "logging" key.
 */

import { useState, useEffect, useCallback } from "react";
import { useProject } from "@/contexts/ProjectContext";
import {
  isDebugModeAvailable,
  getLoggingConfig,
  updateLoggingConfig,
  getLoggingCategories,
  resetLoggingConfig,
  type LoggingConfig,
  type LoggingConfigUpdate,
  type CategoryInfo,
} from "@/lib/api";

export interface UseLoggingConfigResult {
  /** Whether debug mode is available (only in dev mode) */
  isDevMode: boolean;
  /** Whether the config is currently loading */
  isLoading: boolean;
  /** Any error that occurred */
  error: string | null;
  /** Current logging configuration */
  config: LoggingConfig | null;
  /** Available logging categories */
  categories: CategoryInfo[];
  /** Update logging configuration */
  updateConfig: (update: LoggingConfigUpdate) => Promise<void>;
  /** Reset configuration to defaults */
  resetConfig: () => Promise<void>;
  /** Refresh configuration from server */
  refresh: () => Promise<void>;
}

/**
 * Hook to manage logging configuration
 *
 * @example
 * ```tsx
 * const { isDevMode, config, updateConfig } = useLoggingConfig();
 *
 * if (!isDevMode) return null;
 *
 * return (
 *   <select
 *     value={config?.globalLevel}
 *     onChange={(e) => updateConfig({ globalLevel: e.target.value })}
 *   >
 *     <option value="DEBUG">DEBUG</option>
 *     <option value="INFO">INFO</option>
 *     <option value="WARNING">WARNING</option>
 *     <option value="ERROR">ERROR</option>
 *   </select>
 * );
 * ```
 */
export function useLoggingConfig(
  /** Optional project path override (useful when outside ProjectProvider) */
  projectPathOverride?: string | null,
): UseLoggingConfigResult {
  const { projectPath: contextProjectPath } = useProject();
  const projectPath = projectPathOverride ?? contextProjectPath;
  const [isDevMode, setIsDevMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<LoggingConfig | null>(null);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);

  // Check if debug mode is available on mount
  useEffect(() => {
    const checkDevMode = async () => {
      try {
        const available = await isDebugModeAvailable();
        setIsDevMode(available);

        if (available) {
          const [configData, categoriesData] = await Promise.all([
            getLoggingConfig(projectPath || undefined),
            getLoggingCategories(projectPath || undefined),
          ]);
          setConfig(configData);
          setCategories(categoriesData);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to check dev mode",
        );
      } finally {
        setIsLoading(false);
      }
    };

    checkDevMode();
  }, [projectPath]);

  const refresh = useCallback(async () => {
    if (!isDevMode) return;

    setIsLoading(true);
    setError(null);

    try {
      const [configData, categoriesData] = await Promise.all([
        getLoggingConfig(projectPath || undefined),
        getLoggingCategories(projectPath || undefined),
      ]);
      setConfig(configData);
      setCategories(categoriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh config");
    } finally {
      setIsLoading(false);
    }
  }, [isDevMode, projectPath]);

  const updateConfigHandler = useCallback(
    async (update: LoggingConfigUpdate) => {
      if (!isDevMode) return;

      setError(null);

      try {
        const newConfig = await updateLoggingConfig(
          update,
          projectPath || undefined,
        );
        setConfig(newConfig);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update config",
        );
        throw err;
      }
    },
    [isDevMode, projectPath],
  );

  const resetConfigHandler = useCallback(async () => {
    if (!isDevMode) return;

    setError(null);

    try {
      await resetLoggingConfig(projectPath || undefined);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset config");
      throw err;
    }
  }, [isDevMode, projectPath, refresh]);

  return {
    isDevMode,
    isLoading,
    error,
    config,
    categories,
    updateConfig: updateConfigHandler,
    resetConfig: resetConfigHandler,
    refresh,
  };
}

export default useLoggingConfig;
