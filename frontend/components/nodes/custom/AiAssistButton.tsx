"use client";

import { memo, useState, useCallback } from "react";
import { Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type AiAssistOption = "create" | "fix";

export interface AiAssistButtonProps {
  onSelect: (option: AiAssistOption) => void;
}

/**
 * AI assist button with dropdown for prompt nodes.
 * Shows a sparkles icon that opens a dropdown with options:
 * - Help me create a prompt
 * - Help me fix this prompt
 */
const AiAssistButton = memo(({ onSelect }: AiAssistButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = useCallback(
    (option: AiAssistOption) => {
      setIsOpen(false);
      onSelect(option);
    },
    [onSelect],
  );

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center justify-center rounded p-0.5 hover:bg-white/20 transition-colors"
          onClick={(e) => e.stopPropagation()}
          title="AI Assist"
        >
          <Sparkles className="w-3 h-3 text-white" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="bottom"
        className="min-w-[200px]"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem onClick={() => handleSelect("create")}>
          <Sparkles className="w-4 h-4 mr-2" />
          Help me create a prompt
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSelect("fix")}>
          <Sparkles className="w-4 h-4 mr-2" />
          Help me fix this prompt
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

AiAssistButton.displayName = "AiAssistButton";

export default AiAssistButton;
