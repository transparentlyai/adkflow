/**
 * CollapsibleSection - Renders a collapsible section with header and content
 */

import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Theme } from "@/lib/themes/types";

interface CollapsibleSectionProps {
  sectionName: string | null;
  children: React.ReactNode;
  isFirst?: boolean;
  compact?: boolean;
  isCollapsed: boolean;
  onToggle: (sectionName: string) => void;
  theme: Theme;
  headerColor: string;
}

export function CollapsibleSection({
  sectionName,
  children,
  isFirst = false,
  compact = false,
  isCollapsed,
  onToggle,
  theme,
  headerColor,
}: CollapsibleSectionProps) {
  const isCollapsible = !!sectionName;

  return (
    <div
      key={sectionName || "default"}
      className={isFirst ? "" : "mt-2 pt-2 border-t"}
      style={
        isFirst
          ? undefined
          : { borderColor: theme.colors.nodes.common.container.border }
      }
    >
      {sectionName && (
        <button
          type="button"
          onClick={() => onToggle(sectionName)}
          className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide mb-1 pl-1 border-l-2 w-full text-left hover:opacity-80 transition-opacity"
          style={{
            color: theme.colors.nodes.common.text.muted,
            borderColor: headerColor,
          }}
        >
          {isCollapsible &&
            (isCollapsed ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            ))}
          {sectionName}
        </button>
      )}
      {!isCollapsed && (
        <div className={compact ? "" : "space-y-1"}>{children}</div>
      )}
    </div>
  );
}
