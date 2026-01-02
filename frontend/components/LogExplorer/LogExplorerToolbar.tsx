/**
 * LogExplorerToolbar - Filter controls for the log explorer
 *
 * Provides level filter, category filter with wildcards, search, and time range.
 */

import { useState } from "react";
import type { LogFilters } from "@/hooks/logExplorer";
import type { LogStats } from "@/lib/api";
import type { LogLevel } from "./logExplorerUtils";
import {
  LogLevelFilter,
  LogCategoryFilter,
  LogSearchInput,
  LogTimeRangeFilter,
  TimeRangeRow,
  LogToolbarActions,
} from "./toolbar";

interface LogExplorerToolbarProps {
  filters: LogFilters;
  onFiltersChange: (filters: Partial<LogFilters>) => void;
  onResetFilters: () => void;
  stats: LogStats | null;
  formatJson: boolean;
  onFormatJsonChange: (formatJson: boolean) => void;
}

export function LogExplorerToolbar({
  filters,
  onFiltersChange,
  onResetFilters,
  stats,
  formatJson,
  onFormatJsonChange,
}: LogExplorerToolbarProps) {
  const [showTimeRange, setShowTimeRange] = useState(false);

  // Parse selected levels from comma-separated string
  const selectedLevels = filters.level
    ? (filters.level.split(",") as LogLevel[])
    : [];

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

  // Check if any filters are active
  const hasActiveFilters =
    filters.level ||
    filters.category ||
    filters.search ||
    filters.startTime ||
    filters.endTime;

  return (
    <div className="flex flex-col border-b bg-muted/30">
      {/* Main toolbar row */}
      <div className="flex items-center gap-2 p-3">
        <LogLevelFilter
          selectedLevels={selectedLevels}
          stats={stats}
          onToggleLevel={toggleLevel}
        />

        <LogCategoryFilter
          category={filters.category}
          stats={stats}
          onCategoryChange={(category) => onFiltersChange({ category })}
        />

        <LogSearchInput
          search={filters.search}
          onSearchChange={(search) => onFiltersChange({ search })}
        />

        <LogTimeRangeFilter
          startTime={filters.startTime}
          endTime={filters.endTime}
          showTimeRange={showTimeRange}
          stats={stats}
          onTimeRangeChange={(startTime, endTime) =>
            onFiltersChange({ startTime, endTime })
          }
          onToggleTimeRange={() => setShowTimeRange(!showTimeRange)}
        />

        <LogToolbarActions
          formatJson={formatJson}
          hasActiveFilters={!!hasActiveFilters}
          onFormatJsonChange={onFormatJsonChange}
          onResetFilters={onResetFilters}
        />
      </div>

      {/* Time range row (collapsible) */}
      {showTimeRange && (
        <TimeRangeRow
          startTime={filters.startTime}
          endTime={filters.endTime}
          stats={stats}
          onTimeRangeChange={(startTime, endTime) =>
            onFiltersChange({ startTime, endTime })
          }
          formatDateTimeLocal={(isoString) => {
            if (!isoString) return "";
            try {
              return new Date(isoString).toISOString().slice(0, 16);
            } catch {
              return "";
            }
          }}
          parseDateTimeLocal={(value) => {
            if (!value) return null;
            try {
              return new Date(value).toISOString();
            } catch {
              return null;
            }
          }}
        />
      )}
    </div>
  );
}
