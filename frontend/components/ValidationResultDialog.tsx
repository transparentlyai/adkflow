"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  agent_count: number;
  tab_count: number;
  teleporter_count: number;
}

interface ValidationResultDialogProps {
  isOpen: boolean;
  result: ValidationResult | null;
  onClose: () => void;
}

export default function ValidationResultDialog({
  isOpen,
  result,
  onClose,
}: ValidationResultDialogProps) {
  if (!result) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {result.valid ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Workflow Valid
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                Validation Failed
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-muted p-2">
              <div className="text-2xl font-bold">{result.agent_count}</div>
              <div className="text-xs text-muted-foreground">Agents</div>
            </div>
            <div className="rounded-md bg-muted p-2">
              <div className="text-2xl font-bold">{result.tab_count}</div>
              <div className="text-xs text-muted-foreground">Tabs</div>
            </div>
            <div className="rounded-md bg-muted p-2">
              <div className="text-2xl font-bold">
                {result.teleporter_count}
              </div>
              <div className="text-xs text-muted-foreground">Teleporters</div>
            </div>
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm font-medium text-red-500">
                <XCircle className="h-4 w-4" />
                Errors ({result.errors.length})
              </div>
              <ul className="space-y-1 text-sm">
                {result.errors.map((error, i) => (
                  <li
                    key={i}
                    className="rounded bg-red-500/10 px-2 py-1 text-red-400"
                  >
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm font-medium text-yellow-500">
                <AlertTriangle className="h-4 w-4" />
                Warnings ({result.warnings.length})
              </div>
              <ul className="space-y-1 text-sm">
                {result.warnings.map((warning, i) => (
                  <li
                    key={i}
                    className="rounded bg-yellow-500/10 px-2 py-1 text-yellow-400"
                  >
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
