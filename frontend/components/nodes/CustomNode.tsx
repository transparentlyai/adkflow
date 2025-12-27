"use client";

import { memo, useState, useCallback, useEffect, useMemo } from "react";
import { type NodeProps, useReactFlow } from "@xyflow/react";
import { useTheme } from "@/contexts/ThemeContext";
import { useProject } from "@/contexts/ProjectContext";
import { readPrompt } from "@/lib/api";
import type { HandlePositions, NodeExecutionState } from "@/lib/types";

// Import refactored hooks and components
import {
  useCustomNodeTabs,
  useCustomNodeHandleTypes,
  useConnectedInputs,
  useCustomNodeName,
  CustomNodeCollapsed,
  CustomNodeExpanded,
} from "@/components/nodes/custom";

/**
 * =============================================================================
 * CUSTOM NODE SCHEMA TYPES
 * =============================================================================
 *
 * These types define the schema structure for custom nodes in the flow editor.
 * Extension developers can use these types to create custom node definitions
 * that are rendered by the CustomNode component.
 *
 * @example Basic Extension Node Schema
 * ```typescript
 * const myNodeSchema: CustomNodeSchema = {
 *   unit_id: "my_extension.my_node",
 *   label: "My Custom Node",
 *   menu_location: "My Extension",
 *   description: "A custom node that does something useful",
 *   version: "1.0.0",
 *   ui: {
 *     inputs: [...],
 *     outputs: [...],
 *     fields: [...],
 *     color: "#3b82f6",
 *     icon: "gear",
 *     expandable: true,
 *     default_width: 300,
 *     default_height: 200,
 *   }
 * };
 * ```
 */

/**
 * Defines an input or output port on a node.
 *
 * Ports are connection points where edges can be attached. Inputs accept
 * connections from other nodes, while outputs provide data to downstream nodes.
 *
 * @example Input port with manual fallback
 * ```typescript
 * const input: PortDefinition = {
 *   id: "prompt",
 *   label: "Prompt",
 *   source_type: "prompt",
 *   data_type: "str",
 *   required: true,
 *   multiple: false,
 *   connection_only: false,  // Shows text input when not connected
 *   widget: "text_area",
 *   placeholder: "Enter your prompt...",
 * };
 * ```
 *
 * @example Connection-only input
 * ```typescript
 * const input: PortDefinition = {
 *   id: "agent_input",
 *   label: "Agent Input",
 *   source_type: "agent",
 *   data_type: "agent",
 *   accepted_sources: ["agent", "llm"],  // Accept multiple source types
 *   required: false,
 *   multiple: true,  // Allow multiple connections
 *   connection_only: true,  // No manual input, connections only
 * };
 * ```
 */
export interface PortDefinition {
  /** Unique identifier for the port (used as handle ID) */
  id: string;
  /** Display label shown next to the handle */
  label: string;
  /** Source type for connection compatibility (e.g., "prompt", "agent", "tool") */
  source_type: string;
  /** Data type of the value (e.g., "str", "int", "agent") */
  data_type: string;
  /** Array of accepted source types for inputs (defaults to [source_type]) */
  accepted_sources?: string[];
  /** Array of accepted data types for inputs (defaults to [data_type]) */
  accepted_types?: string[];
  /** Whether a connection is required for the node to be valid */
  required: boolean;
  /** Whether multiple connections are allowed */
  multiple: boolean;
  /** Tab name for organizing ports in expanded view */
  tab?: string;
  /** Section name for grouping ports within a tab */
  section?: string;
  /** Custom color for the handle (overrides default) */
  handle_color?: string;
  /**
   * Icon identifier for the port (displayed in labels and connected items).
   * Uses same icon names as node icons: "document", "database", "gear", "code", "monitor", etc.
   */
  icon?: string;
  /**
   * When true: only accepts connections (no manual input widget)
   * When false: shows editable field, disabled when connected
   */
  connection_only?: boolean;
  /** Widget type for manual input (when connection_only=false) */
  widget?: string;
  /** Default value for the port */
  default?: unknown;
  /** Placeholder text for the input widget */
  placeholder?: string;
  /** Options for select/dropdown widgets */
  options?: { value: string; label: string }[];
}

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
}

