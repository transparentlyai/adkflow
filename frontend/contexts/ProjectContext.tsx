"use client";

import { createContext, useContext, ReactNode } from "react";

interface ProjectContextValue {
  projectPath: string | null;
  onSaveFile?: (filePath: string, content: string) => Promise<void>;
  onRequestFilePicker?: (currentFilePath: string, onSelect: (newPath: string) => void) => void;
}

const ProjectContext = createContext<ProjectContextValue>({
  projectPath: null,
});

interface ProjectProviderProps {
  children: ReactNode;
  projectPath: string | null;
  onSaveFile?: (filePath: string, content: string) => Promise<void>;
  onRequestFilePicker?: (currentFilePath: string, onSelect: (newPath: string) => void) => void;
}

export function ProjectProvider({
  children,
  projectPath,
  onSaveFile,
  onRequestFilePicker,
}: ProjectProviderProps) {
  return (
    <ProjectContext.Provider value={{ projectPath, onSaveFile, onRequestFilePicker }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}
