"use client";

import { memo } from "react";
import { ChevronDown, ChevronUp, ArrowDownToLine, Zap } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import NodeIcon from "@/components/nodes/custom/NodeIcon";
import ValidationIndicator from "@/components/nodes/ValidationIndicator";
import AiAssistButton, {
  type AiAssistOption,
} from "@/components/nodes/custom/AiAssistButton";

export interface CustomNodeHeaderProps {
  name: string;
  schema: CustomNodeSchema;
  headerColor: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  // Name editing props
  isEditing: boolean;
  editedName: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onNameClick: (e: React.MouseEvent) => void;
  onNameChange: (value: string) => void;
  onNameSave: () => void;
  onNameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  // Validation props (optional)
  validationErrors?: string[];
  validationWarnings?: string[];
  duplicateNameError?: string;
  // Description tooltip (shown on hover in collapsed mode)
  description?: string;
  // Context menu handler
  onContextMenu?: (e: React.MouseEvent) => void;
  // AI assist callback (for prompt nodes)
  onAiAssist?: (option: AiAssistOption) => void;
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
    validationErrors,
    validationWarnings,
    duplicateNameError,
    description,
    onContextMenu,
    onAiAssist,
  }: CustomNodeHeaderProps) => {
    const { theme } = useTheme();
    const ChevronIcon = isExpanded ? ChevronUp : ChevronDown;
    const hasValidationIssues =
      (validationErrors && validationErrors.length > 0) ||
      (validationWarnings && validationWarnings.length > 0) ||
      !!duplicateNameError;

    // Show description tooltip only in collapsed mode
    const tooltipText = !isExpanded && description ? description : undefined;

    return (
      <div
        className={`px-${isExpanded ? "2" : "3"} py-${isExpanded ? "1.5" : "2"} rounded-t-lg flex items-center justify-between ${isExpanded ? "cursor-pointer" : ""} gap-2`}
        style={{ backgroundColor: headerColor }}
        onDoubleClick={onToggleExpand}
        onContextMenu={onContextMenu}
        title={tooltipText}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Output node indicator */}
          {schema.output_node && (
            <div
              className="flex-shrink-0 rounded-full p-0.5"
              style={{
                backgroundColor: theme.colors.state?.success || "#22c55e",
              }}
              title="Output Node - triggers execution"
            >
              <ArrowDownToLine className="w-2.5 h-2.5 text-white" />
            </div>
          )}
          {/* Always execute indicator */}
          {schema.always_execute && (
            <div
              className="flex-shrink-0 rounded-full p-0.5"
              style={{
                backgroundColor: theme.colors.state?.warning || "#f59e0b",
              }}
              title="Always Execute - skips cache"
            >
              <Zap className="w-2.5 h-2.5 text-white" />
            </div>
          )}
          {/* Node type icon */}
          <NodeIcon icon={schema.ui.icon} className="w-3 h-3" />
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
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onAiAssist && <AiAssistButton onSelect={onAiAssist} />}
          {hasValidationIssues && (
            <ValidationIndicator
              errors={validationErrors}
              warnings={validationWarnings}
              duplicateNameError={duplicateNameError}
            />
          )}
          <ChevronIcon className="w-3 h-3 text-white opacity-60" />
        </div>
      </div>
    );
  },
);

CustomNodeHeader.displayName = "CustomNodeHeader";

export default CustomNodeHeader;
