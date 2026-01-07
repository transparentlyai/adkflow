/**
 * Field Definition Types
 *
 * Defines configuration field structures for custom node expanded views.
 */

/**
 * Defines a configuration field in the node's expanded view.
 *
 * Fields are UI controls that allow users to configure the node's behavior.
 * They can be organized into tabs and sections for complex nodes.
 *
 * @example Text input field
 * ```typescript
 * const nameField: FieldDefinition = {
 *   id: "name",
 *   label: "Name",
 *   widget: "text_input",
 *   default: "my_node",
 *   placeholder: "Enter node name",
 * };
 * ```
 *
 * @example Select field with options
 * ```typescript
 * const typeField: FieldDefinition = {
 *   id: "type",
 *   label: "Type",
 *   widget: "select",
 *   default: "default",
 *   options: [
 *     { value: "default", label: "Default" },
 *     { value: "custom", label: "Custom" },
 *   ],
 * };
 * ```
 *
 * @example Conditional field (only shown when type="custom")
 * ```typescript
 * const customField: FieldDefinition = {
 *   id: "custom_value",
 *   label: "Custom Value",
 *   widget: "text_input",
 *   show_if: { type: "custom" },  // Only visible when type field equals "custom"
 * };
 * ```
 *
 * @example Code editor field
 * ```typescript
 * const codeField: FieldDefinition = {
 *   id: "code",
 *   label: "Python Code",
 *   widget: "code_editor",
 *   language: "python",
 *   tab: "Code",
 * };
 * ```
 */
export interface FieldDefinition {
  /** Unique identifier for the field (used as config key) */
  id: string;
  /** Display label shown next to the widget */
  label: string;
  /**
   * Widget type for rendering the field.
   * Available widgets: text_input, text_area, select, number, checkbox,
   * code_editor, slider, color_picker
   */
  widget: string;
  /** Default value for the field */
  default?: unknown;
  /** Whether this field is required for validation */
  required?: boolean;
  /** Options for select/dropdown widgets */
  options?: { value: string; label: string }[];
  /** Minimum value for number/slider widgets */
  min_value?: number;
  /** Maximum value for number/slider widgets */
  max_value?: number;
  /** Step increment for number/slider widgets */
  step?: number;
  /** Placeholder text for text inputs */
  placeholder?: string;
  /** Help text shown below the field */
  help_text?: string;
  /**
   * Conditional visibility: field is only shown when all conditions match.
   * Keys are field IDs, values are the required values.
   */
  show_if?: Record<string, unknown>;
  /** Tab name for organizing fields (appears in tab bar) */
  tab?: string;
  /** Section name for grouping fields within a tab (appears as subheader) */
  section?: string;
  /** Language for syntax highlighting in code_editor widget */
  language?: string;
  /** Hide left gutter (line numbers, etc.) for code_editor widget */
  hide_gutter?: boolean;
}
