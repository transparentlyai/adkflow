"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, AlertCircle, FileText, Code } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "@/contexts/ThemeContext";
import { previewContextAggregation } from "@/lib/api/contextPreview";
import type { PreviewResponse, PreviewResult } from "@/lib/api/contextPreview";
import type {
  DynamicInputConfig,
  NodeAggregationMode,
} from "@/components/nodes/CustomNode/types/dynamicInputs";
import { getPreviewWidget } from "./previewRegistry";
import { OutputPreviewTab } from "./OutputPreviewTab";

interface ContextPreviewPanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback when the panel should close */
  onClose: () => void;
  /** Dynamic inputs to preview */
  inputs: DynamicInputConfig[];
  /** Node-level aggregation mode */
  aggregationMode: NodeAggregationMode;
  /** Separator for concatenate mode */
  separator: string;
  /** Output variable name for concatenate mode */
  outputVariableName: string;
  /** Whether to include metadata */
  includeMetadata: boolean;
  /** Path to the project root */
  projectPath: string;
  /** Map of input IDs to connected source names */
  connectedInputs: Record<string, string[]>;
}

/**
 * ContextPreviewPanel displays a side panel with preview results.
 *
 * Opens as a right-side sheet and fetches preview data from the backend.
 * Shows loading state, error state, and preview widgets for each input.
 */
export function ContextPreviewPanel({
  isOpen,
  onClose,
  inputs,
  aggregationMode,
  separator,
  outputVariableName,
  includeMetadata,
  projectPath,
  connectedInputs,
}: ContextPreviewPanelProps) {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);

  const fetchPreview = useCallback(async () => {
    if (!projectPath || inputs.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await previewContextAggregation({
        projectPath,
        dynamicInputs: inputs,
        aggregationMode,
        separator,
        outputVariableName,
        includeMetadata,
      });
      setPreviewData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load preview");
    } finally {
      setIsLoading(false);
    }
  }, [
    projectPath,
    inputs,
    aggregationMode,
    separator,
    outputVariableName,
    includeMetadata,
  ]);

  // Fetch preview when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchPreview();
    }
  }, [isOpen, fetchPreview]);

  // Get preview result for an input
  const getPreviewResult = (inputId: string): PreviewResult | null => {
    if (!previewData) return null;
    return previewData.results[inputId] || null;
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-[450px] sm:w-[540px] sm:max-w-[540px] flex flex-col"
        style={{
          backgroundColor: theme.colors.nodes.common.container.background,
          borderColor: theme.colors.nodes.common.container.border,
        }}
      >
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle
              style={{ color: theme.colors.nodes.common.text.primary }}
            >
              Context Preview
            </SheetTitle>
            <button
              type="button"
              onClick={fetchPreview}
              disabled={isLoading}
              className="p-2 rounded hover:bg-black/10 transition-colors disabled:opacity-50"
              title="Refresh preview"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                style={{ color: theme.colors.nodes.common.text.muted }}
              />
            </button>
          </div>
          <SheetDescription
            style={{ color: theme.colors.nodes.common.text.muted }}
          >
            Preview of aggregated content from {inputs.length} input
            {inputs.length !== 1 ? "s" : ""}
          </SheetDescription>
        </SheetHeader>

        <Tabs
          defaultValue="inputs"
          className="flex-1 flex flex-col mt-4 min-h-0 overflow-hidden"
        >
          <TabsList
            className="flex-shrink-0 h-8"
            style={{
              backgroundColor: theme.colors.nodes.common.footer.background,
            }}
          >
            <TabsTrigger value="inputs" className="text-xs gap-1.5 px-3">
              <FileText className="w-3 h-3" />
              Inputs
            </TabsTrigger>
            <TabsTrigger value="output" className="text-xs gap-1.5 px-3">
              <Code className="w-3 h-3" />
              Output
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="inputs"
            className="flex-1 mt-2 min-h-0 overflow-auto -mx-6 px-6"
          >
            {/* Global error */}
            {error && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded mb-4 text-sm"
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  color: "#ef4444",
                }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Preview errors from API */}
            {previewData?.errors && previewData.errors.length > 0 && (
              <div className="mb-4 space-y-2">
                {previewData.errors.map((err, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 rounded text-sm"
                    style={{
                      backgroundColor: "rgba(239, 68, 68, 0.1)",
                      color: "#ef4444",
                    }}
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Input previews */}
            <div className="space-y-4 pb-4 pt-2">
              {inputs.map((input) => {
                const Widget = getPreviewWidget(input.inputType);
                const preview = getPreviewResult(input.id);
                const connectedSourceName = connectedInputs[input.id]?.[0];

                return (
                  <div key={input.id}>
                    {/* Input header */}
                    <div
                      className="text-xs font-medium mb-2 flex items-center gap-2"
                      style={{
                        color: theme.colors.nodes.common.text.secondary,
                      }}
                    >
                      <span className="uppercase tracking-wide">
                        {input.label}
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px]"
                        style={{
                          backgroundColor:
                            theme.colors.nodes.common.footer.background,
                          color: theme.colors.nodes.common.text.muted,
                        }}
                      >
                        {input.inputType}
                      </span>
                    </div>

                    {/* Preview widget */}
                    <Widget
                      input={input}
                      preview={preview}
                      isLoading={isLoading}
                      error={preview?.error || null}
                      includeMetadata={includeMetadata}
                      connectedSourceName={connectedSourceName}
                    />
                  </div>
                );
              })}
            </div>

            {/* Empty state */}
            {inputs.length === 0 && !isLoading && (
              <div
                className="text-center py-8 text-sm"
                style={{ color: theme.colors.nodes.common.text.muted }}
              >
                No inputs configured
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="output"
            className="flex-1 mt-2 min-h-0 overflow-hidden"
          >
            <OutputPreviewTab
              computedOutput={previewData?.computedOutput || null}
              isLoading={isLoading}
              error={error}
              aggregationMode={aggregationMode}
            />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div
          className="flex-shrink-0 pt-4 mt-4 border-t text-xs"
          style={{
            borderColor: theme.colors.nodes.common.container.border,
            color: theme.colors.nodes.common.text.muted,
          }}
        >
          <div className="flex justify-between items-center">
            <span>
              Mode:{" "}
              <span className="font-medium">
                {aggregationMode === "concatenate" ? "Concatenate" : "Pass"}
              </span>
              {aggregationMode === "concatenate" && (
                <span className="ml-2">
                  → <code className="font-mono">{outputVariableName}</code>
                </span>
              )}
            </span>
            {includeMetadata && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10">
                Metadata included
              </span>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
