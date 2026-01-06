/**
 * Context Aggregator Preview Components
 *
 * This module provides a preview panel for the Context Aggregator node.
 * It allows users to preview aggregation results before running the workflow.
 *
 * ## Architecture
 *
 * The preview system is schema-driven, meaning it automatically adapts to
 * new properties added to DynamicInputConfig without code changes:
 *
 * - **PREVIEW_DISPLAY_HINTS**: Defines how properties are labeled and formatted
 * - **PreviewWidgetRegistry**: Maps input types to preview widgets
 * - **GenericPropertyDisplay**: Fallback for unknown properties
 *
 * ## Adding New Input Types (for extensions)
 *
 * 1. Create a new widget component implementing PreviewWidgetProps
 * 2. Register it in previewRegistry.ts
 * 3. Add display hints in dynamicInputs.ts (optional)
 *
 * ## Usage
 *
 * ```tsx
 * import { ContextPreviewPanel } from "./preview";
 *
 * <ContextPreviewPanel
 *   isOpen={isPreviewOpen}
 *   onClose={() => setIsPreviewOpen(false)}
 *   inputs={inputs}
 *   aggregationMode={aggregationMode}
 *   separator={separator}
 *   outputVariableName={outputVariableName}
 *   includeMetadata={includeMetadata}
 *   projectPath={projectPath}
 *   connectedInputs={connectedInputs}
 * />
 * ```
 */

// Main panel component
export { ContextPreviewPanel } from "./ContextPreviewPanel";

// Preview widgets
export { FilePreviewWidget } from "./FilePreviewWidget";
export { DirectoryPreviewWidget } from "./DirectoryPreviewWidget";
export { URLPreviewWidget } from "./URLPreviewWidget";
export { RuntimePlaceholderWidget } from "./RuntimePlaceholderWidget";
export { GenericPropertyDisplay } from "./GenericPropertyDisplay";
export { OutputPreviewTab } from "./OutputPreviewTab";

// Registry
export { getPreviewWidget, hasPreviewWidget } from "./previewRegistry";

// Types
export type {
  PreviewResult,
  DirectoryPreviewResult,
  DirectoryFileInfo,
  PreviewResponse,
  PreviewRequest,
  PreviewWidgetProps,
  PreviewWidgetComponent,
  PreviewWidgetRegistry,
  ComputedOutput,
} from "./types";
export { isDirectoryPreviewResult } from "./types";
