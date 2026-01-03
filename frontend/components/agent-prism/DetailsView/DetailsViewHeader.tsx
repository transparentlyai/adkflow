import type { TraceSpan } from "@evilmartians/agent-prism-types";
import type { ReactNode } from "react";

import { getDurationMs, formatDuration } from "@evilmartians/agent-prism-data";
import { Check, Copy, Cpu, FunctionSquare } from "lucide-react";
import { useState } from "react";

import { Badge } from "../Badge";

import type { AvatarProps } from "../Avatar";

import { Avatar } from "../Avatar";
import { IconButton } from "../IconButton";
import { PriceBadge } from "../PriceBadge";
import { SpanBadge } from "../SpanBadge";
import { SpanCategoryAvatar } from "../SpanCategoryAvatar";
import { SpanStatus } from "../SpanStatus";
import { getModelName, getToolName } from "../spanAttributeUtils";
import { TimestampBadge } from "../TimestampBadge";
import { TokensBadge } from "../TokensBadge";

export interface DetailsViewHeaderProps {
  data: TraceSpan;
  avatar?: AvatarProps;
  copyButton?: {
    isEnabled?: boolean;
    onCopy?: (data: TraceSpan) => void;
  };
  /**
   * Custom actions to render in the header
   */
  actions?: ReactNode;
  /**
   * Optional className for the header container
   */
  className?: string;
}

export const DetailsViewHeader = ({
  data,
  avatar,
  copyButton,
  actions,
  className,
}: DetailsViewHeaderProps) => {
  const [hasCopied, setHasCopied] = useState(false);
  const durationMs = getDurationMs(data);
  const modelName = getModelName(data);
  const toolName = getToolName(data);

  const handleCopy = () => {
    if (copyButton?.onCopy) {
      copyButton.onCopy(data);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    }
  };

  return (
    <div className={className || "flex flex-wrap items-center gap-2"}>
      {avatar ? (
        <Avatar size="4" {...avatar} />
      ) : (
        <SpanCategoryAvatar category={data.type} size="5" />
      )}

      <span className="text-agentprism-foreground tracking-wide">
        {data.title}
      </span>

      <div className="flex size-5 items-center justify-center">
        <SpanStatus status={data.status} />
      </div>

      {copyButton && (
        <IconButton
          aria-label={
            copyButton.isEnabled ? "Copy span details" : "Copy disabled"
          }
          variant="ghost"
          onClick={handleCopy}
        >
          {hasCopied ? (
            <Check className="text-agentprism-muted-foreground size-3" />
          ) : (
            <Copy className="text-agentprism-muted-foreground size-3" />
          )}
        </IconButton>
      )}

      <SpanBadge category={data.type} />

      {modelName && (
        <Badge
          iconStart={<Cpu className="size-2.5" />}
          label={modelName}
          className="bg-agentprism-badge-llm text-agentprism-badge-llm-foreground"
          unstyled
        />
      )}

      {toolName && (
        <Badge
          iconStart={<FunctionSquare className="size-2.5" />}
          label={toolName}
          className="bg-agentprism-badge-tool text-agentprism-badge-tool-foreground"
          unstyled
        />
      )}

      {typeof data.tokensCount === "number" && (
        <TokensBadge tokensCount={data.tokensCount} />
      )}

      {typeof data.cost === "number" && <PriceBadge cost={data.cost} />}

      <span className="text-agentprism-muted-foreground text-xs">
        LATENCY: {formatDuration(durationMs)}
      </span>

      {typeof data.startTime === "number" && (
        <TimestampBadge timestamp={data.startTime} />
      )}

      {actions}
    </div>
  );
};
