/**
 * Span details panel with attributes editor
 */

import { useMemo } from "react";
import Editor from "@monaco-editor/react";
import { Cpu, FunctionSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TraceSpan } from "@/lib/api/traces";
import {
  formatDuration,
  formatSpanName,
  getSpanTypeClass,
  getModelName,
  getToolName,
} from "./traceUtils";

interface AttributesEditorProps {
  attributes: Record<string, unknown>;
}

/**
 * Attributes editor with Monaco syntax highlighting
 */
function AttributesEditor({ attributes }: AttributesEditorProps) {
  const jsonContent = useMemo(
    () => JSON.stringify(attributes, null, 2),
    [attributes],
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <h4 className="text-sm font-semibold mb-2 text-agentprism-muted-foreground flex-shrink-0">
        Attributes
      </h4>
      <div className="flex-1 rounded overflow-hidden border border-agentprism-border min-h-0">
        <Editor
          height="100%"
          language="json"
          value={jsonContent}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: "off",
            folding: true,
            showFoldingControls: "always",
            fontSize: 12,
            wordWrap: "on",
            automaticLayout: true,
            padding: { top: 8, bottom: 8 },
          }}
          theme="vs-dark"
        />
      </div>
    </div>
  );
}

interface SpanDetailsPanelProps {
  span: TraceSpan;
}

/**
 * Span details panel
 */
export function SpanDetailsPanel({ span }: SpanDetailsPanelProps) {
  const typeClass = getSpanTypeClass(span.name);
  const modelName = getModelName(span);
  const toolName = getToolName(span);
  const Icon = typeClass.icon;

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span
            className={cn(
              "w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center",
              typeClass.badge,
            )}
          >
            <Icon className="w-3 h-3 text-white" />
          </span>
          <h3 className="text-lg font-semibold">{formatSpanName(span.name)}</h3>
          <span
            className={cn(
              span.status === "ERROR"
                ? "text-agentprism-error"
                : "text-agentprism-success",
              "text-sm",
            )}
          >
            {span.status === "UNSET" ? "OK" : span.status}
          </span>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full",
              typeClass.bg,
              typeClass.text,
            )}
          >
            <Icon className="w-2.5 h-2.5" />
            {typeClass.label}
          </span>
          {modelName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-agentprism-badge-llm text-agentprism-badge-llm-foreground">
              <Cpu className="w-2.5 h-2.5" />
              {modelName}
            </span>
          )}
          {toolName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-agentprism-badge-tool text-agentprism-badge-tool-foreground">
              <FunctionSquare className="w-2.5 h-2.5" />
              {toolName}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-agentprism-muted-foreground">Duration:</span>{" "}
            {formatDuration(span.durationMs)}
          </div>
          <div className="col-span-2">
            <span className="text-agentprism-muted-foreground">Span ID:</span>{" "}
            <code className="text-xs bg-agentprism-muted px-1 py-0.5 rounded">
              {span.spanId}
            </code>
          </div>
          {span.parentSpanId && (
            <div className="col-span-2">
              <span className="text-agentprism-muted-foreground">
                Parent ID:
              </span>{" "}
              <code className="text-xs bg-agentprism-muted px-1 py-0.5 rounded">
                {span.parentSpanId}
              </code>
            </div>
          )}
        </div>
      </div>

      {Object.keys(span.attributes).length > 0 && (
        <AttributesEditor attributes={span.attributes} />
      )}
    </div>
  );
}
