import type { TraceSpan } from "@evilmartians/agent-prism-types";

/**
 * Extract model name from span metadata or attributes
 */
export function getModelName(data: TraceSpan): string | undefined {
  const metadata = data.metadata as Record<string, unknown> | undefined;
  if (metadata?.model) return String(metadata.model);
  if (metadata?.modelName) return String(metadata.modelName);
  if (metadata?.model_name) return String(metadata.model_name);

  if (!data.attributes) return undefined;

  for (const attr of data.attributes) {
    const key = attr.key.toLowerCase();
    if (
      key === "gen_ai.request.model" ||
      key === "llm.model_name" ||
      key === "model" ||
      key === "model_name"
    ) {
      return attr.value.stringValue;
    }
  }

  return undefined;
}

/**
 * Extract tool/function name from span metadata or attributes for tool executions
 */
export function getToolName(data: TraceSpan): string | undefined {
  if (data.type !== "tool_execution") return undefined;

  const metadata = data.metadata as Record<string, unknown> | undefined;
  if (metadata?.tool) return String(metadata.tool);
  if (metadata?.toolName) return String(metadata.toolName);
  if (metadata?.tool_name) return String(metadata.tool_name);
  if (metadata?.function) return String(metadata.function);

  if (!data.attributes) return undefined;

  for (const attr of data.attributes) {
    const key = attr.key.toLowerCase();
    if (
      key === "tool.name" ||
      key === "function.name" ||
      key === "gen_ai.tool.name"
    ) {
      return attr.value.stringValue;
    }
  }

  return undefined;
}
