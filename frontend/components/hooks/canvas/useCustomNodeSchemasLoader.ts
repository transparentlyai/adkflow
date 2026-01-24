import { useEffect } from "react";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import { getExtensionNodes } from "@/lib/api";

/**
 * Hook to load custom node schemas from the backend on mount.
 * Handles errors gracefully by logging and continuing.
 */
export function useCustomNodeSchemasLoader(
  setCustomNodeSchemas: React.Dispatch<React.SetStateAction<CustomNodeSchema[]>>
) {
  useEffect(() => {
    async function loadCustomNodes() {
      try {
        const data = await getExtensionNodes();
        setCustomNodeSchemas(data.nodes as CustomNodeSchema[]);
      } catch (error) {
        console.log("[ReactFlowCanvas] No custom nodes available");
      }
    }
    loadCustomNodes();
  }, [setCustomNodeSchemas]);
}
