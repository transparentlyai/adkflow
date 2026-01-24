import type { SpanCardConnectorType } from "./SpanCardConnector";

export const LAYOUT_CONSTANTS = {
  CONNECTOR_WIDTH: 20,
  CONTENT_BASE_WIDTH: 320,
} as const;

export type ExpandButtonPlacement = "inside" | "outside";

export type SpanCardViewOptions = {
  withStatus?: boolean;
  expandButton?: ExpandButtonPlacement;
};

export const DEFAULT_VIEW_OPTIONS: Required<SpanCardViewOptions> = {
  withStatus: true,
  expandButton: "inside",
};

export interface SpanCardState {
  isExpanded: boolean;
  hasChildren: boolean;
  isSelected: boolean;
}

export const getContentWidth = ({
  level,
  hasExpandButton,
  contentPadding,
  expandButton,
}: {
  level: number;
  hasExpandButton: boolean;
  contentPadding: number;
  expandButton: ExpandButtonPlacement;
}) => {
  let width =
    LAYOUT_CONSTANTS.CONTENT_BASE_WIDTH -
    level * LAYOUT_CONSTANTS.CONNECTOR_WIDTH;

  if (hasExpandButton && expandButton === "inside") {
    width -= LAYOUT_CONSTANTS.CONNECTOR_WIDTH;
  }

  if (expandButton === "outside" && level === 0) {
    width -= LAYOUT_CONSTANTS.CONNECTOR_WIDTH;
  }

  return width - contentPadding;
};

export const getGridTemplateColumns = ({
  connectorsColumnWidth,
  expandButton,
}: {
  connectorsColumnWidth: number;
  expandButton: ExpandButtonPlacement;
}) => {
  if (expandButton === "inside") {
    return `${connectorsColumnWidth}px 1fr`;
  }

  return `${connectorsColumnWidth}px 1fr ${LAYOUT_CONSTANTS.CONNECTOR_WIDTH}px`;
};

export const getContentPadding = ({
  level,
  hasExpandButton,
}: {
  level: number;
  hasExpandButton: boolean;
}) => {
  if (level === 0) return 0;

  if (hasExpandButton) return 4;

  return 8;
};

export const getConnectorsLayout = ({
  level,
  hasExpandButton,
  isLastChild,
  prevConnectors,
  expandButton,
}: {
  hasExpandButton: boolean;
  isLastChild: boolean;
  level: number;
  prevConnectors: SpanCardConnectorType[];
  expandButton: ExpandButtonPlacement;
}): {
  connectors: SpanCardConnectorType[];
  connectorsColumnWidth: number;
} => {
  const connectors: SpanCardConnectorType[] = [];

  if (level === 0) {
    return {
      connectors: expandButton === "inside" ? [] : ["vertical"],
      connectorsColumnWidth: 20,
    };
  }

  for (let i = 0; i < level - 1; i++) {
    connectors.push("vertical");
  }

  if (!isLastChild) {
    connectors.push("t-right");
  }

  if (isLastChild) {
    connectors.push("corner-top-right");
  }

  let connectorsColumnWidth =
    connectors.length * LAYOUT_CONSTANTS.CONNECTOR_WIDTH;

  if (hasExpandButton) {
    connectorsColumnWidth += LAYOUT_CONSTANTS.CONNECTOR_WIDTH;
  }

  for (let i = 0; i < prevConnectors.length; i++) {
    if (
      prevConnectors[i] === "empty" ||
      prevConnectors[i] === "corner-top-right"
    ) {
      connectors[i] = "empty";
    }
  }

  return {
    connectors,
    connectorsColumnWidth,
  };
};
