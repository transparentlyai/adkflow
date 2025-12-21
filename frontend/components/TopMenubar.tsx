"use client";

import { useState, useRef } from "react";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
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
  Lock,
  Unlock,
  Palette,
  Download,
  Upload,
  Settings,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import SettingsDialog from "@/components/SettingsDialog";

interface TopMenubarProps {
  onNewProject: () => void;
  onLoadProject: () => void;
  onSaveProject: () => void;
  onClearCanvas: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  hasProjectPath: boolean;
  isLocked?: boolean;
  onToggleLock?: () => void;
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
  isLocked,
  onToggleLock,
}: TopMenubarProps) {
  const { themeId, allThemes, setTheme, exportCurrentTheme, importTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportTheme = () => {
    const json = exportCurrentTheme();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `adkflow-theme-${themeId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = importTheme(content);
      if (result) {
        setTheme(result);
      } else {
        alert("Invalid theme file. Please check the format.");
      }
    };
    reader.readAsText(file);

    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        style={{ display: "none" }}
      />
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
            <MenubarSeparator />
            <MenubarItem onClick={onToggleLock} disabled={!onToggleLock}>
              {isLocked ? (
                <Unlock className="mr-2 h-4 w-4" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              {isLocked ? "Unlock Canvas" : "Lock Canvas"}
              <MenubarShortcut>⌘L</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            {/* Theme submenu */}
            <MenubarSub>
              <MenubarSubTrigger>
                <Palette className="mr-2 h-4 w-4" />
                Theme
              </MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarRadioGroup value={themeId} onValueChange={setTheme}>
                  {allThemes.map((theme) => (
                    <MenubarRadioItem key={theme.id} value={theme.id}>
                      {theme.name}
                    </MenubarRadioItem>
                  ))}
                </MenubarRadioGroup>
                <MenubarSeparator />
                <MenubarItem onClick={handleImportClick}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Theme...
                </MenubarItem>
                <MenubarItem onClick={handleExportTheme}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Current Theme
                </MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem onClick={() => setSettingsOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Settings...
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
