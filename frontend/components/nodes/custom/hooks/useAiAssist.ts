import { useCallback } from "react";
import { useAiChat } from "@/components/AiChat";
import {
  PROMPT_CREATOR_SYSTEM_PROMPT,
  PROMPT_FIXER_SYSTEM_PROMPT,
} from "@/lib/aiPrompts";
import type { AiAssistOption } from "@/components/nodes/custom/AiAssistButton";

export interface UseAiAssistOptions {
  nodeId: string;
  nodeName: string;
  content: string;
  onConfigChange: (fieldId: string, value: unknown) => void;
}

export interface UseAiAssistResult {
  handleAiAssist: (option: AiAssistOption) => void;
}

/**
 * Hook that provides AI assist functionality for prompt nodes.
 *
 * Opens the AI chat with the appropriate system prompt based on the assist option
 * (create or fix) and handles updating the node content when the AI returns a result.
 */
export function useAiAssist({
  nodeId,
  nodeName,
  content,
  onConfigChange,
}: UseAiAssistOptions): UseAiAssistResult {
  const { openChat } = useAiChat();

  const handleAiAssist = useCallback(
    (option: AiAssistOption) => {
      const systemPrompt =
        option === "create"
          ? PROMPT_CREATOR_SYSTEM_PROMPT.replace("{content}", content)
          : PROMPT_FIXER_SYSTEM_PROMPT.replace("{content}", content);

      const initialMessage =
        option === "create"
          ? "Hi! I need help creating a prompt."
          : "Hi! I need help fixing my prompt.";

      openChat({
        sessionId: `prompt-${nodeId}-${option}`,
        systemPrompt,
        context: {
          nodeId,
          nodeName,
          nodeType: "prompt",
          assistType: option,
        },
        initialMessage,
        onContentReturn: (newContent: string) => {
          onConfigChange("content", newContent);
        },
      });
    },
    [nodeId, nodeName, content, openChat, onConfigChange],
  );

  return {
    handleAiAssist,
  };
}
