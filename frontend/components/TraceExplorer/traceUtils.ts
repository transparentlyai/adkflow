/**
 * Trace Explorer utility functions and constants
 */

import {
  Zap,
  Wrench,
  Bot,
  Link,
  Search,
  BarChart2,
  ShieldCheck,
  CircleDot,
  Play,
} from "lucide-react";
import type { TraceSpan } from "@/lib/api/traces";

export const ACRONYMS = new Set([
  "llm",
  "api",
  "id",
  "url",
  "sql",
  "http",
  "ai",
]);

export const OPERATION_PREFIXES = [
  "invoke_agent",
  "call_llm",
  "execute_tool",
  "create_agent",
  "run_agent",
  "agent_invocation",
  "tool_execution",
  "chain_operation",
];

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number | null): string {
  if (ms === null) return "-";
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatOperationWord(word: string): string {
  const lower = word.toLowerCase();
  if (ACRONYMS.has(lower)) {
    return lower.toUpperCase();
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Format span name - converts operation prefix to Title Case
 * e.g., "invoke_agent seq_A1" → "Invoke Agent: seq_A1"
 */
export function formatSpanName(name: string): string {
  for (const prefix of OPERATION_PREFIXES) {
    if (name.toLowerCase().startsWith(prefix)) {
      const formattedPrefix = prefix
        .split("_")
        .map(formatOperationWord)
        .join(" ");
      const remainder = name.slice(prefix.length).trim();
      if (remainder) {
        const cleanRemainder = remainder.replace(/^[_\s]+/, "");
        return `${formattedPrefix}: ${cleanRemainder}`;
      }
      return formattedPrefix;
    }
  }
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Format timestamp to time only
 */
export function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  } catch {
    return timestamp;
  }
}

/**
 * Get span type color class and icon based on span name
 */
export function getSpanTypeClass(name: string): {
  bg: string;
  text: string;
  badge: string;
  icon: typeof Zap;
  label: string;
} {
  const lowerName = name.toLowerCase();

  if (lowerName.includes("llm") || lowerName.includes("call_llm")) {
    return {
      bg: "bg-agentprism-badge-llm",
      text: "text-agentprism-badge-llm-foreground",
      badge: "bg-agentprism-avatar-llm",
      icon: Zap,
      label: "LLM",
    };
  }
  if (lowerName.includes("agent") || lowerName.includes("invoke_agent")) {
    return {
      bg: "bg-agentprism-badge-agent",
      text: "text-agentprism-badge-agent-foreground",
      badge: "bg-agentprism-avatar-agent",
      icon: Bot,
      label: "AGENT",
    };
  }
  if (lowerName.includes("tool") || lowerName.includes("execute_tool")) {
    return {
      bg: "bg-agentprism-badge-tool",
      text: "text-agentprism-badge-tool-foreground",
      badge: "bg-agentprism-avatar-tool",
      icon: Wrench,
      label: "TOOL",
    };
  }
  if (lowerName.includes("chain")) {
    return {
      bg: "bg-agentprism-badge-chain",
      text: "text-agentprism-badge-chain-foreground",
      badge: "bg-agentprism-avatar-chain",
      icon: Link,
      label: "CHAIN",
    };
  }
  if (lowerName.includes("retrieval")) {
    return {
      bg: "bg-agentprism-badge-retrieval",
      text: "text-agentprism-badge-retrieval-foreground",
      badge: "bg-agentprism-avatar-retrieval",
      icon: Search,
      label: "RETRIEVAL",
    };
  }
  if (lowerName.includes("embedding")) {
    return {
      bg: "bg-agentprism-badge-embedding",
      text: "text-agentprism-badge-embedding-foreground",
      badge: "bg-agentprism-avatar-embedding",
      icon: BarChart2,
      label: "EMBEDDING",
    };
  }
  if (lowerName.includes("guardrail")) {
    return {
      bg: "bg-agentprism-badge-guardrail",
      text: "text-agentprism-badge-guardrail-foreground",
      badge: "bg-agentprism-avatar-guardrail",
      icon: ShieldCheck,
      label: "GUARDRAIL",
    };
  }
  if (lowerName.includes("invoke") || lowerName.includes("invocation")) {
    return {
      bg: "bg-agentprism-badge-agent",
      text: "text-agentprism-badge-agent-foreground",
      badge: "bg-agentprism-avatar-agent",
      icon: Play,
      label: "INVOKE",
    };
  }

  return {
    bg: "bg-agentprism-badge-unknown",
    text: "text-agentprism-badge-unknown-foreground",
    badge: "bg-agentprism-avatar-unknown",
    icon: CircleDot,
    label: "SPAN",
  };
}

/**
 * Extract model name from span attributes
 */
export function getModelName(span: TraceSpan): string | undefined {
  const attrs = span.attributes || {};
  return (
    (attrs["gen_ai.request.model"] as string) ||
    (attrs["llm.model_name"] as string) ||
    (attrs["model"] as string) ||
    (attrs["model_name"] as string) ||
    undefined
  );
}

/**
 * Extract tool name from span attributes
 */
export function getToolName(span: TraceSpan): string | undefined {
  const lowerName = span.name.toLowerCase();
  if (!lowerName.includes("tool") && !lowerName.includes("execute_tool")) {
    return undefined;
  }
  const attrs = span.attributes || {};
  return (
    (attrs["tool.name"] as string) ||
    (attrs["function.name"] as string) ||
    (attrs["gen_ai.tool.name"] as string) ||
    undefined
  );
}
