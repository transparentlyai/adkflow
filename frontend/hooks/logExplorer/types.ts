import type { LogFileInfo, LogEntry, LogStats } from "@/lib/api";

export interface LogFilters {
  level: string | null;
  category: string | null;
  search: string;
  startTime: string | null;
  endTime: string | null;
}

export const DEFAULT_FILTERS: LogFilters = {
  level: null,
  category: null,
  search: "",
  startTime: null,
  endTime: null,
};

export const PAGE_SIZE = 500;

export interface UseLogExplorerResult {
  files: LogFileInfo[];
  selectedFile: string | null;
  setSelectedFile: (file: string | null) => void;
  entries: LogEntry[];
  stats: LogStats | null;
  totalCount: number;
  filters: LogFilters;
  setFilters: (filters: Partial<LogFilters>) => void;
  resetFilters: () => void;
  offset: number;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  exportFiltered: () => Promise<void>;
}
