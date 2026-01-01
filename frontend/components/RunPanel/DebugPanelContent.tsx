"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Loader2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type {
  CategoryInfo,
  LoggingConfig,
  LoggingConfigUpdate,
} from "@/lib/api";
import type { LogLevel } from "./debugPanelUtils";
import { ADK_DEBUG_CATEGORIES, buildCategoryTree } from "./debugPanelUtils";
import {
  LevelSelector,
  CategoryItem,
  AdkDebugToggle,
} from "./DebugPanelControls";

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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Pending changes (local state before save)
  const [pendingGlobalLevel, setPendingGlobalLevel] = useState<LogLevel | null>(
    null,
  );
  const [pendingCategories, setPendingCategories] = useState<
    Record<string, string>
  >({});

  // Reset pending changes when config changes from server
  useEffect(() => {
    setPendingGlobalLevel(null);
    setPendingCategories({});
  }, [config]);

  // Compute effective values (pending or saved)
  const effectiveGlobalLevel =
    pendingGlobalLevel ?? ((config?.globalLevel || "INFO") as LogLevel);
  const effectiveCategoryLevels = useMemo(() => {
    return { ...(config?.categories || {}), ...pendingCategories };
  }, [config?.categories, pendingCategories]);

  // Check if there are unsaved changes
  const hasChanges =
    pendingGlobalLevel !== null || Object.keys(pendingCategories).length > 0;

  const handleToggle = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleGlobalLevelChange = (level: LogLevel) => {
    setPendingGlobalLevel(level);
  };

  const handleCategoryLevelChange = (name: string, level: LogLevel) => {
    setPendingCategories((prev) => ({ ...prev, [name]: level }));
  };

  const handleAdkToggle = (
    categoryNames: readonly string[],
    enabled: boolean,
  ) => {
    const level = enabled ? "DEBUG" : "INFO";
    setPendingCategories((prev) => {
      const next = { ...prev };
      for (const cat of categoryNames) {
        next[cat] = level;
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      const update: LoggingConfigUpdate = {};
      if (pendingGlobalLevel !== null) {
        update.globalLevel = pendingGlobalLevel;
      }
      if (Object.keys(pendingCategories).length > 0) {
        update.categories = pendingCategories;
      }
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
    } finally {
      setIsResetting(false);
    }
  };

  const categoryTree = buildCategoryTree(categories, effectiveCategoryLevels);

  return (
    <>
      {/* Header */}
      {showHeader && (
        <>
          <div className="flex items-center justify-between px-2 py-1.5 pr-12">
            <span className="text-sm font-medium">Debug Settings</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={handleReset}
                disabled={isLoading || isResetting || isSaving}
                title="Reset to defaults"
              >
                {isResetting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RotateCcw className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant={hasChanges ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-6 px-2 text-xs",
                  hasChanges
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "text-muted-foreground",
                )}
                onClick={handleSave}
                disabled={isLoading || isSaving || !hasChanges}
                title={hasChanges ? "Save changes" : "No changes to save"}
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
          <div className="h-px bg-border my-1" />
        </>
      )}

      {/* Error display */}
      {error && (
        <div className="px-2 py-1.5 text-xs text-red-400 bg-red-400/10 rounded mx-1 mb-1">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && !config ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Global Level */}
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs text-muted-foreground">Global Level</span>
            <LevelSelector
              value={effectiveGlobalLevel}
              onChange={handleGlobalLevelChange}
              disabled={isLoading || isSaving}
            />
          </div>

          <div className="h-px bg-border my-1" />

          {/* ADK Debugging Section */}
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            ADK Debugging
          </div>
          <div className="py-1 space-y-0.5">
            {ADK_DEBUG_CATEGORIES.map((cat) => (
              <AdkDebugToggle
                key={cat.id}
                name={cat.name}
                description={cat.description}
                icon={cat.icon}
                categories={cat.categories}
                categoryLevels={effectiveCategoryLevels}
                onToggle={handleAdkToggle}
                disabled={isLoading || isSaving}
              />
            ))}
          </div>

          <div className="h-px bg-border my-1" />

          {/* Advanced Categories Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 w-full px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-sm"
          >
            {showAdvanced ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <span>All Categories</span>
            <span className="ml-auto text-[10px] opacity-60">
              {categories.length} registered
            </span>
          </button>

          {/* Categories (Advanced) */}
          {showAdvanced && (
            <ScrollArea className="max-h-48">
              {categoryTree.length === 0 ? (
                <div className="px-2 py-2 text-xs text-muted-foreground text-center">
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
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </>
      )}
    </>
  );
}

export default DebugPanelContent;
