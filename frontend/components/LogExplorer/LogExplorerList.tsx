/**
 * LogExplorerList - Virtualized list of log entries with keyboard navigation
 *
 * Uses TanStack Virtual for efficient rendering of large log files.
 * Supports arrow keys for navigation and Enter to expand/collapse.
 */

import { useVirtualizer } from "@tanstack/react-virtual";
import {
  useRef,
  useCallback,
  useEffect,
  useState,
  type KeyboardEvent,
} from "react";
import { Loader2, FileX } from "lucide-react";
import type { LogEntry } from "@/lib/api";
import { LogEntryRow } from "./LogEntryRow";

interface LogExplorerListProps {
  entries: LogEntry[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  searchTerm?: string;
}

const ROW_HEIGHT_COLLAPSED = 40;
const ROW_HEIGHT_EXPANDED = 300;

export function LogExplorerList({
  entries,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  searchTerm,
}: LogExplorerListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // Toggle expansion for a row
  const toggleExpand = useCallback((lineNumber: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(lineNumber)) {
        next.delete(lineNumber);
      } else {
        next.add(lineNumber);
      }
      return next;
    });
  }, []);

  // Estimate row size based on expansion state
  const estimateSize = useCallback(
    (index: number) => {
      const entry = entries[index];
      if (!entry) return ROW_HEIGHT_COLLAPSED;
      return expandedIds.has(entry.lineNumber)
        ? ROW_HEIGHT_EXPANDED
        : ROW_HEIGHT_COLLAPSED;
    },
    [entries, expandedIds],
  );

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: 10,
  });

  // Re-measure when expansion changes
  useEffect(() => {
    virtualizer.measure();
  }, [expandedIds, virtualizer]);

  // Infinite scroll: load more when near bottom
  const items = virtualizer.getVirtualItems();
  useEffect(() => {
    if (!hasMore || isLoadingMore || entries.length === 0) return;

    const lastItem = items[items.length - 1];
    if (!lastItem) return;

    // Load more when within 5 items of the end
    if (lastItem.index >= entries.length - 5) {
      onLoadMore();
    }
  }, [items, hasMore, isLoadingMore, entries.length, onLoadMore]);

  // Reset focus when entries change
  useEffect(() => {
    setFocusedIndex(null);
  }, [entries]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex !== null) {
      virtualizer.scrollToIndex(focusedIndex, { align: "auto" });
    }
  }, [focusedIndex, virtualizer]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (entries.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => {
            if (prev === null) return 0;
            return Math.min(prev + 1, entries.length - 1);
          });
          break;

        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => {
            if (prev === null) return entries.length - 1;
            return Math.max(prev - 1, 0);
          });
          break;

        case "Enter":
        case " ":
          e.preventDefault();
          if (focusedIndex !== null && entries[focusedIndex]) {
            toggleExpand(entries[focusedIndex].lineNumber);
          }
          break;

        case "Home":
          e.preventDefault();
          setFocusedIndex(0);
          break;

        case "End":
          e.preventDefault();
          setFocusedIndex(entries.length - 1);
          break;

        case "PageDown":
          e.preventDefault();
          setFocusedIndex((prev) => {
            if (prev === null) return 0;
            return Math.min(prev + 10, entries.length - 1);
          });
          break;

        case "PageUp":
          e.preventDefault();
          setFocusedIndex((prev) => {
            if (prev === null) return entries.length - 1;
            return Math.max(prev - 10, 0);
          });
          break;
      }
    },
    [entries, focusedIndex, toggleExpand],
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading logs...</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <FileX className="h-10 w-10" />
          <span>No log entries found</span>
          {searchTerm && (
            <span className="text-xs">
              Try adjusting your search or filters
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-auto focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="listbox"
      aria-label="Log entries"
      aria-activedescendant={
        focusedIndex !== null ? `log-entry-${focusedIndex}` : undefined
      }
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {items.map((virtualRow) => {
          const entry = entries[virtualRow.index];
          if (!entry) return null;

          const isFocused = focusedIndex === virtualRow.index;

          return (
            <div
              key={virtualRow.key}
              id={`log-entry-${virtualRow.index}`}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              role="option"
              aria-selected={isFocused}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className={isFocused ? "ring-2 ring-inset ring-primary" : ""}
            >
              <LogEntryRow
                entry={entry}
                isExpanded={expandedIds.has(entry.lineNumber)}
                onToggleExpand={() => {
                  toggleExpand(entry.lineNumber);
                  setFocusedIndex(virtualRow.index);
                }}
                searchTerm={searchTerm}
              />
            </div>
          );
        })}
      </div>

      {/* Loading more indicator */}
      {isLoadingMore && (
        <div className="py-4 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading more...</span>
          </div>
        </div>
      )}
    </div>
  );
}
