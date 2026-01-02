import { Play, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import type { RunInfo } from "@/lib/api";

interface LogRunFilterProps {
  runs: RunInfo[];
  selectedRunId: string | null;
  lastRunOnly: boolean;
  isLoading: boolean;
  onRunIdChange: (runId: string | null) => void;
  onLastRunOnlyChange: (lastRunOnly: boolean) => void;
}

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function LogRunFilter({
  runs,
  selectedRunId,
  lastRunOnly,
  isLoading,
  onRunIdChange,
  onLastRunOnlyChange,
}: LogRunFilterProps) {
  const selectedRun = runs.find((r) => r.runId === selectedRunId);
  const hasRuns = runs.length > 0;

  return (
    <div className="flex items-center gap-2">
      {/* Last Run Only Toggle Button */}
      <Button
        variant={lastRunOnly ? "default" : "outline"}
        size="sm"
        className="h-8"
        disabled={isLoading || !hasRuns}
        onClick={() => onLastRunOnlyChange(!lastRunOnly)}
      >
        <Play className="h-3.5 w-3.5 mr-1.5" />
        Last run
      </Button>

      {/* Run Selector Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            disabled={isLoading || !hasRuns || lastRunOnly}
          >
            {selectedRun ? (
              <span className="font-mono text-xs">{selectedRun.runId}</span>
            ) : (
              "All runs"
            )}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Filter by Run</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onRunIdChange(null)}
            className="flex items-center justify-between"
          >
            <span>All runs</span>
            <span className="text-xs text-muted-foreground">
              {runs.reduce((sum, r) => sum + r.entryCount, 0)} entries
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {runs.map((run) => (
            <DropdownMenuItem
              key={run.runId}
              onClick={() => onRunIdChange(run.runId)}
              className={`flex flex-col items-start gap-0.5 ${
                selectedRunId === run.runId ? "bg-accent" : ""
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-mono font-medium">{run.runId}</span>
                <span className="text-xs text-muted-foreground">
                  {run.entryCount} entries
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(run.firstTimestamp)}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
