"use client";

import { type ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HandleTooltipProps {
  /** The label/name of the handle */
  label: string;
  /** Source type (e.g., 'agent', 'prompt', 'tool') */
  sourceType: string;
  /** Data type (e.g., 'str', 'dict', 'callable') */
  dataType: string;
  /** Whether this is an input or output handle */
  type: "input" | "output";
  /** The handle element to wrap */
  children: ReactNode;
}

/**
 * Wraps a handle with an immediate tooltip showing type information.
 * - Input handles show "Accepts: source:type"
 * - Output handles show "Emits: source:type"
 */
export default function HandleTooltip({
  label,
  sourceType,
  dataType,
  type,
  children,
}: HandleTooltipProps) {
  const typeLabel = type === "input" ? "Accepts" : "Emits";

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side="top"
          className="text-xs bg-zinc-900 text-white border-zinc-700"
        >
          <div className="font-medium">{label}</div>
          <div className="text-zinc-400">
            {typeLabel}: {sourceType}:{dataType}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
