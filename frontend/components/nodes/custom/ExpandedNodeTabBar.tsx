"use client";

import { memo } from "react";
import type { Theme } from "@/lib/themes/types";

interface ExpandedNodeTabBarProps {
  tabs: string[];
  activeTab: string;
  headerColor: string;
  theme: Theme;
  onTabChange: (tab: string) => void;
}

/**
 * Tab bar for expanded node view
 */
const ExpandedNodeTabBar = memo(
  ({
    tabs,
    activeTab,
    headerColor,
    theme,
    onTabChange,
  }: ExpandedNodeTabBarProps) => {
    return (
      <div
        className="flex border-b"
        style={{
          borderColor: theme.colors.nodes.common.container.border,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-2 py-1 text-[10px] font-medium ${activeTab === tab ? "border-b-2" : ""}`}
            style={{
              borderColor: activeTab === tab ? headerColor : "transparent",
              color:
                activeTab === tab
                  ? theme.colors.nodes.common.text.primary
                  : theme.colors.nodes.common.text.secondary,
              backgroundColor: "transparent",
            }}
          >
            {tab}
          </button>
        ))}
      </div>
    );
  },
);

ExpandedNodeTabBar.displayName = "ExpandedNodeTabBar";

export default ExpandedNodeTabBar;
