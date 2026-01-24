"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, File, Folder, Globe, Cable, Eye } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import type { DynamicInputType } from "@/components/nodes/CustomNode";

const INPUT_TYPE_OPTIONS: {
  value: DynamicInputType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "file", label: "File", icon: <File className="w-3 h-3" /> },
  {
    value: "directory",
    label: "Directory",
    icon: <Folder className="w-3 h-3" />,
  },
  { value: "url", label: "URL", icon: <Globe className="w-3 h-3" /> },
  { value: "node", label: "Node Input", icon: <Cable className="w-3 h-3" /> },
];

interface InputListHeaderProps {
  inputCount: number;
  isNodeLocked: boolean;
  canPreview: boolean;
  onPreviewClick: () => void;
  onAddInput: (type: DynamicInputType) => void;
}

export function InputListHeader({
  inputCount,
  isNodeLocked,
  canPreview,
  onPreviewClick,
  onAddInput,
}: InputListHeaderProps) {
  const { theme } = useTheme();
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        addMenuRef.current &&
        !addMenuRef.current.contains(e.target as Node)
      ) {
        setIsAddMenuOpen(false);
      }
    };
    if (isAddMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isAddMenuOpen]);

  const handleAddInput = (type: DynamicInputType) => {
    onAddInput(type);
    setIsAddMenuOpen(false);
  };

  return (
    <div className="flex items-center justify-between">
      <span
        className="text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: theme.colors.nodes.common.text.muted }}
      >
        Inputs ({inputCount})
      </span>
      <div className="flex items-center gap-1">
        {/* Preview button */}
        <button
          type="button"
          onClick={onPreviewClick}
          disabled={!canPreview}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] border hover:bg-accent transition-colors disabled:opacity-50"
          style={{
            borderColor: theme.colors.nodes.common.container.border,
            color: theme.colors.nodes.common.text.primary,
          }}
          title="Preview aggregation results"
        >
          <Eye className="w-3 h-3" />
          Preview
        </button>

        {/* Add Input dropdown */}
        <div className="relative" ref={addMenuRef}>
          <button
            type="button"
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            disabled={isNodeLocked}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] border hover:bg-accent transition-colors disabled:opacity-50"
            style={{
              borderColor: theme.colors.nodes.common.container.border,
              color: theme.colors.nodes.common.text.primary,
            }}
          >
            Add Input
            <ChevronDown className="w-3 h-3" />
          </button>
          {isAddMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1 py-1 rounded border shadow-lg z-50 min-w-[120px]"
              style={{
                backgroundColor: theme.colors.nodes.common.container.background,
                borderColor: theme.colors.nodes.common.container.border,
              }}
            >
              {INPUT_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleAddInput(opt.value)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left hover:bg-accent transition-colors"
                  style={{ color: theme.colors.nodes.common.text.primary }}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
