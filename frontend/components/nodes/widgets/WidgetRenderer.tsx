"use client";

import type { Theme } from "@/lib/themes/types";
import TextInputWidget from "@/components/nodes/widgets/TextInputWidget";
import TextAreaWidget from "@/components/nodes/widgets/TextAreaWidget";
import NumberInputWidget from "@/components/nodes/widgets/NumberInputWidget";
import SelectWidget from "@/components/nodes/widgets/SelectWidget";
import CheckboxWidget from "@/components/nodes/widgets/CheckboxWidget";
import SliderWidget from "@/components/nodes/widgets/SliderWidget";
import JsonTreeWidget from "@/components/nodes/widgets/JsonTreeWidget";
import ChatLogWidget from "@/components/nodes/widgets/ChatLogWidget";
import RadioGroupWidget from "@/components/nodes/widgets/RadioGroupWidget";
import FilePickerWidget from "@/components/nodes/widgets/FilePickerWidget";

/**
 * Widget type identifiers for form field rendering.
 * Supports both lowercase (legacy) and snake_case (Python WidgetType enum) naming.
 */
export type WidgetType =
  | "text"
  | "text_input"
  | "textarea"
  | "text_area"
  | "number"
  | "number_input"
  | "select"
  | "checkbox"
  | "slider"
  | "color"
  | "file_picker"
  | "code_editor"
  | "json_tree"
  | "chat_log"
  | "radio_group"
  | "monaco_editor"
  | "file_display"
  | "variable_display";

/**
 * Option for select widgets.
 */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Field definition for dynamic form widgets.
 */
export interface FieldDefinition {
  id: string;
  label: string;
  widget: WidgetType | string;
  default?: unknown;
  options?: SelectOption[];
  min_value?: number;
  max_value?: number;
  step?: number;
  placeholder?: string;
  help_text?: string;
  show_if?: Record<string, unknown>;
}

/**
 * Render options for widgets.
 */
export interface WidgetRenderOptions {
  disabled?: boolean;
  theme: Theme;
}

/**
 * Props interface for individual widget components.
 */
export interface WidgetProps {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  options: WidgetRenderOptions;
}

/**
 * Registry of widget components by type.
 * Supports both lowercase (legacy) and snake_case (Python WidgetType enum) naming.
 */
const WIDGET_MAP: Record<string, React.ComponentType<WidgetProps>> = {
  text: TextInputWidget,
  text_input: TextInputWidget,
  textarea: TextAreaWidget,
  text_area: TextAreaWidget,
  number: NumberInputWidget,
  number_input: NumberInputWidget,
  select: SelectWidget,
  checkbox: CheckboxWidget,
  slider: SliderWidget,
  json_tree: JsonTreeWidget,
  chat_log: ChatLogWidget,
  radio_group: RadioGroupWidget,
  file_picker: FilePickerWidget,
  // Note: monaco_editor, file_display, and variable_display require special props
  // and should be rendered directly using their components:
  // - MonacoEditorWidget: import from "@/components/nodes/widgets/MonacoEditorWidget"
  // - FileDisplayWidget: import from "@/components/nodes/widgets/FileDisplayWidget"
  // - VariableDisplayWidget: import from "@/components/nodes/widgets/VariableDisplayWidget"
};

/**
 * Renders a form widget based on the field definition's widget type.
 * Uses component-based approach for modularity and extensibility.
 * Supports: text, textarea, number, select, checkbox, slider, color
 */
export function renderWidget(
  field: FieldDefinition,
  value: unknown,
  onChange: (value: unknown) => void,
  options: WidgetRenderOptions
): React.ReactNode {
  const Widget = WIDGET_MAP[field.widget];

  if (Widget) {
    return <Widget field={field} value={value} onChange={onChange} options={options} />;
  }

  // Handle color widget inline (not yet a separate component)
  if (field.widget === "color") {
    return (
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={(value as string) ?? "#000000"}
          onChange={(e) => onChange(e.target.value)}
          disabled={options.disabled}
          className="w-8 h-8 rounded border cursor-pointer"
          style={{
            borderColor: options.theme.colors.nodes.common.container.border,
          }}
        />
        <span
          className="text-xs"
          style={{ color: options.theme.colors.nodes.common.text.secondary }}
        >
          {(value as string) ?? "#000000"}
        </span>
      </div>
    );
  }

  // Fallback to text input for unknown widget types
  return <TextInputWidget field={field} value={value} onChange={onChange} options={options} />;
}
