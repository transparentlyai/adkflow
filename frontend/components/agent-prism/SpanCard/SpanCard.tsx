import type { TraceSpan } from "@evilmartians/agent-prism-types";
import type { FC } from "react";

import {
  formatDuration,
  getTimelineData,
} from "@evilmartians/agent-prism-data";
import * as Collapsible from "@radix-ui/react-collapsible";
import cn from "classnames";
import { useCallback } from "react";

import type { AvatarProps } from "../Avatar";
import type { SpanCardConnectorType } from "./SpanCardConnector";
import type { SpanCardState, SpanCardViewOptions } from "./SpanCardLayout";

import { Avatar } from "../Avatar";
import { SpanCategoryAvatar } from "../SpanCategoryAvatar";
import { SpanStatus } from "../SpanStatus";
import { SpanCardBadges } from "./SpanCardBadges";
import { SpanCardChildren } from "./SpanCardChildren";
import { SpanCardConnector } from "./SpanCardConnector";
import {
  DEFAULT_VIEW_OPTIONS,
  getConnectorsLayout,
  getContentPadding,
  getContentWidth,
  getGridTemplateColumns,
} from "./SpanCardLayout";
import { SpanCardTimeline } from "./SpanCardTimeline";
import { SpanCardToggle } from "./SpanCardToggle";
import { useSpanCardEventHandlers } from "./useSpanCardEventHandlers";

export type { SpanCardViewOptions } from "./SpanCardLayout";

interface SpanCardProps {
  data: TraceSpan;
  level?: number;
  selectedSpan?: TraceSpan;
  avatar?: AvatarProps;
  onSpanSelect?: (span: TraceSpan) => void;
  minStart: number;
  maxEnd: number;
  isLastChild: boolean;
  prevLevelConnectors?: SpanCardConnectorType[];
  expandedSpansIds: string[];
  onExpandSpansIdsChange: (ids: string[]) => void;
  viewOptions?: SpanCardViewOptions;
}

