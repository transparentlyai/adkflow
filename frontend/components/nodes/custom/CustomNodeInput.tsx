"use client";

import { memo, useCallback } from "react";
import { Handle, Position } from "@xyflow/react";
import { ArrowRight } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useConnection } from "@/contexts/ConnectionContext";
import { isTypeCompatible } from "@/lib/types";
import HandleTooltip from "@/components/HandleTooltip";
import { renderWidget } from "@/components/nodes/widgets/WidgetRenderer";
import type {
  PortDefinition,
  FieldDefinition,
} from "@/components/nodes/CustomNode";
import type { HandleTypeInfo } from "@/components/nodes/custom/hooks/useCustomNodeHandleTypes";

export interface CustomNodeInputProps {
  input: PortDefinition;
  config: Record<string, unknown>;
  isConnected: boolean;
  connectedSourceName?: string;
  handleTypeInfo?: HandleTypeInfo;
  nodeId: string;
  isNodeLocked?: boolean;
  labelWidth?: number;
  onConfigChange: (fieldId: string, value: unknown) => void;
}

/**
 * Compact single-row input with label badge pattern.
 * Renders: [Handle]─[Label Badge]─[Arrow]─[Value/Widget]
 */
const CustomNodeInput = memo(
  ({
    input,
    config,
    isConnected,
    connectedSourceName,
    handleTypeInfo,
    nodeId,
    isNodeLocked,
    labelWidth,
    onConfigChange,
  }: CustomNodeInputProps) => {
    const { theme } = useTheme();
    const { connectionState } = useConnection();

    const getHandleValidityStyle = useCallback(
      (
        acceptedSources?: string[],
        acceptedTypes?: string[],
      ): React.CSSProperties => {
        if (!connectionState.isDragging || !acceptedSources || !acceptedTypes) {
          return {};
        }
        const invalidColor = theme.colors.state?.invalid?.ring || "#ef4444";
        const validColor = theme.colors.state?.valid?.ring || "#22c55e";
        if (connectionState.sourceNodeId === nodeId) {
          return {
            boxShadow: `0 0 0 2px ${invalidColor}, 0 0 8px 2px ${invalidColor}`,
            cursor: "not-allowed",
          };
        }
        const isValid = isTypeCompatible(
          connectionState.sourceOutputSource,
          connectionState.sourceOutputType,
          acceptedSources,
          acceptedTypes,
        );
        if (isValid) {
          return {
            boxShadow: `0 0 0 2px ${validColor}, 0 0 8px 2px ${validColor}`,
            cursor: "pointer",
          };
        }
        return {
          boxShadow: `0 0 0 2px ${invalidColor}, 0 0 8px 2px ${invalidColor}`,
          cursor: "not-allowed",
        };
      },
      [connectionState, nodeId, theme.colors],
    );

    const validityStyle = getHandleValidityStyle(
      handleTypeInfo?.acceptedSources,
      handleTypeInfo?.acceptedTypes,
    );
    const handleColor = input.handle_color || theme.colors.handles.input;
    const connectionOnly = input.connection_only !== false;

    // Check if widget needs multi-line support
    const isMultiLine =
      input.widget === "textarea" || input.widget === "text_area";

    // Handle style
    // For multi-line: position at 11px to align with label text center (pt-1 = 4px + ~7px half line-height)
    const handleStyle: React.CSSProperties = {
      position: "absolute",
      left: -5,
      top: isMultiLine ? 11 : "50%",
      transform: "translateY(-50%)",
      transition: "box-shadow 0.15s ease",
      width: 10,
      height: 10,
      border: `2px solid ${theme.colors.handles.border}`,
      backgroundColor: handleColor,
      ...validityStyle,
    };

    // Create pseudo-field for widget renderer
    const inputAsField: FieldDefinition = {
      id: input.id,
      label: input.label,
      widget: input.widget || "text_input",
      default: input.default,
      placeholder: input.placeholder,
      options: input.options,
    };

    // Compact for connection-only, taller for editable widgets
    const rowHeight = connectionOnly ? "min-h-5" : "min-h-7";

    return (
      <div
        className={`relative flex ${isMultiLine ? "items-start" : "items-center"} ${rowHeight} gap-1`}
        style={{ paddingLeft: 10 }}
      >
        {/* Handle */}
        <HandleTooltip
          label={input.label}
          sourceType={input.source_type}
          dataType={input.data_type}
          type="input"
        >
          <Handle
            type="target"
            position={Position.Left}
            id={input.id}
            style={handleStyle}
          />
        </HandleTooltip>

        {/* Label - dynamic width for alignment, pt-1 for multi-line */}
        <span
          className={`flex-shrink-0 text-[10px] font-medium ${isMultiLine ? "pt-1" : ""}`}
          style={{
            color: theme.colors.nodes.common.text.secondary,
            minWidth: labelWidth ? `${labelWidth * 0.55}ch` : undefined,
          }}
        >
          {input.label}
          {input.required && <span className="text-red-500 ml-0.5">*</span>}
        </span>

        {/* Connection arrow when connected */}
        {isConnected && (
          <ArrowRight
            className="w-3 h-3 flex-shrink-0"
            style={{ color: theme.colors.nodes.common.text.muted }}
          />
        )}

        {/* Value area */}
        {isConnected ? (
          <span
            className="flex-1 text-[11px] truncate font-medium"
            style={{ color: handleColor }}
          >
            {connectedSourceName}
          </span>
        ) : connectionOnly ? null : (
          <div className="flex-1 min-w-0">
            {renderWidget(
              inputAsField,
              config[input.id] ?? input.default,
              (value) => onConfigChange(input.id, value),
              { disabled: isNodeLocked, theme, compact: true },
            )}
          </div>
        )}
      </div>
    );
  },
);

CustomNodeInput.displayName = "CustomNodeInput";

export default CustomNodeInput;
