import { useCallback, useState } from "react";
import { getLogEntries, type LogEntriesOptions } from "@/lib/api";
import type { LogFilters } from "./types";

interface UseExportLogEntriesResult {
  exportFiltered: () => Promise<void>;
  exportError: string | null;
}

export function useExportLogEntries(
  projectPath: string | null,
  selectedFile: string | null,
  filters: LogFilters,
): UseExportLogEntriesResult {
  const [exportError, setExportError] = useState<string | null>(null);

  const exportFiltered = useCallback(async () => {
    if (!projectPath || !selectedFile) return;

    try {
      const options: LogEntriesOptions = {
        fileName: selectedFile,
        offset: 0,
        limit: 10000,
      };

      if (filters.level) options.level = filters.level;
      if (filters.category) options.category = filters.category;
      if (filters.search) options.search = filters.search;
      if (filters.startTime) options.startTime = filters.startTime;
      if (filters.endTime) options.endTime = filters.endTime;

      const response = await getLogEntries(projectPath, options);

      // Convert to JSONL
      const jsonl = response.entries
        .map((e) =>
          JSON.stringify({
            timestamp: e.timestamp,
            level: e.level,
            category: e.category,
            message: e.message,
            context: e.context,
            duration_ms: e.durationMs,
            exception: e.exception,
          }),
        )
        .join("\n");

      // Download
      const blob = new Blob([jsonl], { type: "application/jsonl" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `filtered-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.jsonl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Failed to export");
    }
  }, [projectPath, selectedFile, filters]);

  return {
    exportFiltered,
    exportError,
  };
}
