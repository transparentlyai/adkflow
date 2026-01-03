import type { TraceSpanCategory } from "@evilmartians/agent-prism-types";

import cn from "classnames";

import { getSpanCategoryIcon } from "./shared";

interface SpanCategoryAvatarProps {
  category: TraceSpanCategory;
  size?: "3" | "4" | "5";
  className?: string;
}

const sizeClasses = {
  "3": "size-3",
  "4": "size-4",
  "5": "size-5",
};

const iconSizeClasses = {
  "3": "size-2",
  "4": "size-2.5",
  "5": "size-3",
};

const bgColorClasses: Record<TraceSpanCategory, string> = {
  llm_call: "bg-agentprism-avatar-llm",
  tool_execution: "bg-agentprism-avatar-tool",
  agent_invocation: "bg-agentprism-avatar-agent",
  chain_operation: "bg-agentprism-avatar-chain",
  retrieval: "bg-agentprism-avatar-retrieval",
  embedding: "bg-agentprism-avatar-embedding",
  create_agent: "bg-agentprism-avatar-create-agent",
  span: "bg-agentprism-avatar-span",
  event: "bg-agentprism-avatar-event",
  guardrail: "bg-agentprism-avatar-guardrail",
  unknown: "bg-agentprism-avatar-unknown",
};

export const SpanCategoryAvatar = ({
  category,
  size = "4",
  className,
}: SpanCategoryAvatarProps) => {
  const Icon = getSpanCategoryIcon(category);

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full",
        sizeClasses[size],
        bgColorClasses[category],
        className,
      )}
    >
      <Icon className={cn(iconSizeClasses[size], "text-white")} />
    </div>
  );
};