/**
 * Layout types for different node shapes in collapsed mode.
 *
 * Each layout provides a distinct visual appearance optimized for different
 * use cases. The layout determines the shape, size, and what information
 * is displayed when the node is collapsed.
 *
 * @example Using different layouts
 * ```typescript
 * // Pill layout for simple nodes (header only)
 * ui: { layout: "pill", ... }
 *
 * // Full layout for complex nodes (header + body + footer)
 * ui: { layout: "full", collapsed_body: {...}, collapsed_footer: {...} }
 *
 * // Circle layout for action buttons
 * ui: { layout: "circle", on_click: "run_workflow" }
 * ```
 */
export type NodeLayout =
  /** Standard expandable panel with header, content area, and footer (default) */
  | "standard"
  /** Pill-shaped compact node showing only the header (VariableNode, Prompt, Context, Tool) */
  | "pill"
  /** Header + body content, no footer - for nodes showing signatures (ProcessNode) */
  | "pill_body"
  /** Header + body + footer - for complex nodes (AgentNode with model, connections, type) */
  | "full"
  /** Circular button shape (StartNode for run action, probe nodes when collapsed) */
  | "circle"
  /** Octagonal shape (EndNode) */
  | "octagon"
  /** Diamond connector shape (legacy, use "tag" for new nodes) */
  | "diamond"
  /** Tag/arrow shape for teleport nodes - uses TeleporterContext for dynamic colors */
  | "tag"
  /** Small compact pill for auxiliary nodes (AgentToolNode) */
  | "compact"
  /** Full panel with sections - legacy alias for "standard" */
  | "panel";

/**
 * Configuration for what to display in the collapsed node header.
 *
 * Controls the text shown in the node header when collapsed. Supports
 * template strings with field placeholders, connected node display,
 * and special formatting options.
 *
 * @example Simple name display
 * ```typescript
 * collapsed_display: {
 *   format: "{name}",  // Shows the node's name field value
 * }
 * ```
 *
 * @example Formatted display with prefix
 * ```typescript
 * collapsed_display: {
 *   format: "Model: {model}",  // Shows "Model: gemini-2.5-flash"
 * }
 * ```
 *
 * @example Variable with braces (shows "{variableName}")
 * ```typescript
 * collapsed_display: {
 *   format: "{name}",
 *   show_with_braces: true,  // Wraps result in literal braces
 * }
 * ```
 */
export interface CollapsedDisplay {
  /** Field IDs whose values should be concatenated as summary text */
  summary_fields?: string[];
  /**
   * Format string with {field_id} placeholders for templated display.
   * Example: "{name}" or "Model: {model}"
   */
  format?: string;
  /** Whether to show connected input names in the header */
  show_connections?: boolean;
  /**
   * Wrap the displayed text in literal braces (for VariableNode style).
   * When true, "{myVar}" format results in displaying "{myVar}" with visible braces.
   */
  show_with_braces?: boolean;
}

/**
 * Configuration for body content in "pill_body" and "full" layouts.
 *
 * The body section appears below the header and can display field values,
 * connected node names, or parsed function signatures.
 *
 * @example AgentNode showing model and connections
 * ```typescript
 * collapsed_body: {
 *   show_field: "model",           // Shows "gemini-2.5-flash" in body
 *   show_connected: ["prompt", "tools"],  // Shows connected prompts/tools
 * }
 * ```
 *
 * @example ProcessNode showing function signature
 * ```typescript
 * collapsed_body: {
 *   show_function_signature: true,  // Parses and shows "def process(data):"
 *   code_field: "code",             // Field containing the Python code
 * }
 * ```
 */
export interface CollapsedBody {
  /** Field ID whose value to display (e.g., "model" shows model name) */
  show_field?: string;
  /**
   * Input handle IDs for which to display connected node names.
   * Example: ["prompt", "tools"] shows names of connected prompt and tool nodes.
   */
  show_connected?: string[];
  /** Parse and display function signature from code field (for ProcessNode) */
  show_function_signature?: boolean;
  /** Field ID containing code to parse for function signature */
  code_field?: string;
}

