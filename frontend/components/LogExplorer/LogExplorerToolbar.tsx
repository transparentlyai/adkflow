/**
 * LogExplorerToolbar - Filter controls for the log explorer
 *
 * Provides level filter, category filter with wildcards, search, and time range.
 */

import { useState, useRef, useEffect } from "react";
import { Search, X, Filter, Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import type { LogFilters } from "@/hooks/useLogExplorer";
import type { LogStats } from "@/lib/api";
import { LOG_LEVELS, LEVEL_STYLES, type LogLevel } from "./logExplorerUtils";

interface LogExplorerToolbarProps {
  filters: LogFilters;
  onFiltersChange: (filters: Partial<LogFilters>) => void;
  onResetFilters: () => void;
  stats: LogStats | null;
}

export function LogExplorerToolbar({
  filters,
  onFiltersChange,
  onResetFilters,
  stats,
}: LogExplorerToolbarProps) {
  // Parse selected levels from comma-separated string
  const selectedLevels = filters.level
    ? (filters.level.split(",") as LogLevel[])
    : [];

  // Category input state
  const [categoryInput, setCategoryInput] = useState(filters.category || "");
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const categoryContainerRef = useRef<HTMLDivElement>(null);

  // Time range state
  const [showTimeRange, setShowTimeRange] = useState(false);

  // Sync category input with filters
  useEffect(() => {
    setCategoryInput(filters.category || "");
  }, [filters.category]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        categoryContainerRef.current &&
        !categoryContainerRef.current.contains(e.target as Node)
      ) {
        setShowCategorySuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle a level in the filter
  const toggleLevel = (level: LogLevel) => {
    if (selectedLevels.includes(level)) {
      const newLevels = selectedLevels.filter((l) => l !== level);
      onFiltersChange({
        level: newLevels.length > 0 ? newLevels.join(",") : null,
      });
    } else {
      onFiltersChange({ level: [...selectedLevels, level].join(",") });
    }
  };

  // Get categories from stats for suggestions
  const allCategories = stats ? Object.keys(stats.categoryCounts).sort() : [];

  // Filter suggestions based on input
  const categorySuggestions = categoryInput
    ? allCategories.filter((cat) =>
        cat.toLowerCase().includes(categoryInput.toLowerCase()),
      )
    : allCategories;

  // Generate wildcard suggestions based on input
  const getWildcardSuggestions = (): string[] => {
    if (!categoryInput) return [];
    const suggestions: string[] = [];

    // If input contains a dot, suggest wildcards
    if (categoryInput.includes(".")) {
      const parts = categoryInput.split(".");
      const prefix = parts.slice(0, -1).join(".");
      if (!categoryInput.endsWith("*")) {
        suggestions.push(`${prefix}.*`);
        suggestions.push(`${prefix}.**`);
      }
    } else if (categoryInput.length > 0 && !categoryInput.includes("*")) {
      // Suggest adding wildcard
      suggestions.push(`${categoryInput}.*`);
      suggestions.push(`${categoryInput}.**`);
    }

    return suggestions.filter(
      (s) => !categorySuggestions.includes(s) && s !== categoryInput,
    );
  };

  const wildcardSuggestions = getWildcardSuggestions();

  // Apply category filter
  const applyCategory = (category: string) => {
    onFiltersChange({ category: category || null });
    setCategoryInput(category);
    setShowCategorySuggestions(false);
  };

  // Handle category input key down
  const handleCategoryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      applyCategory(categoryInput);
    } else if (e.key === "Escape") {
      setShowCategorySuggestions(false);
      categoryInputRef.current?.blur();
    }
  };

  // Format datetime for input
  const formatDateTimeLocal = (isoString: string | null): string => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };

  // Parse datetime from input
  const parseDateTimeLocal = (value: string): string | null => {
    if (!value) return null;
    try {
      return new Date(value).toISOString();
    } catch {
      return null;
    }
  };

  // Check if any filters are active
  const hasActiveFilters =
    filters.level ||
    filters.category ||
    filters.search ||
    filters.startTime ||
    filters.endTime;

  const hasTimeFilter = filters.startTime || filters.endTime;

  return (
    <div className="flex flex-col border-b bg-muted/30">
      {/* Main toolbar row */}
      <div className="flex items-center gap-2 p-3">
        {/* Level filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Level
              {selectedLevels.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded">
                  {selectedLevels.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Log Levels</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {LOG_LEVELS.map((level) => {
              const count = stats?.levelCounts[level] || 0;
              return (
                <DropdownMenuCheckboxItem
                  key={level}
                  checked={selectedLevels.includes(level)}
                  onCheckedChange={() => toggleLevel(level)}
                >
                  <span className={`flex-1 ${LEVEL_STYLES[level]}`}>
                    {level}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {count}
                  </span>
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Category filter with search and wildcards */}
        <div ref={categoryContainerRef} className="relative">
          <div className="flex items-center">
            <div className="relative">
              <Input
                ref={categoryInputRef}
                type="text"
                placeholder="Category (e.g., runner.*)"
                value={categoryInput}
                onChange={(e) => {
                  setCategoryInput(e.target.value);
                  setShowCategorySuggestions(true);
                }}
                onFocus={() => setShowCategorySuggestions(true)}
                onKeyDown={handleCategoryKeyDown}
                className="h-8 w-48 text-sm pr-8"
              />
              {categoryInput && (
                <button
                  onClick={() => {
                    setCategoryInput("");
                    onFiltersChange({ category: null });
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {categoryInput && categoryInput !== filters.category && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => applyCategory(categoryInput)}
                className="h-8 px-2 ml-1"
              >
                Apply
              </Button>
            )}
          </div>

          {/* Category suggestions dropdown */}
          {showCategorySuggestions &&
            (categorySuggestions.length > 0 ||
              wildcardSuggestions.length > 0) && (
              <div className="absolute top-full left-0 mt-1 w-64 max-h-48 overflow-auto bg-popover border rounded-md shadow-md z-50">
                {wildcardSuggestions.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">
                      Wildcards
                    </div>
                    {wildcardSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => applyCategory(suggestion)}
                        className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted flex items-center justify-between"
                      >
                        <span className="font-mono text-violet-600 dark:text-violet-400">
                          {suggestion}
                        </span>
                      </button>
                    ))}
                    {categorySuggestions.length > 0 && (
                      <div className="border-t" />
                    )}
                  </>
                )}
                {categorySuggestions.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">
                      Categories
                    </div>
                    {categorySuggestions.slice(0, 10).map((cat) => {
                      const count = stats?.categoryCounts[cat] || 0;
                      return (
                        <button
                          key={cat}
                          onClick={() => applyCategory(cat)}
                          className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted flex items-center justify-between"
                        >
                          <span className="truncate">{cat}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                    {categorySuggestions.length > 10 && (
                      <div className="px-3 py-1.5 text-xs text-muted-foreground">
                        +{categorySuggestions.length - 10} more...
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
        </div>

        {/* Search input */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search messages..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            className="h-8 pl-8 pr-8 text-sm"
          />
          {filters.search && (
            <button
              onClick={() => onFiltersChange({ search: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Time range toggle */}
        <Button
          variant={hasTimeFilter ? "default" : "outline"}
          size="sm"
          onClick={() => setShowTimeRange(!showTimeRange)}
          className="h-8"
        >
          <Calendar className="h-3.5 w-3.5 mr-1.5" />
          Time
          {hasTimeFilter && (
            <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-primary-foreground text-primary rounded">
              {(filters.startTime ? 1 : 0) + (filters.endTime ? 1 : 0)}
            </span>
          )}
          <ChevronDown
            className={`h-3 w-3 ml-1 transition-transform ${showTimeRange ? "rotate-180" : ""}`}
          />
        </Button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="h-8 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Time range row (collapsible) */}
      {showTimeRange && (
        <div className="flex items-center gap-3 px-3 pb-3 pt-0">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">From:</label>
            <Input
              type="datetime-local"
              value={formatDateTimeLocal(filters.startTime)}
              onChange={(e) =>
                onFiltersChange({
                  startTime: parseDateTimeLocal(e.target.value),
                })
              }
              className="h-8 w-48 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">To:</label>
            <Input
              type="datetime-local"
              value={formatDateTimeLocal(filters.endTime)}
              onChange={(e) =>
                onFiltersChange({ endTime: parseDateTimeLocal(e.target.value) })
              }
              className="h-8 w-48 text-sm"
            />
          </div>
          {hasTimeFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                onFiltersChange({ startTime: null, endTime: null })
              }
              className="h-8 text-xs"
            >
              Clear time range
            </Button>
          )}
          {stats?.timeRange?.start && (
            <span className="text-xs text-muted-foreground ml-auto">
              Log range: {new Date(stats.timeRange.start).toLocaleDateString()}{" "}
              -{" "}
              {stats.timeRange.end
                ? new Date(stats.timeRange.end).toLocaleDateString()
                : "now"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
