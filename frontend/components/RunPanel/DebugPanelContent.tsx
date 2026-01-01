"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Loader2,
  Radio,
  Wrench,
  Settings,
  MessageSquare,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type {
  CategoryInfo,
  LoggingConfig,
  LoggingConfigUpdate,
} from "@/lib/api";

type LogLevel = "DEBUG" | "INFO" | "WARNING" | "ERROR";

const LOG_LEVELS: LogLevel[] = ["DEBUG", "INFO", "WARNING", "ERROR"];

const LEVEL_COLORS: Record<LogLevel, string> = {
  DEBUG: "text-gray-400",
  INFO: "text-blue-400",
  WARNING: "text-yellow-400",
  ERROR: "text-red-400",
};

// ADK debugging categories with their display names and icons
export const ADK_DEBUG_CATEGORIES = [
  {
    id: "api",
    name: "API Requests",
    description: "LLM API calls & responses",
    icon: Radio,
    categories: ["api.request", "api.response"],
  },
  {
    id: "tool",
    name: "Tool Execution",
    description: "Tool calls & results",
    icon: Wrench,
    categories: ["runner.tool"],
  },
  {
    id: "agent",
    name: "Agent Config",
    description: "Agent creation & setup",
    icon: Settings,
    categories: ["runner.agent.config"],
  },
  {
    id: "workflow",
    name: "Workflow",
    description: "Workflow execution flow",
    icon: MessageSquare,
    categories: ["runner.workflow"],
  },
] as const;

interface CategoryNode {
  name: string;
  displayName: string;
  level: LogLevel;
  children: CategoryNode[];
  depth: number;
}

/**
 * Build a hierarchical tree from flat category list.
 */
function buildCategoryTree(
  categories: CategoryInfo[],
  categoryLevels: Record<string, string>,
): CategoryNode[] {
  const nodeMap = new Map<string, CategoryNode>();

  for (const cat of categories) {
    const parts = cat.name.split(".");
    const displayName = parts[parts.length - 1];
    const level = (categoryLevels[cat.name] || cat.level || "INFO") as LogLevel;

    nodeMap.set(cat.name, {
      name: cat.name,
      displayName,
      level,
      children: [],
      depth: parts.length - 1,
    });
  }

  const roots: CategoryNode[] = [];

  for (const cat of categories) {
    const node = nodeMap.get(cat.name)!;
    const parts = cat.name.split(".");

    if (parts.length === 1) {
      roots.push(node);
    } else {
      const parentName = parts.slice(0, -1).join(".");
      const parent = nodeMap.get(parentName);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
  }

  const sortNodes = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.displayName.localeCompare(b.displayName));
    for (const node of nodes) {
      sortNodes(node.children);
    }
  };
  sortNodes(roots);

  return roots;
}

interface LevelSelectorProps {
  value: LogLevel;
  onChange: (level: LogLevel) => void;
  disabled?: boolean;
}

function LevelSelector({ value, onChange, disabled }: LevelSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "text-xs px-2 py-0.5 rounded hover:bg-accent",
          LEVEL_COLORS[value],
          disabled && "opacity-50 pointer-events-none",
        )}
        disabled={disabled}
      >
        {value}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => onChange(v as LogLevel)}
        >
          {LOG_LEVELS.map((level) => (
            <DropdownMenuRadioItem
              key={level}
              value={level}
              className={cn("text-xs", LEVEL_COLORS[level])}
            >
              {level}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface CategoryItemProps {
  node: CategoryNode;
  expanded: Set<string>;
  onToggle: (name: string) => void;
  onLevelChange: (name: string, level: LogLevel) => void;
  disabled?: boolean;
}

function CategoryItem({
  node,
  expanded,
  onToggle,
  onLevelChange,
  disabled,
}: CategoryItemProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.name);

  return (
    <div>
      <div
        className="flex items-center gap-1 py-1 px-2 hover:bg-accent rounded-sm"
        style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.name)}
            className="p-0.5 hover:bg-accent-foreground/10 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span className="flex-1 text-xs text-foreground truncate">
          {node.displayName}
        </span>
        <LevelSelector
          value={node.level}
          onChange={(level) => onLevelChange(node.name, level)}
          disabled={disabled}
        />
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <CategoryItem
              key={child.name}
              node={child}
              expanded={expanded}
              onToggle={onToggle}
              onLevelChange={onLevelChange}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface AdkDebugToggleProps {
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  categories: readonly string[];
  categoryLevels: Record<string, string>;
  onToggle: (categories: readonly string[], enabled: boolean) => void;
  disabled?: boolean;
}

function AdkDebugToggle({
  name,
  description,
  icon: Icon,
  categories,
  categoryLevels,
  onToggle,
  disabled,
}: AdkDebugToggleProps) {
  const isEnabled = categories.some((cat) => {
    const level = categoryLevels[cat];
    return level === "DEBUG";
  });

  return (
    <button
      onClick={() => onToggle(categories, !isEnabled)}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 w-full px-2 py-1.5 rounded-sm text-left",
        "hover:bg-accent transition-colors",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center w-5 h-5 rounded",
          isEnabled
            ? "bg-blue-500/20 text-blue-400"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-3 w-3" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-foreground">{name}</div>
        <div className="text-[10px] text-muted-foreground truncate">
          {description}
        </div>
      </div>
      <div
        className={cn(
          "w-8 h-4 rounded-full transition-colors relative",
          isEnabled ? "bg-blue-500" : "bg-muted",
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform",
            isEnabled ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </div>
    </button>
  );
}

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
      // Pending state is cleared by the useEffect when config updates
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetConfig();
      // Also clear pending changes
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