/**
 * Configuration for footer content in "full" layout.
 *
 * The footer appears at the bottom of the collapsed node and can show
 * a label on the left and/or a type badge on the right.
 *
 * @example Simple footer with label
 * ```typescript
 * collapsed_footer: {
 *   left_text: "Agent",  // Shows "Agent" on left side of footer
 * }
 * ```
 *
 * @example Footer with type badge
 * ```typescript
 * collapsed_footer: {
 *   left_text: "Agent",
 *   show_type_badge: true,
 *   type_field: "type",
 *   type_labels: {
 *     "llm": "LLM",
 *     "sequential": "Sequential",
 *     "parallel": "Parallel",
 *   },
 * }
 * ```
 */
export interface CollapsedFooter {
  /** Text shown on the left side of the footer (e.g., "Agent", "Process") */
  left_text?: string;
  /** Whether to show a type badge on the right side */
  show_type_badge?: boolean;
  /** Field ID to read the type value from */
  type_field?: string;
  /** Map of type values to display labels (e.g., { "llm": "LLM" }) */
  type_labels?: Record<string, string>;
}

/**
 * Configuration for handle (connection point) positions.
 *
 * Controls where input and output handles are placed on the node,
 * and allows adding additional handles for specialized connections
 * like agent chaining.
 *
 * @example Standard left-to-right flow
 * ```typescript
 * handle_layout: {
 *   input_position: "left",
 *   output_position: "right",
 * }
 * ```
 *
 * @example Agent node with chaining handles
 * ```typescript
 * handle_layout: {
 *   input_position: "left",
 *   output_position: "right",
 *   additional_handles: [
 *     { id: "link-top", type: "source", position: "top", label: "Chain Out" },
 *     { id: "link-bottom", type: "target", position: "bottom", label: "Chain In" },
 *   ],
 * }
 * ```
 */
export interface HandleLayout {
  /** Position for the main input handle. Default: "left" */
  input_position?: "left" | "top" | "right" | "bottom";
  /** Position for the main output handle. Default: "right" */
  output_position?: "left" | "top" | "right" | "bottom";
  /**
   * Additional handles for specialized connections (e.g., agent chaining).
   * Each handle has a unique ID, type (source/target), position, and optional label.
   */
  additional_handles?: {
    /** Unique identifier for the handle */
    id: string;
    /** Handle type: "source" (output) or "target" (input) */
    type: "source" | "target";
    /** Position on the node */
    position: "left" | "top" | "right" | "bottom";
    /** Optional label shown on hover */
    label?: string;
  }[];
}

/**
 * Complete schema definition for a custom node.
 *
 * This is the main interface that extension developers use to define
 * custom nodes. It specifies the node's identity, behavior, appearance,
 * and all its configuration options.
 *
 * @example Complete extension node schema
 * ```typescript
 * const myNodeSchema: CustomNodeSchema = {
 *   unit_id: "my_extension.data_processor",
 *   label: "Data Processor",
 *   menu_location: "My Extension/Processing",
 *   description: "Processes data with custom logic",
 *   version: "1.0.0",
 *   output_node: true,  // Triggers execution trace
 *
 *   ui: {
 *     inputs: [
 *       {
 *         id: "data",
 *         label: "Input Data",
 *         source_type: "data",
 *         data_type: "any",
 *         required: true,
 *         multiple: false,
 *         connection_only: true,
 *       },
 *     ],
 *     outputs: [
 *       {
 *         id: "result",
 *         label: "Result",
 *         source_type: "data",
 *         data_type: "any",
 *         required: false,
 *         multiple: false,
 *       },
 *     ],
 *     fields: [
 *       { id: "name", label: "Name", widget: "text_input", default: "processor" },
 *       { id: "mode", label: "Mode", widget: "select", options: [...] },
 *     ],
 *     color: "#3b82f6",
 *     icon: "gear",
 *     expandable: true,
 *     default_width: 300,
 *     default_height: 200,
 *     layout: "pill",
 *     theme_key: "tool",
 *     collapsed_display: { format: "{name}" },
 *   },
 * };
 * ```
 */
