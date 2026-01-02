import { useState, useCallback } from "react";
import type { LogFilters } from "./types";
import { DEFAULT_FILTERS } from "./types";

interface UseLogFiltersResult {
  filters: LogFilters;
  setFilters: (update: Partial<LogFilters>) => void;
  resetFilters: () => void;
}

export function useLogFilters(): UseLogFiltersResult {
  const [filters, setFiltersState] = useState<LogFilters>(DEFAULT_FILTERS);

  const setFilters = useCallback((update: Partial<LogFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...update }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  return {
    filters,
    setFilters,
    resetFilters,
  };
}
