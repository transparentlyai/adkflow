/**
 * LogExplorerHeader - File selection and stats summary
 */

import {
  RefreshCw,
  Download,
  FileText,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LogFileInfo, LogStats } from "@/lib/api";
import { formatFileSize } from "./logExplorerUtils";

interface LogExplorerHeaderProps {
  files: LogFileInfo[];
  selectedFile: string | null;
  onSelectFile: (file: string) => void;
  stats: LogStats | null;
  totalCount: number;
  isLoading: boolean;
  onRefresh: () => void;
  onExport: () => void;
}

export function LogExplorerHeader({
  files,
  selectedFile,
  onSelectFile,
  stats,
  totalCount,
  isLoading,
  onRefresh,
  onExport,
}: LogExplorerHeaderProps) {
  const selectedFileInfo = files.find((f) => f.name === selectedFile);

  return (
    <div className="flex items-center gap-3 p-3 border-b">
      {/* File selector */}
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-48 justify-between"
            >
              <span className="truncate">
                {selectedFile || "Select log file"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 ml-2 flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {files.map((file) => (
              <DropdownMenuItem
                key={file.name}
                onClick={() => onSelectFile(file.name)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  {selectedFile === file.name && (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {selectedFile !== file.name && <span className="w-3.5" />}
                  <span className="truncate">{file.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(file.sizeBytes)}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            {totalCount.toLocaleString()} entries
            {totalCount !== stats.totalLines && (
              <span className="text-xs ml-1">
                (of {stats.totalLines.toLocaleString()})
              </span>
            )}
          </span>
          {selectedFileInfo && (
            <span>{formatFileSize(selectedFileInfo.sizeBytes)}</span>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-8"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExport}
          disabled={isLoading || totalCount === 0}
          className="h-8"
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export
        </Button>
      </div>
    </div>
  );
}
