/**
 * Preview Widget Registry
 *
 * Maps input types to their corresponding preview widget components.
 * Provides a fallback for unknown types to ensure extensibility.
 */

import type { DynamicInputType } from "@/components/nodes/CustomNode/types/dynamicInputs";
import type { PreviewWidgetComponent } from "./types";

import { FilePreviewWidget } from "./FilePreviewWidget";
import { DirectoryPreviewWidget } from "./DirectoryPreviewWidget";
import { URLPreviewWidget } from "./URLPreviewWidget";
import { RuntimePlaceholderWidget } from "./RuntimePlaceholderWidget";
import { GenericPropertyDisplay } from "./GenericPropertyDisplay";

/**
 * Registry mapping input types to preview widget components.
 *
 * Each input type has a dedicated widget that knows how to render
 * its preview results appropriately.
 */
const PREVIEW_WIDGET_REGISTRY: Record<DynamicInputType, PreviewWidgetComponent> = {
  file: FilePreviewWidget,
  directory: DirectoryPreviewWidget,
  url: URLPreviewWidget,
  node: RuntimePlaceholderWidget,
};

/**
 * Get the preview widget component for a given input type.
 *
 * Returns the appropriate widget for known types, or a generic property
 * display for unknown types. This ensures that extensions can add new
 * input types without breaking the preview panel.
 *
 * @param inputType - The type of the input
 * @returns The preview widget component to use
 *
 * @example
 * ```tsx
 * const Widget = getPreviewWidget(input.inputType);
 * return <Widget input={input} preview={preview} />;
 * ```
 */
export function getPreviewWidget(inputType: string): PreviewWidgetComponent {
  if (inputType in PREVIEW_WIDGET_REGISTRY) {
    return PREVIEW_WIDGET_REGISTRY[inputType as DynamicInputType];
  }
  // Fallback for unknown types - wrap GenericPropertyDisplay
  // to match PreviewWidgetComponent signature
  return GenericPropertyDisplay as unknown as PreviewWidgetComponent;
}

/**
 * Check if a preview widget exists for a given input type.
 *
 * @param inputType - The type to check
 * @returns True if a dedicated widget exists
 */
export function hasPreviewWidget(inputType: string): boolean {
  return inputType in PREVIEW_WIDGET_REGISTRY;
}
