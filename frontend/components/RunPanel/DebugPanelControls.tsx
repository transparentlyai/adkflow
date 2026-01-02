"use client";

import { ChevronRight, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { LogLevel, CategoryNode, LoggingPreset } from "./debugPanelUtils";
import { LOG_LEVELS, LEVEL_COLORS } from "./debugPanelUtils";

interface LevelBadgeProps {
  level: LogLevel;
  isInherited?: boolean;
  size?: "sm" | "md";
}

export function LevelBadge({
  level,
  isInherited,
  size = "sm",
}: LevelBadgeProps) {
  const sizeClasses =
    size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5";

  const levelColors = {
    DEBUG: "bg-purple-500/20 text-purple-300",
    INFO: "bg-blue-500/20 text-blue-300",
    WARNING: "bg-yellow-500/20 text-yellow-300",
    ERROR: "bg-red-500/20 text-red-300",
    OFF: "bg-muted/30 text-muted-foreground/50",
  };

  return (
    <span
      className={cn(
        "rounded font-medium",
        sizeClasses,
        levelColors[level],
        isInherited && "opacity-60",
        level === "OFF" && "line-through",
      )}
      title={isInherited ? `Inherited from parent` : undefined}
    >
      {level}
      {isInherited && "*"}
    </span>
  );
}

interface LevelSelectorProps {
  value: LogLevel;
  onChange: (level: LogLevel | "inherit") => void;
  disabled?: boolean;
  isInherited?: boolean;
  showInheritOption?: boolean;
}

export function LevelSelector({
  value,
  onChange,
  disabled,
  isInherited = false,
  showInheritOption = false,
}: LevelSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "rounded transition-colors hover:ring-1 hover:ring-border",
          disabled && "opacity-50 pointer-events-none",
        )}
        disabled={disabled}
      >
        <LevelBadge level={value} isInherited={isInherited} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuRadioGroup
          value={isInherited ? "inherit" : value}
          onValueChange={(v) => onChange(v as LogLevel | "inherit")}
        >
          {showInheritOption && (
            <>
              <DropdownMenuRadioItem
                value="inherit"
                className="text-xs text-muted-foreground"
              >
                <span className="italic">Inherit from parent</span>
              </DropdownMenuRadioItem>
              <DropdownMenuSeparator />
            </>
          )}
          {LOG_LEVELS.map((level) => (
            <DropdownMenuRadioItem
              key={level}
              value={level}
              className="text-xs"
            >
              <span className={cn("font-medium", LEVEL_COLORS[level])}>
                {level}
              </span>
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
  onLevelChange: (name: string, level: LogLevel | "inherit") => void;
  disabled?: boolean;
  isRoot?: boolean;
}

export function CategoryItem({
  node,
  expanded,
  onToggle,
  onLevelChange,
  disabled,
  isRoot = false,
}: CategoryItemProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.name);

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1.5 py-1 px-2 rounded-sm transition-colors",
          "hover:bg-accent/50",
        )}
        style={{ paddingLeft: `${node.depth * 12 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.name)}
            className="p-0.5 rounded hover:bg-accent"
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
        <span
          className={cn(
            "flex-1 text-xs truncate font-mono",
            node.isInherited ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {node.displayName}
        </span>
        <LevelSelector
          value={node.effectiveLevel}
          onChange={(level) => onLevelChange(node.name, level)}
          disabled={disabled}
          isInherited={node.isInherited}
          showInheritOption={!isRoot}
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

interface PresetCardProps {
  preset: LoggingPreset;
  onClick: () => void;
  disabled?: boolean;
}

export function PresetCard({ preset, onClick, disabled }: PresetCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={preset.description}
      className={cn(
        "px-2.5 py-1.5 rounded text-xs font-medium transition-colors",
        "bg-muted/50 hover:bg-muted border border-border/50",
        "hover:border-border",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      {preset.name}
    </button>
  );
}
