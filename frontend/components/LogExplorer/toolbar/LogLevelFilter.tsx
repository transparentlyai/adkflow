import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import type { LogStats } from "@/lib/api";
import { LOG_LEVELS, LEVEL_STYLES, type LogLevel } from "../logExplorerUtils";

interface LogLevelFilterProps {
  selectedLevels: LogLevel[];
  stats: LogStats | null;
  onToggleLevel: (level: LogLevel) => void;
}

export function LogLevelFilter({
  selectedLevels,
  stats,
  onToggleLevel,
}: LogLevelFilterProps) {
  return (
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
              onCheckedChange={() => onToggleLevel(level)}
            >
              <span className={`flex-1 ${LEVEL_STYLES[level]}`}>{level}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {count}
              </span>
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
