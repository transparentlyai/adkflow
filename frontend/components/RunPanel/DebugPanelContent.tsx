"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { RotateCcw, Loader2, Save, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type {
  CategoryInfo,
  LoggingConfig,
  LoggingConfigUpdate,
} from "@/lib/api";
import type { LogLevel } from "./debugPanelUtils";
import { LOGGING_PRESETS, buildCategoryTree } from "./debugPanelUtils";
import { LevelSelector, CategoryItem, PresetCard } from "./DebugPanelControls";

export interface DebugPanelContentProps {
  isLoading: boolean;
  error: string | null;
  config: LoggingConfig | null;
  categories: CategoryInfo[];
  updateConfig: (update: LoggingConfigUpdate) => Promise<void>;
  resetConfig: () => Promise<void>;
  showHeader?: boolean;
}

export function DebugPanelContent({
  isLoading,
  error,
  config,
  categories,
  updateConfig,
  resetConfig,
  showHeader = true,
}: DebugPanelContentProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isResetting, setIsResetting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Pending changes (local state before save)
  const [pendingGlobalLevel, setPendingGlobalLevel] = useState<LogLevel | null>(
    null,
  );
  const [pendingCategories, setPendingCategories] = useState<
    Record<string, string>
  >({});
  const [categoriesToRemove, setCategoriesToRemove] = useState<Set<string>>(
    new Set(),
  );

  // Reset pending changes when config changes from server
  useEffect(() => {
    setPendingGlobalLevel(null);
    setPendingCategories({});
    setCategoriesToRemove(new Set());
  }, [config]);

  // Compute effective values (pending or saved)
  const effectiveGlobalLevel =
    pendingGlobalLevel ?? ((config?.globalLevel || "INFO") as LogLevel);

  const effectiveCategoryLevels = useMemo(() => {
    const base = { ...(config?.categories || {}) };
    for (const cat of categoriesToRemove) {
      delete base[cat];
    }
    return { ...base, ...pendingCategories };
  }, [config?.categories, pendingCategories, categoriesToRemove]);

  const hasChanges =
    pendingGlobalLevel !== null ||
    Object.keys(pendingCategories).length > 0 ||
    categoriesToRemove.size > 0;

  const handleToggle = useCallback((name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const handleGlobalLevelChange = useCallback((level: LogLevel | "inherit") => {
    if (level !== "inherit") {
      setPendingGlobalLevel(level);
    }
  }, []);

  const handleCategoryLevelChange = useCallback(
    (name: string, level: LogLevel | "inherit") => {
      if (level === "inherit") {
        setCategoriesToRemove((prev) => new Set([...prev, name]));
        setPendingCategories((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      } else {
        setCategoriesToRemove((prev) => {
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
        setPendingCategories((prev) => ({ ...prev, [name]: level }));
      }
    },
    [],
  );

  const handlePresetApply = useCallback(
    (presetId: string) => {
      const preset = LOGGING_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;

      const newCategories = preset.apply(categories);
      const allCategoryNames = categories.map((c) => c.name);
      setCategoriesToRemove(new Set(allCategoryNames));
      setPendingCategories(newCategories);

      if (presetId === "production") {
        setPendingGlobalLevel("WARNING");
      } else if (presetId === "debug-all") {
        setPendingGlobalLevel("DEBUG");
      } else if (presetId === "silent") {
        setPendingGlobalLevel("OFF");
      }
    },
    [categories],
  );

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      const update: LoggingConfigUpdate = {};
      if (pendingGlobalLevel !== null) {
        update.globalLevel = pendingGlobalLevel;
      }

      const finalCategories: Record<string, string> = {
        ...(config?.categories || {}),
      };

      for (const cat of categoriesToRemove) {
        delete finalCategories[cat];
      }

      for (const [cat, level] of Object.entries(pendingCategories)) {
        finalCategories[cat] = level;
      }

      update.categories = finalCategories;
      await updateConfig(update);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetConfig();
      setPendingGlobalLevel(null);
      setPendingCategories({});
      setCategoriesToRemove(new Set());
    } finally {
      setIsResetting(false);
    }
  };

  const categoryTree = useMemo(
    () =>
      buildCategoryTree(
        categories,
        effectiveCategoryLevels,
        effectiveGlobalLevel,
      ),
    [categories, effectiveCategoryLevels, effectiveGlobalLevel],
  );

  return (
    <div className="flex flex-col">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between pl-3 pr-10 py-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Debug Settings</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={handleReset}
              disabled={isLoading || isResetting || isSaving}
              title="Reset to defaults"
            >
              {isResetting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              size="sm"
              className={cn(
                "h-7 px-2.5 text-xs gap-1.5",
                hasChanges
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted",
              )}
              onClick={handleSave}
              disabled={isLoading || isSaving || !hasChanges}
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mx-3 mt-2 px-2 py-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && !config ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-3">
          {/* Global Level */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-muted-foreground">
              Default Level
            </span>
            <LevelSelector
              value={effectiveGlobalLevel}
              onChange={handleGlobalLevelChange}
              disabled={isLoading || isSaving}
            />
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground px-1">
              Quick Presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              {LOGGING_PRESETS.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  onClick={() => handlePresetApply(preset.id)}
                  disabled={isLoading || isSaving}
                />
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-medium text-muted-foreground">
                Categories
              </span>
              <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                {categories.length} registered
              </span>
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/20 overflow-hidden">
              <ScrollArea className="max-h-52">
                {categoryTree.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                    No categories registered
                  </div>
                ) : (
                  <div className="py-1">
                    {categoryTree.map((node) => (
                      <CategoryItem
                        key={node.name}
                        node={node}
                        expanded={expanded}
                        onToggle={handleToggle}
                        onLevelChange={handleCategoryLevelChange}
                        disabled={isLoading || isSaving}
                        isRoot
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <p className="text-[10px] text-muted-foreground/50 px-1">
              Click to change • * = inherited from parent
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default DebugPanelContent;
