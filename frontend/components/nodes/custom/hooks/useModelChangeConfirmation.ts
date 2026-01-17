import { useState, useCallback, useMemo } from "react";
import { useReactFlow } from "@xyflow/react";
import { getModelSchema, getModelDefaults } from "@/lib/constants/modelSchemas";
import type { CustomNodeData } from "@/components/nodes/CustomNode/types";

/**
 * Represents a field that will change when switching models.
 */
export interface FieldChange {
  fieldId: string;
  label: string;
  currentValue: unknown;
  newValue: unknown;
  /** Whether this field is being removed (doesn't exist in new model) */
  isRemoved: boolean;
  /** Whether this field is new (doesn't exist in current model) */
  isNew: boolean;
}

/**
 * Format a value for display in the confirmation dialog.
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "(empty)";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    if (value.length > 30) {
      return `"${value.slice(0, 27)}..."`;
    }
    return `"${value}"`;
  }
  return String(value);
}

/**
 * Calculate field changes between current config and new model defaults.
 */
export function calculateFieldChanges(
  currentConfig: Record<string, unknown>,
  currentModel: string,
  newModel: string,
): FieldChange[] {
  const currentSchema = getModelSchema(currentModel);
  const newSchema = getModelSchema(newModel);
  const currentDefaults = getModelDefaults(currentModel);
  const newDefaults = getModelDefaults(newModel);

  const currentFieldIds = new Set(currentSchema.fields.map((f) => f.id));
  const newFieldIds = new Set(newSchema.fields.map((f) => f.id));

  const changes: FieldChange[] = [];

  // Check fields in new model - will they change?
  for (const field of newSchema.fields) {
    const fieldId = field.id;
    // Use effective current value: from config if set, otherwise from current defaults
    const effectiveCurrentValue =
      currentConfig[fieldId] !== undefined
        ? currentConfig[fieldId]
        : currentDefaults[fieldId];
    const newValue = newDefaults[fieldId];

    // Skip the model field itself
    if (fieldId === "model") continue;

    const isNew = !currentFieldIds.has(fieldId);
    const valueChanged = effectiveCurrentValue !== newValue;

    // Include if it's a new field or if the effective value will change
    if (isNew || valueChanged) {
      changes.push({
        fieldId,
        label: field.label,
        currentValue: isNew ? undefined : effectiveCurrentValue,
        newValue,
        isRemoved: false,
        isNew,
      });
    }
  }

  // Check fields being removed (exist in current but not new)
  for (const field of currentSchema.fields) {
    if (!newFieldIds.has(field.id) && field.id !== "model") {
      const effectiveCurrentValue =
        currentConfig[field.id] !== undefined
          ? currentConfig[field.id]
          : currentDefaults[field.id];
      // Include if the field has an effective value
      if (effectiveCurrentValue !== undefined && effectiveCurrentValue !== "") {
        changes.push({
          fieldId: field.id,
          label: field.label,
          currentValue: effectiveCurrentValue,
          newValue: undefined,
          isRemoved: true,
          isNew: false,
        });
      }
    }
  }

  return changes;
}

interface UseModelChangeConfirmationOptions {
  nodeId: string;
  config: Record<string, unknown>;
  schema: CustomNodeData["schema"];
  unitId: string;
}

/**
 * Hook that manages model change confirmation.
 *
 * When the user selects a different model, this hook:
 * 1. Calculates what fields will change
 * 2. Shows a confirmation dialog if there are changes
 * 3. Applies the change only after user confirmation
 */
export function useModelChangeConfirmation({
  nodeId,
  config,
  schema,
  unitId,
}: UseModelChangeConfirmationOptions) {
  const { setNodes } = useReactFlow();
  const [pendingModel, setPendingModel] = useState<string | null>(null);
  const [fieldChanges, setFieldChanges] = useState<FieldChange[]>([]);

  const currentModel = (config.model as string) || "";

  /**
   * Apply the model change - resets all fields to new model defaults.
   */
  const applyModelChange = useCallback(
    (newModel: string) => {
      const newModelSchema = getModelSchema(newModel);
      const newDefaults = getModelDefaults(newModel);

      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id !== nodeId) return node;

          const nodeData = node.data as unknown as CustomNodeData;

          // Start with all new model defaults, preserve 'name', and set the model
          const newConfig: Record<string, unknown> = {
            ...newDefaults,
            model: newModel,
            name: nodeData.config?.name,
          };

          return {
            ...node,
            data: {
              ...node.data,
              schema: {
                ...nodeData.schema,
                ui: {
                  ...nodeData.schema.ui,
                  tabs: newModelSchema.tabs,
                  fields: newModelSchema.fields,
                },
              },
              config: newConfig,
            },
          };
        }),
      );
    },
    [nodeId, setNodes],
  );

  /**
   * Request a model change. If there are field changes, shows confirmation dialog.
   */
  const requestModelChange = useCallback(
    (newModel: string) => {
      // Only applies to Agent nodes
      if (unitId !== "builtin.agent") {
        return false;
      }

      // No change needed
      if (newModel === currentModel) {
        return false;
      }

      const changes = calculateFieldChanges(config, currentModel, newModel);

      if (changes.length === 0) {
        // No meaningful changes, apply immediately
        applyModelChange(newModel);
        return false;
      }

      // Show confirmation dialog
      setPendingModel(newModel);
      setFieldChanges(changes);
      return true; // Indicates dialog will be shown
    },
    [config, currentModel, unitId, applyModelChange],
  );

  /**
   * Confirm the pending model change.
   */
  const confirmModelChange = useCallback(() => {
    if (!pendingModel) return;

    applyModelChange(pendingModel);
    setPendingModel(null);
    setFieldChanges([]);
  }, [pendingModel, applyModelChange]);

  /**
   * Cancel the pending model change.
   */
  const cancelModelChange = useCallback(() => {
    setPendingModel(null);
    setFieldChanges([]);
  }, []);

  /**
   * Get the label for the new model.
   */
  const newModelLabel = useMemo(() => {
    if (!pendingModel) return "";
    const schema = getModelSchema(pendingModel);
    return schema.label;
  }, [pendingModel]);

  return {
    /** The model the user wants to switch to (null if no pending change) */
    pendingModel,
    /** List of fields that will change */
    fieldChanges,
    /** Whether the confirmation dialog should be shown */
    isDialogOpen: pendingModel !== null,
    /** Label of the new model for display */
    newModelLabel,
    /** Request a model change - returns true if dialog will be shown */
    requestModelChange,
    /** Confirm and apply the pending model change */
    confirmModelChange,
    /** Cancel the pending model change */
    cancelModelChange,
    /** Format a value for display */
    formatValue,
  };
}
