"use client";

import { memo } from "react";
import { ChevronDown, ChevronUp, ArrowDownToLine, Zap } from "lucide-react";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

export interface CustomNodeHeaderProps {
  name: string;
  schema: CustomNodeSchema;
  headerColor: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  // Name editing props
  isEditing: boolean;
  editedName: string;
  inputRef: React.RefObject<HTMLInputElement>;
  onNameClick: (e: React.MouseEvent) => void;
  onNameChange: (value: string) => void;
  onNameSave: () => void;
  onNameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Shared header component for CustomNode collapsed and expanded views.
 * Displays output_node indicator, always_execute indicator, editable name, and expand chevron.
 */
const CustomNodeHeader = memo(
  ({
    name,
    schema,
    headerColor,
    isExpanded = false,
    onToggleExpand,
    isEditing,
    editedName,
    inputRef,
    onNameClick,
    onNameChange,
    onNameSave,
    onNameKeyDown,
  }: CustomNodeHeaderProps) => {
    const ChevronIcon = isExpanded ? ChevronUp : ChevronDown;

    return (
      <div
        className={`px-${isExpanded ? "2" : "3"} py-${isExpanded ? "1.5" : "2"} flex items-center justify-between ${isExpanded ? "cursor-pointer" : ""} gap-2`}
        style={{ backgroundColor: headerColor }}
        onDoubleClick={onToggleExpand}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Output node indicator */}
          {schema.output_node && (
            <div
              className="flex-shrink-0 rounded-full p-0.5"
              style={{ backgroundColor: "#22c55e" }}
              title="Output Node - triggers execution"
            >
              <ArrowDownToLine className="w-2.5 h-2.5 text-white" />
            </div>
          )}
          {/* Always execute indicator */}
          {schema.always_execute && (
            <div
              className="flex-shrink-0 rounded-full p-0.5"
              style={{ backgroundColor: "#f59e0b" }}
              title="Always Execute - skips cache"
            >
              <Zap className="w-2.5 h-2.5 text-white" />
            </div>
          )}
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editedName}
              onChange={(e) => onNameChange(e.target.value)}
              onBlur={onNameSave}
              onKeyDown={onNameKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-1 py-0.5 rounded text-xs font-medium outline-none min-w-0"
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                color: "white",
              }}
            />
          ) : (
            <span
              className="font-medium text-xs text-white truncate cursor-text"
              onClick={onNameClick}
              title="Click to rename"
            >
              {name}
            </span>
          )}
        </div>
        <ChevronIcon className="w-3 h-3 text-white opacity-60 flex-shrink-0" />
      </div>
    );
  },
);

CustomNodeHeader.displayName = "CustomNodeHeader";

export default CustomNodeHeader;