export interface CustomNodeSchema {
  /**
   * Unique identifier for the node type.
   * Format: "extension_name.node_name" (e.g., "my_extension.processor")
   */
  unit_id: string;
  /** Display name shown in the node header and menus */
  label: string;
  /**
   * Location in the add-node menu.
   * Use "/" for submenus (e.g., "My Extension/Tools")
   */
  menu_location: string;
  /** Description shown in tooltips and documentation */
  description: string;
  /** Schema version string (e.g., "1.0.0") */
  version: string;

  // ─────────────────────────────────────────────────────────────────────────
  // Execution Control Properties
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Mark as output/sink node that triggers execution trace.
   * When true, this node will be included in the execution order calculation.
   */
  output_node?: boolean;
  /**
   * Skip cache and always execute this node.
   * Useful for nodes with side effects or external dependencies.
   */
  always_execute?: boolean;

  // ─────────────────────────────────────────────────────────────────────────
  // UI Configuration
  // ─────────────────────────────────────────────────────────────────────────

  ui: {
    /** Input port definitions */
    inputs: PortDefinition[];
    /** Output port definitions */
    outputs: PortDefinition[];
    /** Configuration field definitions */
    fields: FieldDefinition[];
    /**
     * Tab names for organizing fields in expanded view.
     * Fields/inputs with matching `tab` property appear in that tab.
     */
    tabs?: string[];
    /** Primary color for the node header (hex string, e.g., "#3b82f6") */
    color: string;
    /**
     * Icon identifier for the node header.
     * Built-in icons: "document", "database", "gear", "code", "monitor"
     * Lucide icons: "Play", "Square", "Send", "FileInput", etc.
     */
    icon?: string;
    /** Whether the node can be expanded to show full configuration */
    expandable: boolean;
    /** Default width in pixels when expanded */
    default_width: number;
    /** Default height in pixels when expanded */
    default_height: number;

    // ─────────────────────────────────────────────────────────────────────
    // Layout and Appearance
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Layout type for collapsed appearance.
     * @see NodeLayout for available options
     */
    layout?: NodeLayout;
    /**
     * Theme key for looking up node-specific colors.
     * Options: "variable", "agent", "prompt", "context", "tool", "process", etc.
     */
    theme_key?: string;
    /** Configuration for collapsed header display */
    collapsed_display?: CollapsedDisplay;
    /** Body content configuration for pill_body and full layouts */
    collapsed_body?: CollapsedBody;
    /** Footer configuration for full layout */
    collapsed_footer?: CollapsedFooter;
    /** Fixed width when collapsed (pixels). If not set, uses content width. */
    collapsed_width?: number;
    /** Minimum width when collapsed (pixels). Ensures consistent sizing across similar nodes. */
    min_collapsed_width?: number;
    /**
     * Action to perform when the node is clicked (for circle/button layouts).
     * Options: "run_workflow", "toggle_expand"
     */
    on_click?: string;
    /** Handle position configuration */
    handle_layout?: HandleLayout;
    /**
     * Whether the node can be resized when expanded.
     * When true, shows a resize handle in the bottom-right corner.
     */
    resizable?: boolean;
    /** Minimum width when resizing (pixels). Defaults to 200. */
    min_width?: number;
    /** Minimum height when resizing (pixels). Defaults to 150. */
    min_height?: number;
  };
}

/**
 * Runtime data stored on a CustomNode instance.
 *
 * This interface defines the data structure that is stored in ReactFlow's
 * node data property. It includes the schema, current configuration values,
 * and runtime state like expansion and execution status.
 *
 * @example Creating node data from schema
 * ```typescript
 * const nodeData = getDefaultCustomNodeData(myNodeSchema);
 * // nodeData.config contains default values from schema
 * // nodeData.handleTypes contains connection type info
 * ```
 */
export interface CustomNodeData {
  /** The node's schema definition */
  schema: CustomNodeSchema;
  /** Display name (overrides schema.label) */
  name?: string;
  /** Current configuration values keyed by field ID */
  config: Record<string, unknown>;
  /** Handle position overrides */
  handlePositions?: HandlePositions;
  /**
   * Handle type information for connection validation.
   * Computed from schema inputs/outputs.
   */
  handleTypes?: Record<
    string,
    {
      outputSource?: string;
      outputType?: string;
      acceptedSources?: string[];
      acceptedTypes?: string[];
    }
  >;
  /** Current size when expanded (for resizable nodes) */
  expandedSize?: { width: number; height: number };
  /** Whether the node is currently expanded */
  isExpanded?: boolean;
  /** Whether the node is locked (prevents editing) */
  isNodeLocked?: boolean;
  /** Current execution state for visual feedback */
  executionState?: NodeExecutionState;
  /** List of validation error messages */
  validationErrors?: string[];
  /** List of validation warning messages */
  validationWarnings?: string[];
  /** Client-side duplicate name error message */
  duplicateNameError?: string;
}

