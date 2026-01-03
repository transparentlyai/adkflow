import type { TraceSpan } from "@evilmartians/agent-prism-types";
import { Cpu, FunctionSquare } from "lucide-react";

import { Badge } from "../Badge";
import { PriceBadge } from "../PriceBadge";
import { getModelName, getToolName } from "../spanAttributeUtils";
import { SpanBadge } from "../SpanBadge";
import { TokensBadge } from "../TokensBadge";

interface SpanCardBagdesProps {
  data: TraceSpan;
}

export const SpanCardBadges = ({ data }: SpanCardBagdesProps) => {
  const modelName = getModelName(data);
  const toolName = getToolName(data);

  return (
    <div className="flex flex-wrap items-center justify-start gap-1">
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
    </div>
  );
};
