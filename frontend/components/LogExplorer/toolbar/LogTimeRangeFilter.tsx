import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LogStats } from "@/lib/api";

interface LogTimeRangeFilterProps {
  startTime: string | null;
  endTime: string | null;
  showTimeRange: boolean;
  stats: LogStats | null;
  onTimeRangeChange: (start: string | null, end: string | null) => void;
  onToggleTimeRange: () => void;
}

export function LogTimeRangeFilter({
  startTime,
  endTime,
  showTimeRange,
  stats,
  onTimeRangeChange,
  onToggleTimeRange,
}: LogTimeRangeFilterProps) {
  const hasTimeFilter = startTime || endTime;

  const formatDateTimeLocal = (isoString: string | null): string => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };

  const parseDateTimeLocal = (value: string): string | null => {
    if (!value) return null;
    try {
      return new Date(value).toISOString();
    } catch {
      return null;
    }
  };

  return (
    <>
      <Button
        variant={hasTimeFilter ? "default" : "outline"}
        size="sm"
        onClick={onToggleTimeRange}
        className="h-8"
      >
        <Calendar className="h-3.5 w-3.5 mr-1.5" />
        Time
        {hasTimeFilter && (
          <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-primary-foreground text-primary rounded">
            {(startTime ? 1 : 0) + (endTime ? 1 : 0)}
          </span>
        )}
        <ChevronDown
          className={`h-3 w-3 ml-1 transition-transform ${showTimeRange ? "rotate-180" : ""}`}
        />
      </Button>

      {showTimeRange && (
        <TimeRangeRow
          startTime={startTime}
          endTime={endTime}
          stats={stats}
          onTimeRangeChange={onTimeRangeChange}
          formatDateTimeLocal={formatDateTimeLocal}
          parseDateTimeLocal={parseDateTimeLocal}
        />
      )}
    </>
  );
}

interface TimeRangeRowProps {
  startTime: string | null;
  endTime: string | null;
  stats: LogStats | null;
  onTimeRangeChange: (start: string | null, end: string | null) => void;
  formatDateTimeLocal: (isoString: string | null) => string;
  parseDateTimeLocal: (value: string) => string | null;
}

export function TimeRangeRow({
  startTime,
  endTime,
  stats,
  onTimeRangeChange,
  formatDateTimeLocal,
  parseDateTimeLocal,
}: TimeRangeRowProps) {
  const hasTimeFilter = startTime || endTime;

  return (
    <div className="flex items-center gap-3 px-3 pb-3 pt-0">
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">From:</label>
        <Input
          type="datetime-local"
          value={formatDateTimeLocal(startTime)}
          onChange={(e) =>
            onTimeRangeChange(parseDateTimeLocal(e.target.value), endTime)
          }
          className="h-8 w-48 text-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">To:</label>
        <Input
          type="datetime-local"
          value={formatDateTimeLocal(endTime)}
          onChange={(e) =>
            onTimeRangeChange(startTime, parseDateTimeLocal(e.target.value))
          }
          className="h-8 w-48 text-sm"
        />
      </div>
      {hasTimeFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTimeRangeChange(null, null)}
          className="h-8 text-xs"
        >
          Clear time range
        </Button>
      )}
      {stats?.timeRange?.start && (
        <span className="text-xs text-muted-foreground ml-auto">
          Log range: {new Date(stats.timeRange.start).toLocaleDateString()} -{" "}
          {stats.timeRange.end
            ? new Date(stats.timeRange.end).toLocaleDateString()
            : "now"}
        </span>
      )}
    </div>
  );
}
