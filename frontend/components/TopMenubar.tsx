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
  Play,
  CheckCircle,
  Terminal,
  Check,
  Network,
  Bug,
  FileText,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLoggingConfig } from "@/hooks/useLoggingConfig";
import SettingsDialog from "@/components/SettingsDialog";
import DebugDialog from "@/components/DebugDialog";
import { LogExplorerDialog } from "@/components/LogExplorer";
import { formatShortcut } from "@/lib/utils";

interface TopMenubarProps {
  onNewProject: () => void;
  onLoadProject: () => void;
  onSaveProject: () => void;
  onClearCanvas: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  hasProjectPath: boolean;
  projectPath?: string | null;
  isLocked?: boolean;
  onToggleLock?: () => void;
  onRunWorkflow?: () => void;
  onValidateWorkflow?: () => void;
  onShowTopology?: () => void;
  isRunning?: boolean;
  showRunConsole?: boolean;
  onToggleRunConsole?: () => void;
  onOpenProjectSettings?: () => void;
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
  projectPath,
  isLocked,
  onToggleLock,
  onRunWorkflow,
  onValidateWorkflow,
  onShowTopology,
  isRunning,
  showRunConsole,
  onToggleRunConsole,
  onOpenProjectSettings,
}: TopMenubarProps) {
  const { themeId, allThemes, setTheme, exportCurrentTheme, importTheme } =
    useTheme();
  const { isDevMode } = useLoggingConfig();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [logExplorerOpen, setLogExplorerOpen] = useState(false);
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
              <MenubarShortcut>{formatShortcut("N")}</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={onLoadProject}>
              <FolderOpen className="mr-2 h-4 w-4" />
              Open Project
              <MenubarShortcut>{formatShortcut("O")}</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={onSaveProject} disabled={!hasProjectPath}>
              <Save className="mr-2 h-4 w-4" />
              Save
              <MenubarShortcut>{formatShortcut("S")}</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* Project Menu */}
        <MenubarMenu>
          <MenubarTrigger className="text-sm font-normal">
            Project
          </MenubarTrigger>
          <MenubarContent>
            <MenubarItem
              onClick={onOpenProjectSettings}
              disabled={!hasProjectPath}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
              <MenubarShortcut>{formatShortcut(",")}</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* Run Menu */}
        <MenubarMenu>
          <MenubarTrigger className="text-sm font-normal">Run</MenubarTrigger>
          <MenubarContent>
            <MenubarItem
              onClick={onRunWorkflow}
              disabled={!hasProjectPath || isRunning}
            >
              <Play className="mr-2 h-4 w-4" />
              Run Workflow
              <MenubarShortcut>{formatShortcut("R")}</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem
              onClick={onValidateWorkflow}
              disabled={!hasProjectPath}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Validate
              <MenubarShortcut>{formatShortcut("V", true)}</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={onShowTopology} disabled={!hasProjectPath}>
              <Network className="mr-2 h-4 w-4" />
              Show Topology
              <MenubarShortcut>{formatShortcut("T")}</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* Debug Menu - Only visible in dev mode */}
        {isDevMode && (
          <MenubarMenu>
            <MenubarTrigger className="text-sm font-normal">
              <Bug className="mr-1 h-3 w-3" />
              Debug
            </MenubarTrigger>
            <MenubarContent>
              <MenubarItem onClick={() => setDebugOpen(true)}>
                <Bug className="mr-2 h-4 w-4" />
                Debug Settings...
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem
                onClick={() => setLogExplorerOpen(true)}
                disabled={!hasProjectPath}
              >
                <FileText className="mr-2 h-4 w-4" />
                Log Explorer...
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        )}

        {/* Edit Menu */}
        <MenubarMenu>
          <MenubarTrigger className="text-sm font-normal">Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem disabled>
              <Undo2 className="mr-2 h-4 w-4" />
              Undo
              <MenubarShortcut>{formatShortcut("Z")}</MenubarShortcut>
            </MenubarItem>
            <MenubarItem disabled>
              <Redo2 className="mr-2 h-4 w-4" />
              Redo
              <MenubarShortcut>{formatShortcut("Z", true)}</MenubarShortcut>
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
              <MenubarShortcut>{formatShortcut("+")}</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={onZoomOut} disabled={!onZoomOut}>
              <ZoomOut className="mr-2 h-4 w-4" />
              Zoom Out
              <MenubarShortcut>{formatShortcut("-")}</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={onFitView} disabled={!onFitView}>
              <Maximize className="mr-2 h-4 w-4" />
              Fit to Screen
              <MenubarShortcut>{formatShortcut("0")}</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={onToggleLock} disabled={!onToggleLock}>
              {isLocked ? (
                <Unlock className="mr-2 h-4 w-4" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              {isLocked ? "Unlock Canvas" : "Lock Canvas"}
              <MenubarShortcut>{formatShortcut("L")}</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={onToggleRunConsole}>
              <Check
                className={`mr-2 h-4 w-4 ${showRunConsole ? "opacity-100" : "opacity-0"}`}
              />
              <Terminal className="mr-2 h-4 w-4" />
              Run Console
              <MenubarShortcut>{formatShortcut("J")}</MenubarShortcut>
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
      <DebugDialog
        open={debugOpen}
        onOpenChange={setDebugOpen}
        projectPath={projectPath}
      />
      <LogExplorerDialog
        open={logExplorerOpen}
        onOpenChange={setLogExplorerOpen}
        projectPath={projectPath ?? null}
      />
    </>
  );
}