const CustomNode = memo(({ data, id, selected }: NodeProps) => {
  const nodeData = data as unknown as CustomNodeData;
  const {
    schema,
    name: dataName,
    config = {},
    handlePositions,
    isExpanded: dataIsExpanded,
    isNodeLocked,
  } = nodeData;
  const name = dataName || (config.name as string) || schema.label;
  const { setNodes } = useReactFlow();
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(dataIsExpanded ?? false);

  // Use refactored hooks
  const { tabs, activeTab, setActiveTab } = useCustomNodeTabs(schema);
  const handleTypes = useCustomNodeHandleTypes(schema);
  const connectedInputs = useConnectedInputs(id, schema.ui.inputs);
  const {
    isEditing,
    editedName,
    inputRef,
    handleNameClick,
    handleNameChange,
    handleNameSave,
    handleNameKeyDown,
  } = useCustomNodeName({
    nodeId: id,
    initialName: name,
    isNodeLocked,
  });

  // File operation state for nodes with code_editor widget
  const { projectPath, onSaveFile, onRequestFilePicker } = useProject();
  const [isSaving, setIsSaving] = useState(false);
  const [savedContent, setSavedContent] = useState<string | null>(null);
  const [isContentLoaded, setIsContentLoaded] = useState(false);

  // Find code_editor field and file_path in schema
  const codeEditorField = useMemo(() => {
    return schema.ui.fields.find(
      (f) => f.widget === "code_editor" || f.widget === "monaco_editor",
    );
  }, [schema]);

  // Get file path from config (look for file_path field)
  const filePath = useMemo(() => {
    return (config.file_path as string) || "";
  }, [config.file_path]);

  // Get current code content from config
  const codeContent = useMemo(() => {
    if (!codeEditorField) return "";
    return (config[codeEditorField.id] as string) || "";
  }, [codeEditorField, config]);

  // Track dirty state for code editor
  const isDirty = isContentLoaded && codeContent !== savedContent;

  // Load content from file when expanded, or initialize dirty tracking for nodes without file
  useEffect(() => {
    const loadContent = async () => {
      if (!isExpanded || isContentLoaded) return;

      // Case 1: Node with code editor AND file path - load from file
      if (codeEditorField && filePath && projectPath) {
        try {
          const response = await readPrompt(projectPath, filePath);
          // Update config with loaded content
          setNodes((nodes) =>
            nodes.map((node) =>
              node.id === id
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      config: {
                        ...config,
                        [codeEditorField.id]: response.content,
                      },
                    },
                  }
                : node,
            ),
          );
          setSavedContent(response.content);
          setIsContentLoaded(true);
        } catch (error) {
          // File not found is expected for new nodes - treat current content as saved
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (errorMessage.includes("not found")) {
            setSavedContent(codeContent || "");
            setIsContentLoaded(true);
          } else {
            console.error("Failed to load file content:", error);
            // Still mark as loaded so we don't retry forever
            setSavedContent(codeContent || "");
            setIsContentLoaded(true);
          }
        }
      }
      // Case 2: Node with code editor but NO file path - track dirty against current content
      else if (codeEditorField && !filePath) {
        setSavedContent(codeContent || "");
        setIsContentLoaded(true);
      }
      // Case 3: Node without code editor - no dirty tracking needed
      else if (!codeEditorField) {
        setIsContentLoaded(true);
      }
    };
    loadContent();
  }, [
    isExpanded,
    isContentLoaded,
    filePath,
    projectPath,
    codeEditorField,
    id,
    config,
    codeContent,
    setNodes,
  ]);

  // Reset content loaded state when file path changes
  useEffect(() => {
    if (filePath) {
      setIsContentLoaded(false);
      setSavedContent(null);
    }
  }, [filePath]);

  // Save file handler
  const handleFileSave = useCallback(async () => {
    if (!onSaveFile || !filePath || !codeEditorField) return;
    setIsSaving(true);
    try {
      await onSaveFile(filePath, codeContent);
      setSavedContent(codeContent);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  }, [onSaveFile, filePath, codeContent, codeEditorField]);

  // Change file handler
  const handleChangeFile = useCallback(() => {
    if (!onRequestFilePicker) return;

    // Determine file extensions based on language
    const language = codeEditorField?.language || "python";
    const extensionMap: Record<
      string,
      { extensions: string[]; filterLabel: string }
    > = {
      python: { extensions: [".py"], filterLabel: "Python files" },
      markdown: { extensions: [".md", ".txt"], filterLabel: "Markdown files" },
      json: { extensions: [".json"], filterLabel: "JSON files" },
      yaml: { extensions: [".yaml", ".yml"], filterLabel: "YAML files" },
      javascript: {
        extensions: [".js", ".jsx"],
        filterLabel: "JavaScript files",
      },
      typescript: {
        extensions: [".ts", ".tsx"],
        filterLabel: "TypeScript files",
      },
    };
    const options = extensionMap[language] || {
      extensions: [".*"],
      filterLabel: "All files",
    };

    onRequestFilePicker(
      filePath,
      (newPath) => {
        setNodes((nodes) =>
          nodes.map((node) =>
            node.id === id
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    config: { ...config, file_path: newPath },
                  },
                }
              : node,
          ),
        );
      },
      options,
    );
  }, [onRequestFilePicker, filePath, codeEditorField, id, config, setNodes]);

  const handleConfigChange = useCallback(
    (fieldId: string, value: unknown) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: { ...node.data, config: { ...config, [fieldId]: value } },
              }
            : node,
        ),
      );
    },
    [id, config, setNodes],
  );

  const toggleExpand = useCallback(() => {
    const newExpanded = !isExpanded;
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, isExpanded: newExpanded } }
          : node,
      ),
    );
    setIsExpanded(newExpanded);
  }, [id, isExpanded, setNodes]);

  // Resize handler for resizable nodes
  const handleResize = useCallback(
    (deltaWidth: number, deltaHeight: number) => {
      const minWidth = schema.ui.min_width ?? 200;
      const minHeight = schema.ui.min_height ?? 150;

      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id !== id) return node;
          const currentSize = (node.data as unknown as CustomNodeData)
            .expandedSize ?? {
            width: schema.ui.default_width,
            height: schema.ui.default_height,
          };
          return {
            ...node,
            data: {
              ...node.data,
              expandedSize: {
                width: Math.max(minWidth, currentSize.width + deltaWidth),
                height: Math.max(minHeight, currentSize.height + deltaHeight),
              },
            },
          };
        }),
      );
    },
    [
      id,
      schema.ui.default_width,
      schema.ui.default_height,
      schema.ui.min_width,
      schema.ui.min_height,
      setNodes,
    ],
  );

  const isFieldVisible = useCallback(
    (field: FieldDefinition) => {
      if (!field.show_if) return true;
      return Object.entries(field.show_if).every(
        ([key, value]) => config[key] === value,
      );
    },
    [config],
  );

  // Get header color from theme using theme_key, fallback to schema.ui.color
  const getThemeHeaderColor = () => {
    if (schema.ui.theme_key) {
      const nodesRecord = theme.colors.nodes as unknown as Record<
        string,
        unknown
      >;
      const nodeColors = nodesRecord[schema.ui.theme_key] as
        | { header?: string }
        | undefined;
      if (nodeColors?.header) {
        return nodeColors.header;
      }
    }
    return schema.ui.color || theme.colors.nodes.agent.header;
  };
  const headerColor = getThemeHeaderColor();
  const width = nodeData.expandedSize?.width || schema.ui.default_width;

  // Collapsed view (or non-expandable nodes like pills, circles, etc.)
  if (!isExpanded || !schema.ui.expandable) {
    return (
      <CustomNodeCollapsed
        id={id}
        nodeData={nodeData}
        schema={schema}
        name={name}
        config={config}
        handlePositions={handlePositions}
        handleTypes={handleTypes}
        headerColor={headerColor}
        selected={selected}
        onToggleExpand={toggleExpand}
        isEditing={isEditing}
        editedName={editedName}
        inputRef={inputRef}
        onNameClick={handleNameClick}
        onNameChange={handleNameChange}
        onNameSave={handleNameSave}
        onNameKeyDown={handleNameKeyDown}
      />
    );
  }

  // Expanded view
  return (
    <CustomNodeExpanded
      id={id}
      nodeData={nodeData}
      schema={schema}
      name={name}
      config={config}
      handleTypes={handleTypes}
      connectedInputs={connectedInputs}
      headerColor={headerColor}
      tabs={tabs}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      width={width}
      onToggleExpand={toggleExpand}
      onConfigChange={handleConfigChange}
      isFieldVisible={isFieldVisible}
      isEditing={isEditing}
      editedName={editedName}
      inputRef={inputRef}
      onNameClick={handleNameClick}
      onNameChange={handleNameChange}
      onNameSave={handleNameSave}
      onNameKeyDown={handleNameKeyDown}
      // File operation props for nodes with code_editor
      filePath={filePath}
      onSave={codeEditorField ? handleFileSave : undefined}
      onChangeFile={codeEditorField ? handleChangeFile : undefined}
      isSaving={isSaving}
      isDirty={isDirty}
      // Execution state (filter out "idle" as it means no visual state)
      executionState={
        nodeData.executionState !== "idle" ? nodeData.executionState : undefined
      }
      selected={selected}
      // Resize handler for resizable nodes
      onResize={schema.ui.resizable ? handleResize : undefined}
    />
  );
});