export const SpanCard: FC<SpanCardProps> = ({
  data,
  level = 0,
  selectedSpan,
  onSpanSelect,
  viewOptions = DEFAULT_VIEW_OPTIONS,
  avatar,
  minStart,
  maxEnd,
  isLastChild,
  prevLevelConnectors = [],
  expandedSpansIds,
  onExpandSpansIdsChange,
}) => {
  const isExpanded = expandedSpansIds.includes(data.id);

  const withStatus = viewOptions.withStatus ?? DEFAULT_VIEW_OPTIONS.withStatus;
  const expandButton =
    viewOptions.expandButton || DEFAULT_VIEW_OPTIONS.expandButton;

  const handleToggleClick = useCallback(
    (expanded: boolean) => {
      const alreadyExpanded = expandedSpansIds.includes(data.id);

      if (alreadyExpanded && !expanded) {
        onExpandSpansIdsChange(expandedSpansIds.filter((id) => id !== data.id));
      }

      if (!alreadyExpanded && expanded) {
        onExpandSpansIdsChange([...expandedSpansIds, data.id]);
      }
    },
    [expandedSpansIds, data.id, onExpandSpansIdsChange],
  );

  const state: SpanCardState = {
    isExpanded,
    hasChildren: Boolean(data.children?.length),
    isSelected: selectedSpan?.id === data.id,
  };

  const eventHandlers = useSpanCardEventHandlers(data, onSpanSelect);

  const { durationMs } = getTimelineData({
    spanCard: data,
    minStart,
    maxEnd,
  });

  const hasExpandButtonAsFirstChild =
    expandButton === "inside" && state.hasChildren;

  const contentPadding = getContentPadding({
    level,
    hasExpandButton: hasExpandButtonAsFirstChild,
  });

  const contentWidth = getContentWidth({
    level,
    hasExpandButton: hasExpandButtonAsFirstChild,
    contentPadding,
    expandButton,
  });

  const { connectors, connectorsColumnWidth } = getConnectorsLayout({
    level,
    hasExpandButton: hasExpandButtonAsFirstChild,
    isLastChild,
    prevConnectors: prevLevelConnectors,
    expandButton,
  });

  const gridTemplateColumns = getGridTemplateColumns({
    connectorsColumnWidth,
    expandButton,
  });

  return (
    <li
      role="treeitem"
      aria-selected={state.isSelected ? true : selectedSpan ? false : undefined}
      aria-expanded={state.hasChildren ? state.isExpanded : undefined}
      className="list-none"
    >
      <Collapsible.Root
        open={state.isExpanded}
        onOpenChange={handleToggleClick}
      >
        <div
          className={cn(
            "relative grid w-full",
            state.isSelected &&
              "before:bg-agentprism-muted/75 before:absolute before:-top-2 before:h-2 before:w-full",
            state.isSelected &&
              "from-agentprism-muted/75 to-agentprism-muted/75 bg-gradient-to-b",
          )}
          style={{
            gridTemplateColumns,
            backgroundSize: "auto calc(100% - 8px)",
            backgroundPosition: "top",
            backgroundRepeat: "no-repeat",
          }}
          onClick={eventHandlers.handleCardClick}
          onKeyDown={eventHandlers.handleKeyDown}
          tabIndex={0}
          role="button"
          aria-pressed={state.isSelected}
          aria-describedby={`span-card-desc-${data.id}`}
          aria-expanded={state.hasChildren ? state.isExpanded : undefined}
          aria-label={`${state.isSelected ? "Selected" : "Not selected"} span card for ${data.title} at level ${level}`}
        >
          <div className="flex flex-nowrap">
            {connectors.map((connector, idx) => (
              <SpanCardConnector key={`${connector}-${idx}`} type={connector} />
            ))}

            {hasExpandButtonAsFirstChild && (
              <div className="flex w-5 flex-col items-center">
                <SpanCardToggle
                  isExpanded={state.isExpanded}
                  title={data.title}
                  onToggleClick={eventHandlers.handleToggleClick}
                />

                {state.isExpanded && <SpanCardConnector type="vertical" />}
              </div>
            )}
          </div>
          <div
            className={cn(
              "flex flex-wrap items-start gap-x-2 gap-y-1",
              "mb-3 min-h-5 w-full cursor-pointer",
              level !== 0 && !hasExpandButtonAsFirstChild && "pl-2",
              level !== 0 && hasExpandButtonAsFirstChild && "pl-1",
            )}
          >
            <div
              className="relative flex min-h-4 shrink-0 flex-wrap items-center gap-1.5"
              style={{
                width: `min(${contentWidth}px, 100%)`,
                minWidth: 140,
              }}
            >
              {avatar ? (
                <Avatar size="4" {...avatar} />
              ) : (
                <SpanCategoryAvatar category={data.type} size="4" />
              )}

              <h3
                className="text-agentprism-foreground max-w-32 truncate text-sm leading-[14px]"
                title={data.title}
              >
                {data.title}
              </h3>

              <SpanCardBadges data={data} />
            </div>

            <div className="flex grow flex-wrap items-center justify-end gap-1">
              {expandButton === "outside" && withStatus && (
                <div>
                  <SpanStatus status={data.status} />
                </div>
              )}

              <SpanCardTimeline
                minStart={minStart}
                maxEnd={maxEnd}
                spanCard={data}
              />

              <div className="flex items-center gap-2">
                <span className="text-agentprism-foreground inline-block w-14 flex-1 shrink-0 whitespace-nowrap px-1 text-right text-xs">
                  {formatDuration(durationMs)}
                </span>

                {expandButton === "inside" && withStatus && (
                  <div>
                    <SpanStatus status={data.status} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {expandButton === "outside" &&
            (state.hasChildren ? (
              <SpanCardToggle
                isExpanded={state.isExpanded}
                title={data.title}
                onToggleClick={eventHandlers.handleToggleClick}
              />
            ) : (
              <div />
            ))}
        </div>

        <SpanCardChildren
          minStart={minStart}
          maxEnd={maxEnd}
          viewOptions={viewOptions}
          data={data}
          level={level}
          selectedSpan={selectedSpan}
          onSpanSelect={onSpanSelect}
          prevLevelConnectors={connectors}
          expandedSpansIds={expandedSpansIds}
          onExpandSpansIdsChange={onExpandSpansIdsChange}
        />
      </Collapsible.Root>
    </li>
  );
};
