"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { WidgetProps } from "@/components/nodes/widgets/WidgetRenderer";

/**
 * SearchableSelectWidget - A dropdown with search/filter capability.
 *
 * Use this widget for fields with many options where users benefit from
 * filtering (e.g., country selection, timezone picker, large enum lists).
 *
 * Features:
 * - Type-to-filter: Filters options as user types in the search box
 * - Matches both label and value
 * - Keyboard support: Escape to close, Enter to select single match
 * - Click outside to close
 * - Styled consistently with other node widgets
 *
 * @example
 * // In a field definition:
 * {
 *   id: "timezone",
 *   label: "Timezone",
 *   widget: "searchable_select",
 *   options: [
 *     { value: "America/New_York", label: "Eastern Time (US)" },
 *     { value: "Europe/London", label: "London (UK)" },
 *     // ... many more options
 *   ],
 * }
 *
 * @note Currently available but not used in production.
 *       Reserved for future use cases requiring filterable dropdowns.
 */
export default function SearchableSelectWidget({
  field,
  value,
  onChange,
  options: widgetOptions,
}: WidgetProps) {
  const { disabled, theme, compact } = widgetOptions;
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!field.options) return [];
    if (!searchTerm) return field.options;

    const term = searchTerm.toLowerCase();
    return field.options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) ||
        opt.value.toLowerCase().includes(term),
    );
  }, [field.options, searchTerm]);

  // Get display label for current value
  const displayLabel = useMemo(() => {
    if (!value) return "";
    const selected = field.options?.find((opt) => opt.value === value);
    return selected?.label ?? (value as string);
  }, [value, field.options]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setSearchTerm("");
    } else if (e.key === "Enter" && filteredOptions.length === 1) {
      handleSelect(filteredOptions[0].value);
    }
  };

  const baseStyles = {
    backgroundColor: compact
      ? "transparent"
      : theme.colors.nodes.common.container.background,
    borderColor: theme.colors.nodes.common.container.border,
    color: theme.colors.nodes.common.text.primary,
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={
          compact
            ? "w-full px-1.5 py-0.5 rounded text-[11px] border bg-transparent text-left flex items-center justify-between"
            : "w-full px-2 py-1.5 rounded text-xs border text-left flex items-center justify-between"
        }
        style={baseStyles}
      >
        <span
          className={displayLabel ? "" : "opacity-50"}
          style={{ color: theme.colors.nodes.common.text.primary }}
        >
          {displayLabel || "Select..."}
        </span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 rounded border shadow-lg overflow-hidden"
          style={{
            backgroundColor: theme.colors.nodes.common.container.background,
            borderColor: theme.colors.nodes.common.container.border,
          }}
        >
          {/* Search input */}
          <div
            className="p-1.5 border-b"
            style={{ borderColor: baseStyles.borderColor }}
          >
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search..."
              className="w-full px-2 py-1 rounded text-xs border outline-none"
              style={{
                backgroundColor: theme.colors.nodes.common.container.background,
                borderColor: theme.colors.nodes.common.container.border,
                color: theme.colors.nodes.common.text.primary,
              }}
            />
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div
                className="px-2 py-2 text-xs text-center"
                style={{ color: theme.colors.nodes.common.text.secondary }}
              >
                No options found
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full px-2 py-1.5 text-xs text-left hover:bg-white/5 ${
                    opt.value === value ? "bg-white/10" : ""
                  }`}
                  style={{ color: theme.colors.nodes.common.text.primary }}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
