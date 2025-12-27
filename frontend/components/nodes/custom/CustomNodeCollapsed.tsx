"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { useTheme } from "@/contexts/ThemeContext";
import DraggableHandle from "@/components/DraggableHandle";
import ValidationIndicator from "@/components/nodes/ValidationIndicator";
import CustomNodeHeader from "@/components/nodes/custom/CustomNodeHeader";
import type {
  CustomNodeSchema,
  CustomNodeData,
} from "@/components/nodes/CustomNode";
import type { HandlePositions } from "@/lib/types";
import type { HandleTypes } from "@/components/nodes/custom/hooks/useCustomNodeHandleTypes";

export interface CustomNodeCollapsedProps {
  id: string;
  nodeData: CustomNodeData;
  schema: CustomNodeSchema;
  name: string;
  handlePositions?: HandlePositions;
  handleTypes: HandleTypes;
  headerColor: string;
  onToggleExpand: () => void;
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
 * Collapsed view of a CustomNode.
 * Shows minimal info with draggable handles for connections.
 */
const CustomNodeCollapsed = memo(
  ({
    id,
    nodeData,
    schema,
    name,
    handlePositions,
    handleTypes,
    headerColor,
    onToggleExpand,
    isEditing,
    editedName,
    inputRef,
    onNameClick,
    onNameChange,
    onNameSave,
    onNameKeyDown,
  }: CustomNodeCollapsedProps) => {
    const { theme } = useTheme();

    const handleStyle = {
      width: 10,
      height: 10,
      border: `2px solid ${theme.colors.handles.border}`,
    };

    return (
      <div
        className="rounded-lg shadow-md cursor-pointer"
        style={{
          backgroundColor: headerColor,
          minWidth: 120,
        }}
        onDoubleClick={onToggleExpand}
        title="Double-click to configure"
      >
        <ValidationIndicator
          errors={nodeData.validationErrors}
          warnings={nodeData.validationWarnings}
        />

        <DraggableHandle
          nodeId={id}
          handleId="input"
          type="target"
          defaultEdge="left"
          defaultPercent={50}
          handlePositions={handlePositions}
          acceptedSources={handleTypes["input"]?.acceptedSources}
          acceptedTypes={handleTypes["input"]?.acceptedTypes}
          style={{
            ...handleStyle,
            backgroundColor: theme.colors.handles.input,
          }}
        />

        {/* Hidden handles for each input to support direct connections */}
        {schema.ui.inputs.map((input) => (
          <Handle
            key={input.id}
            type="target"
            position={Position.Left}
            id={input.id}
            style={{ opacity: 0, pointerEvents: "none", top: "50%", left: 0 }}
          />
        ))}

        <CustomNodeHeader
          name={name}
          schema={schema}
          headerColor={headerColor}
          isExpanded={false}
          onToggleExpand={onToggleExpand}
          isEditing={isEditing}
          editedName={editedName}
          inputRef={inputRef}
          onNameClick={onNameClick}
          onNameChange={onNameChange}
          onNameSave={onNameSave}
          onNameKeyDown={onNameKeyDown}
        />

        {/* Output handles */}
        {schema.ui.outputs.map((output, i) => (
          <DraggableHandle
            key={output.id}
            nodeId={id}
            handleId={output.id}
            type="source"
            defaultEdge="right"
            defaultPercent={((i + 1) / (schema.ui.outputs.length + 1)) * 100}
            handlePositions={handlePositions}
            title={output.label}
            outputSource={handleTypes[output.id]?.outputSource}
            outputType={handleTypes[output.id]?.outputType}
          />
        ))}
      </div>
    );
  },
);

CustomNodeCollapsed.displayName = "CustomNodeCollapsed";

export default CustomNodeCollapsed;
