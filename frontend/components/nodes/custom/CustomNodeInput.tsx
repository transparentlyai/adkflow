"use client";

import { memo, useCallback } from "react";
import { Handle, Position } from "@xyflow/react";
import { Circle } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useConnection } from "@/contexts/ConnectionContext";
import { isTypeCompatible } from "@/lib/types";
import HandleTooltip from "@/components/HandleTooltip";
import { renderWidget } from "@/components/nodes/widgets/WidgetRenderer";
import NodeIcon from "@/components/nodes/custom/NodeIcon";
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
  onConfigChange: (fieldId: string, value: unknown) => void;
}

/**
 * Renders an input port with handle and optional inline widget.
 * Supports both connection-only inputs and inputs with editable values.
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
    const connectionOnly = input.connection_only !== false; // Default to true

    // Connection-only input (no manual editing)
    if (connectionOnly) {
      return (
        <div className="space-y-1">
          <label
            className="text-xs font-medium"
            style={{ color: theme.colors.nodes.common.text.secondary }}
          >
            {input.label}
            {input.required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          <div
            className="relative flex items-center gap-2 px-2 py-1 text-sm border rounded"
            style={{
              backgroundColor: theme.colors.nodes.common.footer.background,
              borderColor: theme.colors.nodes.common.container.border,
            }}
          >
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
                style={{
                  position: "absolute",
                  left: -5,
                  top: "50%",
                  transform: "translateY(-50%)",
                  transition: "box-shadow 0.15s ease",
                  width: 10,
                  height: 10,
                  border: `2px solid ${theme.colors.handles.border}`,
                  backgroundColor: handleColor,
                  ...validityStyle,
                }}
              />
            </HandleTooltip>
            {input.icon ? (
              <NodeIcon
                icon={input.icon}
                className="w-3 h-3"
                style={{
                  color: isConnected
                    ? handleColor
                    : theme.colors.nodes.common.text.muted,
                }}
              />
            ) : (
              <Circle
                className="w-3 h-3 flex-shrink-0"
                style={{ color: theme.colors.nodes.common.text.muted }}
              />
            )}
            <span
              className={`text-xs truncate ${isConnected ? "" : "italic"}`}
              style={{
                color: isConnected
                  ? theme.colors.nodes.common.text.primary
                  : theme.colors.nodes.common.text.muted,
              }}
            >
              {isConnected ? connectedSourceName : "None"}
            </span>
          </div>
        </div>
      );
    }

    // Input with inline editor (connection_only=false)
    // Create a pseudo-field for the widget renderer
    const inputAsField: FieldDefinition = {
      id: input.id,
      label: input.label,
      widget: input.widget || "text_input",
      default: input.default,
      placeholder: input.placeholder,
      options: input.options,
    };

    return (
      <div className="space-y-1">
        <label
          className="text-xs font-medium"
          style={{ color: theme.colors.nodes.common.text.secondary }}
        >
          {input.label}
          {input.required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        <div
          className="relative flex items-center gap-2"
          style={{ paddingLeft: 4 }}
        >
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
              style={{
                position: "absolute",
                left: -5,
                top: "50%",
                transform: "translateY(-50%)",
                transition: "box-shadow 0.15s ease",
                width: 10,
                height: 10,
                border: `2px solid ${theme.colors.handles.border}`,
                backgroundColor: handleColor,
                ...validityStyle,
              }}
            />
          </HandleTooltip>
          {isConnected ? (
            // When connected, show source name (read-only)
            <div
              className="flex-1 flex items-center gap-2 px-2 py-1 text-sm border rounded"
              style={{
                backgroundColor: theme.colors.nodes.common.footer.background,
                borderColor: theme.colors.nodes.common.container.border,
                opacity: 0.7,
              }}
            >
              {input.icon ? (
                <NodeIcon
                  icon={input.icon}
                  className="w-3 h-3"
                  style={{ color: handleColor }}
                />
              ) : (
                <Circle
                  className="w-3 h-3 flex-shrink-0"
                  style={{ color: theme.colors.ui.primary }}
                />
              )}
              <span
                className="text-xs truncate"
                style={{ color: theme.colors.nodes.common.text.primary }}
              >
                {connectedSourceName}
              </span>
            </div>
          ) : (
            // When not connected, show editable widget
            <div className="flex-1 min-w-0">
              {renderWidget(
                inputAsField,
                config[input.id] ?? input.default,
                (value) => onConfigChange(input.id, value),
                { disabled: isNodeLocked, theme },
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);

CustomNodeInput.displayName = "CustomNodeInput";

export default CustomNodeInput;
