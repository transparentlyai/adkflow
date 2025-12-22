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

interface RunConfirmDialogProps {
  isOpen: boolean;
  onSaveAndRun: () => void;
  onCancel: () => void;
}

export default function RunConfirmDialog({
  isOpen,
  onSaveAndRun,
  onCancel,
}: RunConfirmDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Save Before Running?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. The workflow needs to be saved before it can be executed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onSaveAndRun}>
            Save & Run
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
