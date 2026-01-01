"use client";

import { Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLoggingConfig } from "@/hooks/useLoggingConfig";
import { DebugPanelContent } from "./DebugPanelContent";

export function DebugPanel() {
  const {
    isDevMode,
    isLoading,
    error,
    config,
    categories,
    updateConfig,
    resetConfig,
  } = useLoggingConfig();

  // Only render in dev mode
  if (!isDevMode) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-gray-200 h-6 w-6 p-0"
          title="Debug Settings (Dev Mode)"
        >
          <Bug className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DebugPanelContent
          isLoading={isLoading}
          error={error}
          config={config}
          categories={categories}
          updateConfig={updateConfig}
          resetConfig={resetConfig}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default DebugPanel;
