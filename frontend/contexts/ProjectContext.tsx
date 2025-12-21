"use client";

import { createContext, useContext, ReactNode } from "react";

export interface FilePickerOptions {
  /** File extensions to filter by (e.g., ['.md', '.txt']) */
  extensions?: string[];
  /** Label for the filter dropdown (e.g., "Markdown files") */
  filterLabel?: string;
}

interface ProjectContextValue {
  projectPath: string | null;
  onSaveFile?: (filePath: string, content: string) => Promise<void>;
  onRequestFilePicker?: (
    currentFilePath: string,
    onSelect: (newPath: string) => void,
    options?: FilePickerOptions
  ) => void;
  isLocked?: boolean;
}

const ProjectContext = createContext<ProjectContextValue>({
  projectPath: null,
  isLocked: false,
});

interface ProjectProviderProps {
  children: ReactNode;
  projectPath: string | null;
  onSaveFile?: (filePath: string, content: string) => Promise<void>;
  onRequestFilePicker?: (
    currentFilePath: string,
    onSelect: (newPath: string) => void,
    options?: FilePickerOptions
  ) => void;
  isLocked?: boolean;
}

export function ProjectProvider({
  children,
  projectPath,
  onSaveFile,
  onRequestFilePicker,
  isLocked,
}: ProjectProviderProps) {
  return (
    <ProjectContext.Provider value={{ projectPath, onSaveFile, onRequestFilePicker, isLocked }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}
