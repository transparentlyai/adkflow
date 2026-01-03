"use client";

import { memo } from "react";
import type {
  CustomNodeSchema,
  CustomNodeData,
} from "@/components/nodes/CustomNode";
import type { HandlePositions } from "@/lib/types";
import type { HandleTypes } from "@/components/nodes/custom/hooks/useCustomNodeHandleTypes";
import {
  PillLayout,
  CircleLayout,
  OctagonLayout,
  DiamondLayout,
  TagLayout,
  CompactLayout,
  PillBodyLayout,
  FullCollapsedLayout,
  StandardLayout,
} from "./layouts";

export interface CustomNodeCollapsedProps {
  id: string;
  nodeData: CustomNodeData;
  schema: CustomNodeSchema;
  name: string;
  config: Record<string, unknown>;
  handlePositions?: HandlePositions;
  handleTypes: HandleTypes;
  headerColor: string;
  selected?: boolean;
  onToggleExpand: () => void;
  // Name editing props
  isEditing: boolean;
  editedName: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onNameClick: (e: React.MouseEvent) => void;
  onNameChange: (value: string) => void;
  onNameSave: () => void;
  onNameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Collapsed view of a CustomNode.
 * Routes to the appropriate layout component based on schema.ui.layout.
 */
const CustomNodeCollapsed = memo((props: CustomNodeCollapsedProps) => {
  const layout = props.schema.ui.layout || "standard";

  switch (layout) {
    case "pill":
      return <PillLayout {...props} />;
    case "pill_body":
      return <PillBodyLayout {...props} />;
    case "full":
      return <FullCollapsedLayout {...props} />;
    case "circle":
      return <CircleLayout {...props} />;
    case "octagon":
      return <OctagonLayout {...props} />;
    case "diamond":
      return <DiamondLayout {...props} />;
    case "tag":
      return <TagLayout {...props} />;
    case "compact":
      return <CompactLayout {...props} />;
    case "standard":
    case "panel":
    default:
      return <StandardLayout {...props} />;
  }
});

CustomNodeCollapsed.displayName = "CustomNodeCollapsed";

export default CustomNodeCollapsed;
