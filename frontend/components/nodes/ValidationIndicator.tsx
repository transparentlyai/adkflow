"use client";

import { memo } from "react";
import { AlertTriangle, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ValidationIndicatorProps {
  /** Backend validation errors for this node */
  errors?: string[];
  /** Backend validation warnings for this node */
  warnings?: string[];
  /** Client-side duplicate name error */
  duplicateNameError?: boolean;
}

const ValidationIndicator = memo(
  ({
    errors = [],
    warnings = [],
    duplicateNameError = false,
  }: ValidationIndicatorProps) => {
    const allErrors: string[] = [...errors];
    if (duplicateNameError) {
      allErrors.unshift("Duplicate name: another node has the same name");
    }

    const hasErrors = allErrors.length > 0;
    const hasWarnings = warnings.length > 0;

    if (!hasErrors && !hasWarnings) {
      return null;
    }

    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center cursor-help">
              {hasErrors ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-[350px] p-0 border-0 shadow-lg"
          >
            <div
              className="p-3 rounded-md"
              style={{
                backgroundColor: hasErrors ? "#fef2f2" : "#fefce8",
                border: `1px solid ${hasErrors ? "#fecaca" : "#fef08a"}`,
              }}
            >
              <div className="space-y-2">
                {allErrors.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-red-700 font-medium text-xs mb-1">
                      <AlertCircle className="w-3 h-3" />
                      {allErrors.length === 1
                        ? "Error"
                        : `Errors (${allErrors.length})`}
                    </div>
                    <ul className="space-y-1 text-xs text-red-600 pl-4">
                      {allErrors.map((error, i) => (
                        <li key={i} className="list-disc">
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {warnings.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-yellow-700 font-medium text-xs mb-1">
                      <AlertTriangle className="w-3 h-3" />
                      {warnings.length === 1
                        ? "Warning"
                        : `Warnings (${warnings.length})`}
                    </div>
                    <ul className="space-y-1 text-xs text-yellow-600 pl-4">
                      {warnings.map((warning, i) => (
                        <li key={i} className="list-disc">
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

ValidationIndicator.displayName = "ValidationIndicator";

export default ValidationIndicator;
