"use client";

import { useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isMacOS } from "@/lib/utils";
import type { UserInputRequest } from "@/lib/types";

interface UserInputPanelProps {
  pendingInput: UserInputRequest;
  userInputValue: string;
  setUserInputValue: (value: string) => void;
  isSubmittingInput: boolean;
  onSubmit: () => void;
}

export default function UserInputPanel({
  pendingInput,
  userInputValue,
  setUserInputValue,
  isSubmittingInput,
  onSubmit,
}: UserInputPanelProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="border-t border-amber-600/50 bg-gray-800 p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-xs font-medium text-amber-400">
          {pendingInput.node_name}
        </span>
        <span className="text-xs text-gray-500">
          Variable: {`{${pendingInput.variable_name}}`}
        </span>
      </div>

      {pendingInput.previous_output && (
        <div className="mb-2 p-2 rounded bg-gray-700/50 text-xs text-gray-300 max-h-20 overflow-auto">
          <div className="text-gray-500 mb-1">Previous output:</div>
          <pre className="whitespace-pre-wrap font-mono">
            {pendingInput.previous_output.length > 500
              ? pendingInput.previous_output.slice(0, 500) + "..."
              : pendingInput.previous_output}
          </pre>
        </div>
      )}

      <div className="flex gap-2">
        <textarea
          ref={inputRef}
          value={userInputValue}
          onChange={(e) => setUserInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter your response..."
          className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none"
          rows={2}
          disabled={isSubmittingInput}
        />
        <Button
          onClick={onSubmit}
          disabled={!userInputValue.trim() || isSubmittingInput}
          className="bg-amber-600 hover:bg-amber-500 text-white px-4 self-end"
        >
          {isSubmittingInput ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Press {isMacOS() ? "⌘" : "Ctrl+"}Enter to submit
      </div>
    </div>
  );
}
