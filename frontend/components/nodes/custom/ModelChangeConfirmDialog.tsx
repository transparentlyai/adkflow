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
import { AlertTriangle, ArrowRight, Minus, Plus } from "lucide-react";
import type { FieldChange } from "./hooks/useModelChangeConfirmation";

interface ModelChangeConfirmDialogProps {
  isOpen: boolean;
  currentModelLabel: string;
  newModelLabel: string;
  fieldChanges: FieldChange[];
  onConfirm: () => void;
  onCancel: () => void;
  formatValue: (value: unknown) => string;
}

/**
 * Dialog that shows field changes when switching models.
 */
export function ModelChangeConfirmDialog({
  isOpen,
  currentModelLabel,
  newModelLabel,
  fieldChanges,
  onConfirm,
  onCancel,
  formatValue,
}: ModelChangeConfirmDialogProps) {
  // Group changes by type
  const removedFields = fieldChanges.filter((c) => c.isRemoved);
  const newFields = fieldChanges.filter((c) => c.isNew);
  const modifiedFields = fieldChanges.filter((c) => !c.isRemoved && !c.isNew);

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Switch to {newModelLabel}?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Switching models will reset your configuration to the new
                model&apos;s defaults. The following fields will be affected:
              </p>

              <div className="max-h-64 overflow-y-auto rounded-md border bg-muted/30 p-2 text-sm">
                {/* Modified fields */}
                {modifiedFields.length > 0 && (
                  <div className="mb-2">
                    <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                      Will be reset
                    </div>
                    {modifiedFields.map((change) => (
                      <div
                        key={change.fieldId}
                        className="flex items-center gap-2 py-1 pl-2"
                      >
                        <span className="font-medium text-foreground">
                          {change.label}:
                        </span>
                        <span className="text-muted-foreground">
                          {formatValue(change.currentValue)}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-foreground">
                          {formatValue(change.newValue)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Removed fields */}
                {removedFields.length > 0 && (
                  <div className="mb-2">
                    <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                      Will be removed
                    </div>
                    {removedFields.map((change) => (
                      <div
                        key={change.fieldId}
                        className="flex items-center gap-2 py-1 pl-2 text-amber-600 dark:text-amber-400"
                      >
                        <Minus className="h-3 w-3" />
                        <span className="font-medium">{change.label}:</span>
                        <span>{formatValue(change.currentValue)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* New fields */}
                {newFields.length > 0 && (
                  <div>
                    <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                      New fields
                    </div>
                    {newFields.map((change) => (
                      <div
                        key={change.fieldId}
                        className="flex items-center gap-2 py-1 pl-2 text-emerald-600 dark:text-emerald-400"
                      >
                        <Plus className="h-3 w-3" />
                        <span className="font-medium">{change.label}:</span>
                        <span>{formatValue(change.newValue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            Switch Model
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
