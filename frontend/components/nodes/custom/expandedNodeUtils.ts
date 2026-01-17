import type {
  CustomNodeSchema,
  FieldDefinition,
} from "@/components/nodes/CustomNode";

/**
 * Group elements by their section property.
 */
export function groupBySection<T extends { section?: string }>(
  items: T[],
): Map<string | null, T[]> {
  const groups = new Map<string | null, T[]>();
  items.forEach((item) => {
    const key = item.section || null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  });
  return groups;
}

/**
 * Check if schema has a code_editor widget field
 */
export function hasCodeEditorWidget(schema: CustomNodeSchema): boolean {
  return schema.ui.fields.some((field) => field.widget === "code_editor");
}

/**
 * Get the code_editor field from schema if it exists
 */
export function getCodeEditorField(
  schema: CustomNodeSchema,
): FieldDefinition | null {
  return (
    schema.ui.fields.find((field) => field.widget === "code_editor") || null
  );
}

/**
 * Extract unique tabs from schema.
 * If schema.ui.tabs is defined, use that order (filtering to only tabs with content).
 * Otherwise, extract tabs based on when they appear in inputs/fields/outputs.
 */
export function extractTabsInOrder(schema: CustomNodeSchema): string[] {
  // Collect all tabs that have actual content
  const tabsWithContent = new Set<string>();
  for (const input of schema.ui.inputs) {
    if (input.tab) tabsWithContent.add(input.tab);
  }
  for (const field of schema.ui.fields) {
    if (field.tab) tabsWithContent.add(field.tab);
  }
  for (const output of schema.ui.outputs) {
    if (output.tab) tabsWithContent.add(output.tab);
  }

  // If schema.ui.tabs is defined, use that order but only include tabs with content
  if (schema.ui.tabs && schema.ui.tabs.length > 0) {
    return schema.ui.tabs.filter((tab) => tabsWithContent.has(tab));
  }

  // Fallback: extract tabs in order of first appearance
  const tabs: string[] = [];
  const seen = new Set<string>();

  for (const input of schema.ui.inputs) {
    if (input.tab && !seen.has(input.tab)) {
      seen.add(input.tab);
      tabs.push(input.tab);
    }
  }

  for (const field of schema.ui.fields) {
    if (field.tab && !seen.has(field.tab)) {
      seen.add(field.tab);
      tabs.push(field.tab);
    }
  }

  for (const output of schema.ui.outputs) {
    if (output.tab && !seen.has(output.tab)) {
      seen.add(output.tab);
      tabs.push(output.tab);
    }
  }

  return tabs;
}
