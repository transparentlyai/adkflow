"use client";

import { ChevronRight, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { LogLevel, CategoryNode } from "./debugPanelUtils";
import { LOG_LEVELS, LEVEL_COLORS } from "./debugPanelUtils";

interface LevelSelectorProps {
  value: LogLevel;
  onChange: (level: LogLevel) => void;
  disabled?: boolean;
}

export function LevelSelector({
  value,
  onChange,
  disabled,
}: LevelSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "text-xs px-2 py-0.5 rounded hover:bg-accent",
          LEVEL_COLORS[value],
          disabled && "opacity-50 pointer-events-none",
        )}
        disabled={disabled}
      >
        {value}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => onChange(v as LogLevel)}
        >
          {LOG_LEVELS.map((level) => (
            <DropdownMenuRadioItem
              key={level}
              value={level}
              className={cn("text-xs", LEVEL_COLORS[level])}
            >
              {level}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface CategoryItemProps {
  node: CategoryNode;
  expanded: Set<string>;
  onToggle: (name: string) => void;
  onLevelChange: (name: string, level: LogLevel) => void;
  disabled?: boolean;
}

export function CategoryItem({
  node,
  expanded,
  onToggle,
  onLevelChange,
  disabled,
}: CategoryItemProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.name);

  return (
    <div>
      <div
        className="flex items-center gap-1 py-1 px-2 hover:bg-accent rounded-sm"
        style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.name)}
            className="p-0.5 hover:bg-accent-foreground/10 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span className="flex-1 text-xs text-foreground truncate">
          {node.displayName}
        </span>
        <LevelSelector
          value={node.level}
          onChange={(level) => onLevelChange(node.name, level)}
          disabled={disabled}
        />
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <CategoryItem
              key={child.name}
              node={child}
              expanded={expanded}
              onToggle={onToggle}
              onLevelChange={onLevelChange}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface AdkDebugToggleProps {
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  categories: readonly string[];
  categoryLevels: Record<string, string>;
  onToggle: (categories: readonly string[], enabled: boolean) => void;
  disabled?: boolean;
}

export function AdkDebugToggle({
  name,
  description,
  icon: Icon,
  categories,
  categoryLevels,
  onToggle,
  disabled,
}: AdkDebugToggleProps) {
  const isEnabled = categories.some((cat) => {
    const level = categoryLevels[cat];
    return level === "DEBUG";
  });

  return (
    <button
      onClick={() => onToggle(categories, !isEnabled)}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 w-full px-2 py-1.5 rounded-sm text-left",
        "hover:bg-accent transition-colors",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center w-5 h-5 rounded",
          isEnabled
            ? "bg-blue-500/20 text-blue-400"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-3 w-3" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-foreground">{name}</div>
        <div className="text-[10px] text-muted-foreground truncate">
          {description}
        </div>
      </div>
      <div
        className={cn(
          "w-8 h-4 rounded-full transition-colors relative",
          isEnabled ? "bg-blue-500" : "bg-muted",
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform",
            isEnabled ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </div>
    </button>
  );
}
