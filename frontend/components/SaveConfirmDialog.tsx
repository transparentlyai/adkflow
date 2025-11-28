"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface SaveConfirmDialogProps {
  isOpen: boolean;
  projectPath: string;
  onSaveAndContinue: () => void;
  onDontSave: () => void;
  onCancel: () => void;
}

export default function SaveConfirmDialog({
  isOpen,
  projectPath,
  onSaveAndContinue,
  onDontSave,
  onCancel,
}: SaveConfirmDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Save Current Project?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>You have unsaved changes in your current project.</p>
              {projectPath && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Current project:</p>
                  <p className="text-sm font-mono break-all">{projectPath}</p>
                </div>
              )}
              <p>Would you like to save before continuing?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <Button variant="secondary" onClick={onDontSave}>
            Don&apos;t Save
          </Button>
          <AlertDialogAction onClick={onSaveAndContinue}>
            Save & Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
