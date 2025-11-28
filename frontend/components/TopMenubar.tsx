"use client";

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  FilePlus,
  FolderOpen,
  Save,
  Trash2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
} from "lucide-react";

interface TopMenubarProps {
  onNewProject: () => void;
  onLoadProject: () => void;
  onSaveProject: () => void;
  onClearCanvas: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  hasProjectPath: boolean;
}

export default function TopMenubar({
  onNewProject,
  onLoadProject,
  onSaveProject,
  onClearCanvas,
  onZoomIn,
  onZoomOut,
  onFitView,
  hasProjectPath,
}: TopMenubarProps) {
  return (
    <Menubar className="border-none rounded-none shadow-none bg-transparent h-8">
      {/* File Menu */}
      <MenubarMenu>
        <MenubarTrigger className="text-sm font-normal">File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={onNewProject}>
            <FilePlus className="mr-2 h-4 w-4" />
            New Project
            <MenubarShortcut>⌘N</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={onLoadProject}>
            <FolderOpen className="mr-2 h-4 w-4" />
            Open Project
            <MenubarShortcut>⌘O</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={onSaveProject} disabled={!hasProjectPath}>
            <Save className="mr-2 h-4 w-4" />
            Save
            <MenubarShortcut>⌘S</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* Edit Menu */}
      <MenubarMenu>
        <MenubarTrigger className="text-sm font-normal">Edit</MenubarTrigger>
        <MenubarContent>
          <MenubarItem disabled>
            <Undo2 className="mr-2 h-4 w-4" />
            Undo
            <MenubarShortcut>⌘Z</MenubarShortcut>
          </MenubarItem>
          <MenubarItem disabled>
            <Redo2 className="mr-2 h-4 w-4" />
            Redo
            <MenubarShortcut>⇧⌘Z</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={onClearCanvas} disabled={!hasProjectPath}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Canvas
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* View Menu */}
      <MenubarMenu>
        <MenubarTrigger className="text-sm font-normal">View</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={onZoomIn} disabled={!onZoomIn}>
            <ZoomIn className="mr-2 h-4 w-4" />
            Zoom In
            <MenubarShortcut>⌘+</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={onZoomOut} disabled={!onZoomOut}>
            <ZoomOut className="mr-2 h-4 w-4" />
            Zoom Out
            <MenubarShortcut>⌘-</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={onFitView} disabled={!onFitView}>
            <Maximize className="mr-2 h-4 w-4" />
            Fit to Screen
            <MenubarShortcut>⌘0</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
