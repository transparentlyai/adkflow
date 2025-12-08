"use client";

import { createContext, useContext, ReactNode } from "react";

interface ProjectContextValue {
  projectPath: string | null;
  onSaveFile?: (filePath: string, content: string) => Promise<void>;
  onRequestFilePicker?: (currentFilePath: string, onSelect: (newPath: string) => void) => void;
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
  onRequestFilePicker?: (currentFilePath: string, onSelect: (newPath: string) => void) => void;
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