CustomNode.displayName = "CustomNode";

export default CustomNode;

/**
 * Creates default node data from a schema definition.
 *
 * This factory function initializes a CustomNodeData object with:
 * - Default values for all fields and inputs from the schema
 * - Handle type information for connection validation
 * - Initial expanded state (false)
 *
 * Use this when programmatically creating nodes from schemas.
 *
 * @param schema - The node schema to create data from
 * @returns Initialized CustomNodeData ready for use with ReactFlow
 *
 * @example
 * ```typescript
 * import { getDefaultCustomNodeData } from "@/components/nodes/CustomNode";
 * import mySchema from "@/lib/builtinNodeSchemas/myNodeSchema";
 *
 * // Create a new node
 * const newNode = {
 *   id: "node-1",
 *   type: "CustomNode",
 *   position: { x: 100, y: 100 },
 *   data: getDefaultCustomNodeData(mySchema),
 * };
 * ```
 */
export function getDefaultCustomNodeData(
  schema: CustomNodeSchema,
): CustomNodeData {
  const config: Record<string, unknown> = {};
  // Initialize field defaults
  schema.ui.fields.forEach((field) => {
    if (field.default !== undefined) {
      config[field.id] = field.default;
    }
  });
  // Initialize input defaults (for inputs with connection_only=false)
  schema.ui.inputs.forEach((input) => {
    if (input.connection_only === false && input.default !== undefined) {
      config[input.id] = input.default;
    }
  });

  const handleTypes: Record<
    string,
    {
      outputSource?: string;
      outputType?: string;
      acceptedSources?: string[];
      acceptedTypes?: string[];
    }
  > = {};

  const allAcceptedSources = new Set<string>();
  const allAcceptedTypes = new Set<string>();
  schema.ui.inputs.forEach((input) => {
    (input.accepted_sources || [input.source_type]).forEach((s) =>
      allAcceptedSources.add(s),
    );
    (input.accepted_types || [input.data_type]).forEach((t) =>
      allAcceptedTypes.add(t),
    );
    handleTypes[input.id] = {
      acceptedSources: input.accepted_sources || [input.source_type],
      acceptedTypes: input.accepted_types || [input.data_type],
    };
  });
  handleTypes["input"] = {
    acceptedSources: Array.from(allAcceptedSources),
    acceptedTypes: Array.from(allAcceptedTypes),
  };

  schema.ui.outputs.forEach((output) => {
    handleTypes[output.id] = {
      outputSource: output.source_type,
      outputType: output.data_type,
    };
  });

  return {
    schema,
    config,
    handleTypes,
    isExpanded: false,
  };
}
