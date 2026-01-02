import { useRef, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { LogStats } from "@/lib/api";

interface LogCategoryFilterProps {
  category: string | null;
  stats: LogStats | null;
  onCategoryChange: (category: string | null) => void;
}

export function LogCategoryFilter({
  category,
  stats,
  onCategoryChange,
}: LogCategoryFilterProps) {
  const [categoryInput, setCategoryInput] = useState(category || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync input with filter
  useEffect(() => {
    setCategoryInput(category || "");
  }, [category]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allCategories = stats ? Object.keys(stats.categoryCounts).sort() : [];

  const categorySuggestions = categoryInput
    ? allCategories.filter((cat) =>
        cat.toLowerCase().includes(categoryInput.toLowerCase()),
      )
    : allCategories;

  const getWildcardSuggestions = (): string[] => {
    if (!categoryInput) return [];
    const suggestions: string[] = [];

    if (categoryInput.includes(".")) {
      const parts = categoryInput.split(".");
      const prefix = parts.slice(0, -1).join(".");
      if (!categoryInput.endsWith("*")) {
        suggestions.push(`${prefix}.*`);
        suggestions.push(`${prefix}.**`);
      }
    } else if (categoryInput.length > 0 && !categoryInput.includes("*")) {
      suggestions.push(`${categoryInput}.*`);
      suggestions.push(`${categoryInput}.**`);
    }

    return suggestions.filter(
      (s) => !categorySuggestions.includes(s) && s !== categoryInput,
    );
  };

  const wildcardSuggestions = getWildcardSuggestions();

  const applyCategory = (value: string) => {
    onCategoryChange(value || null);
    setCategoryInput(value);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      applyCategory(categoryInput);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center">
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Category (e.g., runner.*)"
            value={categoryInput}
            onChange={(e) => {
              setCategoryInput(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            className="h-8 w-48 text-sm pr-8"
          />
          {categoryInput && (
            <button
              onClick={() => {
                setCategoryInput("");
                onCategoryChange(null);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {categoryInput && categoryInput !== category && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => applyCategory(categoryInput)}
            className="h-8 px-2 ml-1"
          >
            Apply
          </Button>
        )}
      </div>

      {showSuggestions &&
        (categorySuggestions.length > 0 || wildcardSuggestions.length > 0) && (
          <div className="absolute top-full left-0 mt-1 w-64 max-h-48 overflow-auto bg-popover border rounded-md shadow-md z-50">
            {wildcardSuggestions.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">
                  Wildcards
                </div>
                {wildcardSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => applyCategory(suggestion)}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted flex items-center justify-between"
                  >
                    <span className="font-mono text-violet-600 dark:text-violet-400">
                      {suggestion}
                    </span>
                  </button>
                ))}
                {categorySuggestions.length > 0 && <div className="border-t" />}
              </>
            )}
            {categorySuggestions.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">
                  Categories
                </div>
                {categorySuggestions.slice(0, 10).map((cat) => {
                  const count = stats?.categoryCounts[cat] || 0;
                  return (
                    <button
                      key={cat}
                      onClick={() => applyCategory(cat)}
                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted flex items-center justify-between"
                    >
                      <span className="truncate">{cat}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {count}
                      </span>
                    </button>
                  );
                })}
                {categorySuggestions.length > 10 && (
                  <div className="px-3 py-1.5 text-xs text-muted-foreground">
                    +{categorySuggestions.length - 10} more...
                  </div>
                )}
              </>
            )}
          </div>
        )}
    </div>
  );
}
