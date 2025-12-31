"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Node } from "@xyflow/react";
import type { TabState } from "@/lib/types";
import type { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";
import {
  buildEntriesFromNodes,
  searchIndex,
  type SearchIndexEntry,
  type SearchResult,
} from "@/lib/searchUtils";

interface ReactFlowJSON {
  nodes: Node[];
  edges: unknown[];
  viewport: { x: number; y: number; zoom: number };
}

interface GlobalSearchProps {
  projectPath: string;
  tabs: TabState[];
  activeTabId: string | null;
  loadTabFlow: (
    projectPath: string,
    tabId: string,
  ) => Promise<ReactFlowJSON | null>;
  navigateToNode: (tabId: string, nodeId: string) => void;
  canvasRef: React.RefObject<ReactFlowCanvasRef | null>;
}

export default function GlobalSearch({
  projectPath,
  tabs,
  activeTabId,
  loadTabFlow,
  navigateToNode,
  canvasRef,
}: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchIndex_, setSearchIndex] = useState<SearchIndexEntry[]>([]);
  const [isIndexBuilding, setIsIndexBuilding] = useState(false);
  const [indexBuiltAt, setIndexBuiltAt] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build the search index by loading all tabs
  const buildIndex = useCallback(async () => {
    if (isIndexBuilding) return;

    setIsIndexBuilding(true);
    const entries: SearchIndexEntry[] = [];

    for (const tab of tabs) {
      if (tab.id === activeTabId && canvasRef.current) {
        // Use current canvas state for active tab (most up-to-date)
        const flow = canvasRef.current.saveFlow();
        if (flow) {
          entries.push(...buildEntriesFromNodes(flow.nodes, tab.id, tab.name));
        }
      } else {
        // Load from disk for other tabs
        const flow = await loadTabFlow(projectPath, tab.id);
        if (flow) {
          entries.push(...buildEntriesFromNodes(flow.nodes, tab.id, tab.name));
        }
      }
    }

    setSearchIndex(entries);
    setIndexBuiltAt(Date.now());
    setIsIndexBuilding(false);
  }, [tabs, activeTabId, projectPath, loadTabFlow, canvasRef, isIndexBuilding]);

  useEffect(() => {
    if (query.trim()) {
      const filtered = searchIndex(searchIndex_, query);
      setResults(filtered.slice(0, 20)); // Limit to 20 results
      setSelectedIndex(0);
    } else {
      setResults([]);
      setSelectedIndex(0);
    }
  }, [query, searchIndex_]);

  // Handle focus - build index if needed
  const handleFocus = useCallback(() => {
    setIsOpen(true);
    // Rebuild index if it's stale (older than 30 seconds) or doesn't exist
    const isStale = !indexBuiltAt || Date.now() - indexBuiltAt > 30000;
    if (isStale) {
      buildIndex();
    }
  }, [buildIndex, indexBuiltAt]);

  // Handle blur - close dropdown when focus leaves the container
  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Don't close if focus moves within the container
    if (containerRef.current?.contains(e.relatedTarget as HTMLElement)) {
      return;
    }
    setIsOpen(false);
  }, []);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      navigateToNode(result.tabId, result.nodeId);
      setQuery("");
      setIsOpen(false);
      inputRef.current?.blur();
    },
    [navigateToNode],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, results, selectedIndex, handleSelect],
  );

  // Global keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    const selectedElement = document.querySelector(
      `[data-search-index="${selectedIndex}"]`,
    );
    selectedElement?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Search nodes..."
          className="pl-8 pr-8 h-8 w-[200px] text-sm"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (query || isIndexBuilding) && (
        <div className="absolute top-full left-0 mt-1 w-[320px] max-h-[400px] overflow-y-auto bg-popover border border-border rounded-md shadow-lg z-50">
          {isIndexBuilding && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Building search index...
            </div>
          )}

          {!isIndexBuilding && query && results.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No matches found
            </div>
          )}

          {!isIndexBuilding && results.length > 0 && (
            <ul className="py-1">
              {results.map((result, index) => (
                <li
                  key={`${result.tabId}-${result.nodeId}`}
                  data-search-index={index}
                  className={`px-3 py-2 cursor-pointer ${
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(result);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">
                      {result.nodeName}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                      {result.tabName}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {result.nodeTypeLabel}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
