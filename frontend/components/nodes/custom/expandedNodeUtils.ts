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
 * Extract unique tabs from schema in definition order
 */
export function extractTabsInOrder(schema: CustomNodeSchema): string[] {
  const tabs: string[] = [];
  const seen = new Set<string>();

  // Process inputs first
  for (const input of schema.ui.inputs) {
    if (input.tab && !seen.has(input.tab)) {
      seen.add(input.tab);
      tabs.push(input.tab);
    }
  }

  // Process fields next
  for (const field of schema.ui.fields) {
    if (field.tab && !seen.has(field.tab)) {
      seen.add(field.tab);
      tabs.push(field.tab);
    }
  }

  // Process outputs last
  for (const output of schema.ui.outputs) {
    if (output.tab && !seen.has(output.tab)) {
      seen.add(output.tab);
      tabs.push(output.tab);
    }
  }

  return tabs;
}
