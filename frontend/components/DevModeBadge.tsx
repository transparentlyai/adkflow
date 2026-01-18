"use client";

import { useState, useEffect } from "react";
import { GitBranch } from "lucide-react";
import { getDevInfo } from "@/lib/api";

/**
 * DevModeBadge - Floating badge showing dev mode status and current git branch.
 *
 * Only renders when the app is running in development mode.
 * Positioned as a floating element at the top center of the screen.
 */
export default function DevModeBadge() {
  const [devMode, setDevMode] = useState(false);
  const [branch, setBranch] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getDevInfo()
      .then((info) => {
        if (!cancelled) {
          setDevMode(info.devMode);
          setBranch(info.branch);
        }
      })
      .catch(() => {
        // Silently fail - badge just won't show
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Don't render if not in dev mode
  if (!devMode) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500 text-amber-950 shadow-lg shadow-amber-500/25 font-semibold text-sm pointer-events-auto">
        <span className="uppercase tracking-wide">Dev</span>
        {branch && (
          <>
            <span className="w-px h-4 bg-amber-700/30" />
            <GitBranch className="h-3.5 w-3.5" />
            <span className="font-mono">{branch}</span>
          </>
        )}
      </div>
    </div>
  );
}
