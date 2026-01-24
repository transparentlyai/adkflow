import type { TraceSpan } from "@evilmartians/agent-prism-types";
import type { FC } from "react";

import * as Collapsible from "@radix-ui/react-collapsible";

import type { AvatarProps } from "../Avatar";
import type { SpanCardConnectorType } from "./SpanCardConnector";
import type { SpanCardViewOptions } from "./SpanCardLayout";

import { BrandLogo } from "../BrandLogo";
import { DEFAULT_VIEW_OPTIONS } from "./SpanCardLayout";
import { SpanCard } from "./SpanCard";

interface SpanCardChildrenProps {
  data: TraceSpan;
  level: number;
  selectedSpan?: TraceSpan;
  onSpanSelect?: (span: TraceSpan) => void;
  minStart: number;
  maxEnd: number;
  prevLevelConnectors: SpanCardConnectorType[];
  expandedSpansIds: string[];
  onExpandSpansIdsChange: (ids: string[]) => void;
  viewOptions?: SpanCardViewOptions;
}

export const SpanCardChildren: FC<SpanCardChildrenProps> = ({
  data,
  level,
  selectedSpan,
  onSpanSelect,
  minStart,
  maxEnd,
  prevLevelConnectors,
  expandedSpansIds,
  onExpandSpansIdsChange,
  viewOptions = DEFAULT_VIEW_OPTIONS,
}) => {
  if (!data.children?.length) return null;

  return (
    <div className="relative">
      <Collapsible.Content>
        <ul role="group">
          {data.children.map((child, idx) => {
            const brand = child.metadata?.brand as { type: string } | undefined;

            return (
              <SpanCard
                viewOptions={viewOptions}
                key={child.id}
                data={child}
                minStart={minStart}
                maxEnd={maxEnd}
                level={level + 1}
                selectedSpan={selectedSpan}
                onSpanSelect={onSpanSelect}
                isLastChild={idx === (data.children || []).length - 1}
                prevLevelConnectors={prevLevelConnectors}
                expandedSpansIds={expandedSpansIds}
                onExpandSpansIdsChange={onExpandSpansIdsChange}
                avatar={
                  brand
                    ? {
                        children: <BrandLogo brand={brand.type} />,
                        size: "4",
                        rounded: "sm",
                        category: child.type,
                      }
                    : undefined
                }
              />
            );
          })}
        </ul>
      </Collapsible.Content>
    </div>
  );
};
