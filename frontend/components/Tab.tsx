"use client";

import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { TabState } from "@/lib/types";

interface TabProps {
  tab: TabState;
  isActive: boolean;
  onClick: () => void;
  onRename: (name: string) => void;
}

export default function Tab({
  tab,
  isActive,
  onClick,
  onRename,
}: TabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(tab.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id, disabled: isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setEditValue(tab.name);
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== tab.name) {
      onRename(editValue.trim());
    } else {
      setEditValue(tab.name);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    // Stop propagation for all keys to prevent dnd-kit from intercepting
    e.stopPropagation();

    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setEditValue(tab.name);
      setIsEditing(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-1 px-3 py-1.5 text-sm cursor-pointer border-b-2 transition-colors",
        isActive
          ? "border-primary bg-background text-foreground"
          : "border-transparent hover:bg-muted/50 text-muted-foreground",
        isDragging && "opacity-50"
      )}
      onClick={isEditing ? undefined : onClick}
      onDoubleClick={isEditing ? undefined : handleDoubleClick}
      {...(isEditing ? {} : attributes)}
      {...(isEditing ? {} : listeners)}
    >
      {/* Unsaved indicator */}
      {tab.hasUnsavedChanges && (
        <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
      )}

      {/* Tab name or input */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleInputKeyDown}
          className="bg-transparent border-none outline-none text-sm max-w-[120px] px-0 font-inherit"
          style={{ font: "inherit" }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="truncate max-w-[120px]">{tab.name}</span>
      )}

      {/* Loading indicator */}
      {tab.isLoading && (
        <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
      )}
    </div>
  );
}
