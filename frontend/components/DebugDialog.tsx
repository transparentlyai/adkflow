"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useLoggingConfig } from "@/hooks/useLoggingConfig";
import { DebugPanelContent } from "@/components/RunPanel/DebugPanelContent";

interface DebugDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectPath?: string | null;
}

export function DebugDialog({
  open,
  onOpenChange,
  projectPath,
}: DebugDialogProps) {
  const { isLoading, error, config, categories, updateConfig, resetConfig } =
    useLoggingConfig(projectPath);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 pt-4 pb-4">
        <VisuallyHidden>
          <DialogTitle>Debug Settings</DialogTitle>
        </VisuallyHidden>
        <DebugPanelContent
          isLoading={isLoading}
          error={error}
          config={config}
          categories={categories}
          updateConfig={updateConfig}
          resetConfig={resetConfig}
          showHeader={true}
        />
      </DialogContent>
    </Dialog>
  );
}

export default DebugDialog;
