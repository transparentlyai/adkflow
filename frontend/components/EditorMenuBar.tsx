"use client";

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { useTheme } from "@/contexts/ThemeContext";
import { Save } from "lucide-react";
import { formatShortcut } from "@/lib/utils";

interface EditorMenuBarProps {
  onSave?: () => void;
  onChangeFile?: () => void;
  filePath?: string;
  isSaving?: boolean;
  isDirty?: boolean;
  className?: string;
}

export default function EditorMenuBar({
  onSave,
  onChangeFile,
  filePath,
  isSaving = false,
  isDirty = false,
  className = "",
}: EditorMenuBarProps) {
  const { theme } = useTheme();

  return (
    <div className={`nodrag ${className}`}>
      <div
        className="h-7 border-0 border-b flex items-center justify-between px-1"
        style={{
          borderColor: theme.colors.nodes.common.container.border,
          backgroundColor: theme.colors.nodes.common.footer.background,
        }}
      >
        <Menubar className="h-7 border-0 p-0 bg-transparent">
          <MenubarMenu>
            <MenubarTrigger className="h-5 px-2 text-xs font-normal">
              File
            </MenubarTrigger>
            <MenubarContent>
              {onSave && (
                <>
                  <MenubarItem onClick={onSave} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save"}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatShortcut("S")}
                    </span>
                  </MenubarItem>
                  <MenubarSeparator />
                </>
              )}
              <MenubarItem onClick={onChangeFile}>Change File...</MenubarItem>
              {filePath && (
                <>
                  <MenubarSeparator />
                  <div className="px-2 py-1.5 text-xs text-muted-foreground truncate max-w-[250px]">
                    {filePath}
                  </div>
                </>
              )}
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
        {onSave && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className={`h-5 px-2 flex items-center gap-1 text-xs rounded transition-colors disabled:opacity-50 hover:bg-accent ${
              isDirty ? "text-orange-500 font-medium" : ""
            }`}
            title={
              isSaving
                ? "Saving..."
                : isDirty
                  ? `Unsaved changes (${formatShortcut("S")})`
                  : `Save (${formatShortcut("S")})`
            }
          >
            <Save className={`w-3 h-3 ${isSaving ? "animate-pulse" : ""}`} />
            <span>{isSaving ? "Saving..." : "Save"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
