"use client";

import { memo, useState, useCallback, useEffect } from "react";
import { type NodeProps } from "@xyflow/react";
import NodeContextMenu from "@/components/NodeContextMenu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTeleporter } from "@/contexts/TeleporterContext";
import type { HandlePositions, HandleDataType } from "@/lib/types";
import {
  useTeleportHandlers,
  TeleportNodePanel,
  TeleportNodeShape,
} from "./teleport";

export interface TeleportInNodeData extends Record<string, unknown> {
  name: string;
  handlePositions?: HandlePositions;
  expandedPosition?: { x: number; y: number };
  contractedPosition?: { x: number; y: number };
  isExpanded?: boolean;
  isNodeLocked?: boolean;
  handleTypes?: Record<
    string,
    {
      outputSource?: string;
      outputType?: HandleDataType;
      acceptedSources?: string[];
      acceptedTypes?: HandleDataType[];
    }
  >;
}

const TeleportInNode = memo(({ data, id, selected }: NodeProps) => {
  const {
    name,
    isExpanded: dataIsExpanded,
    isNodeLocked,
  } = data as TeleportInNodeData;

  const {
    updateTeleporterName,
    getOutputTeleportersByName,
    getAllOutputTeleporters,
    getColorForName,
  } = useTeleporter();

  const [isExpanded, setIsExpanded] = useState(dataIsExpanded ?? false);
  const [editedName, setEditedName] = useState(name);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const matchingOutputs = getOutputTeleportersByName(name);
  const color = getColorForName(name);

  const {
    parentId,
    canvasActions,
    setNodes,
    handleCopy,
    handleCut,
    handlePaste,
    handleDoubleClick,
    handleToggleNodeLock,
    handleDetach,
    handleNavigateToNode,
  } = useTeleportHandlers({
    id,
    isNodeLocked,
    isExpanded,
    setIsExpanded,
  });

  useEffect(() => {
    setEditedName(name);
  }, [name]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleNameSave = () => {
    if (editedName.trim() && editedName.trim() !== name) {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, name: editedName.trim() } }
            : node,
        ),
      );
      updateTeleporterName(id, editedName.trim());
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleNameSave();
    } else if (e.key === "Escape") {
      setEditedName(name);
    }
  };

  const handleLinkTo = useCallback(
    (linkName: string) => {
      setEditedName(linkName);
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, name: linkName } }
            : node,
        ),
      );
      updateTeleporterName(id, linkName);
    },
    [id, setNodes, updateTeleporterName],
  );

  const availableOutputs = getAllOutputTeleporters().filter(
    (t) => t.name !== name,
  );

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              onDoubleClick={handleDoubleClick}
              onContextMenu={handleContextMenu}
            >
              <TeleportNodeShape
                name={name}
                color={color}
                selected={selected}
                isNodeLocked={isNodeLocked}
                isExpanded={isExpanded}
                matchingCount={matchingOutputs.length}
                direction="input"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[250px]">
            <div className="space-y-1">
              <div className="font-medium flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: color }}
                />
                {name}
              </div>
              {matchingOutputs.length > 0 ? (
                <div className="text-xs text-muted-foreground">
                  <div className="mb-0.5">
                    Connected to {matchingOutputs.length} output
                    {matchingOutputs.length > 1 ? "s" : ""}:
                  </div>
                  {matchingOutputs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleNavigateToNode(t.tabId, t.id)}
                      className="block pl-2 hover:text-foreground hover:underline text-left"
                    >
                      • {t.tabName} – {t.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  No connections
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {isExpanded && (
        <TeleportNodePanel
          editedName={editedName}
          setEditedName={setEditedName}
          onNameSave={handleNameSave}
          onNameKeyDown={handleNameKeyDown}
          onClose={() => setIsExpanded(false)}
          onNavigate={handleNavigateToNode}
          onLinkTo={handleLinkTo}
          matchingConnections={matchingOutputs}
          availableConnections={availableOutputs}
          color={color}
          connectionLabel="output"
        />
      )}

      {contextMenu && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isLocked={!!isNodeLocked}
          onToggleLock={handleToggleNodeLock}
          onClose={() => setContextMenu(null)}
          onDetach={parentId ? handleDetach : undefined}
          onCopy={handleCopy}
          onCut={handleCut}
          onPaste={handlePaste}
          hasClipboard={canvasActions?.hasClipboard}
          isCanvasLocked={canvasActions?.isLocked}
        />
      )}
    </>
  );
});

TeleportInNode.displayName = "TeleportInNode";

export default TeleportInNode;

export function getDefaultTeleportInData(): TeleportInNodeData {
  return {
    name: "Connector",
    handleTypes: {
      output: { outputSource: "teleport", outputType: "any" as HandleDataType },
    },
  };
}
