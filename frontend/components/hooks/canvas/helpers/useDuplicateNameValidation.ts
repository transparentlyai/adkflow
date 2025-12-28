import { useEffect } from "react";
import type { Node } from "@xyflow/react";

interface UseDuplicateNameValidationParams {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  duplicateErrorNodesRef: React.MutableRefObject<Map<string, string>>;
}

// Node unit_ids that are file-based (can share names if pointing to same file/content)
const FILE_BASED_UNIT_IDS = new Set([
  "builtin.prompt",
  "builtin.context",
  "builtin.tool",
  "builtin.process",
  "builtin.agentTool",
]);

// Custom node unit_ids that require unique names
const UNIQUE_NAME_UNIT_IDS = new Set(["builtin.agent", "builtin.variable"]);

// Helper to extract name and file info from a node
function getNodeInfo(node: Node): {
  name: string;
  filePath: string | null;
  content: string | null;
  isFileBased: boolean;
  isUniqueName: boolean;
} | null {
  const data = node.data as Record<string, unknown>;

  // All nodes are schema-driven (has schema in data)
  const schema = data.schema as
    | {
        unit_id?: string;
        ui?: { fields?: Array<{ id: string; widget: string }> };
      }
    | undefined;

  if (!schema) {
    return null;
  }

  const unitId = schema.unit_id || "";

  // Check if this node type requires name validation
  const isFileBased = FILE_BASED_UNIT_IDS.has(unitId);
  const isUniqueName = UNIQUE_NAME_UNIT_IDS.has(unitId);

  if (!isFileBased && !isUniqueName) {
    return null;
  }

  const config = data.config as Record<string, unknown> | undefined;
  const name = (config?.name as string) || "";
  const filePath = (config?.file_path as string) || null;

  // Find code content from code_editor field
  let content: string | null = null;
  if (schema.ui?.fields) {
    const codeField = schema.ui.fields.find(
      (f) => f.widget === "code_editor" || f.widget === "monaco_editor",
    );
    if (codeField && config) {
      content = (config[codeField.id] as string) || null;
    }
  }

  if (!name) return null;
  return { name, filePath, content, isFileBased, isUniqueName };
}

export function useDuplicateNameValidation({
  nodes,
  setNodes,
  duplicateErrorNodesRef,
}: UseDuplicateNameValidationParams) {
  // Real-time validation for duplicate names
  useEffect(() => {
    // Group nodes by name
    const nameToNodes = new Map<
      string,
      Array<{
        id: string;
        filePath: string | null;
        content: string | null;
        isFileBased: boolean;
        isUniqueName: boolean;
      }>
    >();

    for (const node of nodes) {
      const info = getNodeInfo(node);
      if (!info) continue;

      const existing = nameToNodes.get(info.name) || [];
      existing.push({
        id: node.id,
        filePath: info.filePath,
        content: info.content,
        isFileBased: info.isFileBased,
        isUniqueName: info.isUniqueName,
      });
      nameToNodes.set(info.name, existing);
    }

    // Find nodes with duplicate errors and their messages
    const newErrorNodes = new Map<string, string>();

    for (const [, nodeInfos] of nameToNodes) {
      if (nodeInfos.length <= 1) continue;

      // Check if any are unique-name types (always an error)
      const uniqueNodes = nodeInfos.filter((n) => n.isUniqueName);
      const fileNodes = nodeInfos.filter((n) => n.isFileBased);

      if (uniqueNodes.length > 0) {
        // All nodes with this name are errors (unique-name types can't share)
        const msg = "Duplicate name: name must be unique";
        for (const n of nodeInfos) {
          newErrorNodes.set(n.id, msg);
        }
        continue;
      }

      // All are file-based - check if they point to same resource
      if (fileNodes.length > 1) {
        const first = fileNodes[0];
        const allSame = fileNodes.every(
          (n) => n.filePath === first.filePath && n.content === first.content,
        );

        if (!allSame) {
          // Different resources - all are errors
          const msg = "Duplicate name: same name but different content";
          for (const n of fileNodes) {
            newErrorNodes.set(n.id, msg);
          }
        }
      }
    }

    // Check if error map changed
    const prevMap = duplicateErrorNodesRef.current;
    const mapChanged =
      newErrorNodes.size !== prevMap.size ||
      [...newErrorNodes].some(([id, msg]) => prevMap.get(id) !== msg);

    if (!mapChanged) return;

    // Update ref
    duplicateErrorNodesRef.current = newErrorNodes;

    // Update nodes with error messages
    setNodes((nds) =>
      nds.map((node) => {
        const data = node.data as Record<string, unknown>;
        const errorMsg = newErrorNodes.get(node.id);
        const currentMsg = data.duplicateNameError as string | undefined;

        if (errorMsg !== currentMsg) {
          if (errorMsg) {
            return {
              ...node,
              data: { ...data, duplicateNameError: errorMsg },
            };
          } else {
            const { duplicateNameError, ...restData } = data;
            return { ...node, data: restData };
          }
        }
        return node;
      }),
    );
  }, [nodes, setNodes, duplicateErrorNodesRef]);
}
