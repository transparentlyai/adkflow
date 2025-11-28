"use client";

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";

interface EditorMenuBarProps {
  onSave?: () => void;
  onChangeFile?: () => void;
  filePath?: string;
  isSaving?: boolean;
  className?: string;
}

export default function EditorMenuBar({
  onSave,
  onChangeFile,
  filePath,
  isSaving = false,
  className = "",
}: EditorMenuBarProps) {
  return (
    <div className={`nodrag ${className}`}>
      <Menubar className="h-7 border-0 border-b border-gray-200 rounded-none bg-gray-50 px-1">
        <MenubarMenu>
          <MenubarTrigger className="h-5 px-2 text-xs font-normal">File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={onSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
              <span className="ml-auto text-xs text-muted-foreground">⌘S</span>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={onChangeFile}>
              Change File...
            </MenubarItem>
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
    </div>
  );
}
