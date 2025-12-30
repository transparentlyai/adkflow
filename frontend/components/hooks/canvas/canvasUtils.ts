import type { Node } from "@xyflow/react";
import type { Theme } from "@/lib/themes/types";

/**
 * Returns the minimap node color based on node type
 */
export function getMiniMapNodeColor(node: Node, theme: Theme): string {
  switch (node.type) {
    case "group":
      return theme.colors.nodes.group.header;
    case "agent":
      return theme.colors.nodes.agent.header;
    case "prompt":
      return theme.colors.nodes.prompt.header;
    case "context":
      return theme.colors.nodes.context.header;
    case "inputProbe":
    case "outputProbe":
    case "logProbe":
      return theme.colors.nodes.probe.header;
    case "outputFile":
      return theme.colors.nodes.outputFile.header;
    case "tool":
      return theme.colors.nodes.tool.header;
    case "agentTool":
      return theme.colors.nodes.agentTool.header;
    case "variable":
      return theme.colors.nodes.variable.header;
    case "process":
      return theme.colors.nodes.process.header;
    case "label":
      return theme.colors.nodes.label.header;
    case "userInput":
      return theme.colors.nodes.userInput.header;
    case "start":
      return theme.colors.nodes.start.header;
    case "end":
      return theme.colors.nodes.end.header;
    default:
      return theme.colors.nodes.label.header;
  }
}

/**
 * Returns canvas CSS styles for ReactFlow customization
 */
export function getCanvasStyles(theme: Theme): string {
  return `
    .react-flow__node-group {
      background: transparent !important;
      box-shadow: none !important;
      border: none !important;
      pointer-events: none !important;
    }
    .react-flow__node-group .group-drag-handle,
    .react-flow__node-group .react-flow__resize-control {
      pointer-events: auto !important;
    }
    .react-flow__edge .react-flow__edge-path {
      transition: stroke 0.15s ease, stroke-width 0.15s ease;
    }
    .react-flow__edge:hover .react-flow__edge-path {
      stroke: ${theme.colors.edges.hover} !important;
      stroke-width: 2.5 !important;
    }
    .react-flow__edge.selected .react-flow__edge-path,
    .react-flow__edge:focus .react-flow__edge-path,
    .react-flow__edge:focus-visible .react-flow__edge-path {
      stroke: ${theme.colors.edges.selected} !important;
      stroke-width: 3 !important;
    }
    .react-flow__controls-button.lucide-btn svg {
      fill: none !important;
      stroke: currentColor !important;
      stroke-width: 2px;
      width: 12px;
      height: 12px;
    }
  `;
}
