"use client";

import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import { loadProjectSettings } from "@/lib/api";
import { VERTEX_AI_LOCATIONS } from "@/lib/constants/modelSchemas";

interface LocationBadgeProps {
  projectPath: string | null;
  onOpenSettings: () => void;
}

/**
 * LocationBadge - Displays the current Vertex AI location with click-to-edit.
 *
 * A compact, clickable badge that shows the project's configured location.
 * Clicking opens Project Settings for editing.
 *
 * Features:
 * - Auto-loads location from project settings
 * - Shows abbreviated location name
 * - Subtle hover state with tooltip
 * - Modern, minimal design
 */
export default function LocationBadge({
  projectPath,
  onOpenSettings,
}: LocationBadgeProps) {
  const [location, setLocation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load location when project changes
  useEffect(() => {
    if (!projectPath) {
      setLocation(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    loadProjectSettings(projectPath)
      .then((response) => {
        if (!cancelled) {
          setLocation(response.env.googleCloudLocation || "us-central1");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLocation("us-central1");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  // Don't render if no project
  if (!projectPath) return null;

  // Get display label for location
  const getLocationDisplay = () => {
    if (isLoading) return "...";
    if (!location) return "us-central1";

    const loc = VERTEX_AI_LOCATIONS.find((l) => l.value === location);
    if (!loc) return location;

    // Return abbreviated version (e.g., "US Central" instead of "US Central (Iowa)")
    const label = loc.label;
    const parenIndex = label.indexOf("(");
    return parenIndex > 0 ? label.substring(0, parenIndex).trim() : label;
  };

  // Get full label for tooltip
  const getFullLabel = () => {
    if (!location) return "US Central (Iowa)";
    const loc = VERTEX_AI_LOCATIONS.find((l) => l.value === location);
    return loc?.label || location;
  };

  return (
    <button
      onClick={onOpenSettings}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
      title={`Location: ${getFullLabel()} (click to change)`}
    >
      <MapPin className="h-3 w-3" />
      <span>{getLocationDisplay()}</span>
    </button>
  );
}
