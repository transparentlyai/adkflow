import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

/**
 * Schema definition for ShellToolNode
 *
 * ShellToolNode provides secure shell command execution with whitelist-based
 * security. Commands must match allowed glob patterns to execute.
 *
 * Features:
 * - Whitelist-only command execution using glob patterns
 * - Configurable timeout and output modes
 * - Environment variable injection
 * - Working directory control
 *
 * Tabs: ["Config", "Pre-Shell", "Post-Shell", "Advanced"]
 * - Config tab: allowed_commands (Security section), working_directory, timeout, output_mode, error_behavior
 * - Pre-Shell tab: pre_shell editor, include_pre_shell_output, pre_shell_on_fail
 * - Post-Shell tab: post_shell editor, include_post_shell_output, post_shell_on_fail
 * - Advanced tab: environment_variables, max_output_size
 */
export const shellToolNodeSchema: CustomNodeSchema = {
  unit_id: "builtin.shellTool",
  label: "Shell Tool",
  menu_location: "Tools/Shell Tool",
  description:
    "Execute shell commands with whitelist-based security. Commands must match allowed patterns to run.",
  version: "1.0.0",
  output_node: false,
  always_execute: false,
  ui: {
    inputs: [],
    outputs: [
      {
        id: "output",
        label: "Tool",
        source_type: "tool",
        data_type: "callable",
        required: false,
        multiple: true,
      },
    ],
    tabs: ["Config", "Pre-Shell", "Post-Shell", "Advanced"],
    fields: [
      // Config tab
      {
        id: "working_directory",
        label: "Working Directory",
        widget: "text_input",
        default: "",
        placeholder: "Leave empty for project root",
        help_text:
          "Directory to run commands in (relative to project or absolute)",
        tab: "Config",
      },
      {
        id: "timeout",
        label: "Timeout (seconds)",
        widget: "number_input",
        default: 30,
        min_value: 1,
        max_value: 600,
        help_text: "Maximum execution time per command",
        tab: "Config",
      },
      {
        id: "output_mode",
        label: "Output Mode",
        widget: "select",
        default: "combined",
        options: [
          { value: "combined", label: "Combined (stdout + stderr)" },
          { value: "stdout", label: "Stdout only" },
          { value: "stderr", label: "Stderr only" },
          { value: "both", label: "Both (separate)" },
        ],
        help_text: "How to capture command output",
        tab: "Config",
      },
      {
        id: "error_behavior",
        label: "Error Handling",
        widget: "select",
        default: "pass_to_model",
        options: [
          {
            value: "pass_to_model",
            label: "Pass error to model (let LLM handle)",
          },
          { value: "fail_fast", label: "Fail fast (terminate workflow)" },
        ],
        help_text: "How to handle command errors or blocked commands",
        tab: "Config",
      },
      // Config tab - Security section (at end)
      {
        id: "allowed_commands",
        label: "Allowed Commands",
        widget: "text_area",
        default: `git:*
ls:*
cat:*`,
        help_text:
          "Command patterns (one per line). Format: command:args_pattern. Use * for any arguments.",
        tab: "Config",
        section: "Security",
        rows: 8,
      },
      // Pre-Shell tab
      {
        id: "pre_shell",
        label: "Commands",
        widget: "code_editor",
        language: "shell",
        default: "",
        placeholder: "# Commands to run before each agent command",
        help_text: "Runs before each agent command (bypasses whitelist)",
        tab: "Pre-Shell",
        section: "Shell",
        hide_gutter: true,
      },
      {
        id: "include_pre_shell_output",
        label: "Include Output",
        widget: "checkbox",
        default: false,
        help_text:
          "Include pre-shell output in the result returned to the agent",
        tab: "Pre-Shell",
      },
      {
        id: "pre_shell_on_fail",
        label: "On Failure",
        widget: "select",
        default: "stop",
        options: [
          { value: "stop", label: "Stop (don't run main command)" },
          { value: "continue", label: "Continue (run main command anyway)" },
        ],
        help_text: "What to do if pre-shell commands fail",
        tab: "Pre-Shell",
      },
      // Post-Shell tab
      {
        id: "post_shell",
        label: "Commands",
        widget: "code_editor",
        language: "shell",
        default: "",
        placeholder: "# Commands to run after each agent command",
        help_text: "Runs after each agent command (bypasses whitelist)",
        tab: "Post-Shell",
        section: "Shell",
        hide_gutter: true,
      },
      {
        id: "include_post_shell_output",
        label: "Include Output",
        widget: "checkbox",
        default: false,
        help_text:
          "Include post-shell output in the result returned to the agent",
        tab: "Post-Shell",
      },
      {
        id: "post_shell_on_fail",
        label: "If Main Command Fails",
        widget: "select",
        default: "run",
        options: [
          { value: "run", label: "Run post-shell anyway" },
          { value: "skip", label: "Skip post-shell" },
        ],
        help_text: "Whether to run post-shell if the main command fails",
        tab: "Post-Shell",
      },
      // Advanced tab
      {
        id: "environment_variables",
        label: "Environment Variables",
        widget: "text_area",
        default: "",
        placeholder: "KEY=VALUE (one per line)",
        help_text: "Additional environment variables for commands",
        tab: "Advanced",
      },
      {
        id: "max_output_size",
        label: "Max Output Size (bytes)",
        widget: "number_input",
        default: 100000,
        min_value: 1000,
        max_value: 10000000,
        help_text: "Maximum output size before truncation",
        tab: "Advanced",
      },
    ],
    color: "#ea580c", // Deep orange for shell tool nodes
    icon: "Terminal",
    expandable: true,
    default_width: 400,
    default_height: 300,
    layout: "pill",
    theme_key: "tool",
    min_collapsed_width: 120,
    resizable: true,
    min_width: 300,
    min_height: 200,
    collapsed_display: {
      format: "{name}",
    },
    handle_layout: {
      output_position: "right",
    },
  },
};

export default shellToolNodeSchema;
