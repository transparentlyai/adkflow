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

export interface TeleportOutNodeData extends Record<string, unknown> {
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

const TeleportOutNode = memo(({ data, id, selected }: NodeProps) => {
  const {
    name,
    isExpanded: dataIsExpanded,
    isNodeLocked,
  } = data as TeleportOutNodeData;

  const {
    updateTeleporterName,
    getInputTeleportersByName,
    getAllInputTeleporters,
    getColorForName,
  } = useTeleporter();

  const [isExpanded, setIsExpanded] = useState(dataIsExpanded ?? false);
  const [editedName, setEditedName] = useState(name);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const matchingInputs = getInputTeleportersByName(name);
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

  const availableInputs = getAllInputTeleporters().filter(
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
                matchingCount={matchingInputs.length}
                direction="output"
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
              {matchingInputs.length > 0 ? (
                <div className="text-xs text-muted-foreground">
                  <div className="mb-0.5">
                    Connected to {matchingInputs.length} input
                    {matchingInputs.length > 1 ? "s" : ""}:
                  </div>
                  {matchingInputs.map((t) => (
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
          matchingConnections={matchingInputs}
          availableConnections={availableInputs}
          color={color}
          connectionLabel="input"
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

TeleportOutNode.displayName = "TeleportOutNode";

export default TeleportOutNode;

export function getDefaultTeleportOutData(): TeleportOutNodeData {
  return {
    name: "Connector",
    handleTypes: {
      input: {
        acceptedSources: ["*"],
        acceptedTypes: ["any"] as HandleDataType[],
      },
    },
  };
}
