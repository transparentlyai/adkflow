"use client";

import { createContext, useContext, type ReactNode } from "react";

interface RunWorkflowContextValue {
  runWorkflow: () => void;
  isRunning: boolean;
  hasProjectPath: boolean;
}

const RunWorkflowContext = createContext<RunWorkflowContextValue | null>(null);

export function RunWorkflowProvider({
  children,
  runWorkflow,
  isRunning,
  hasProjectPath,
}: {
  children: ReactNode;
  runWorkflow: () => void;
  isRunning: boolean;
  hasProjectPath: boolean;
}) {
  return (
    <RunWorkflowContext.Provider value={{ runWorkflow, isRunning, hasProjectPath }}>
      {children}
    </RunWorkflowContext.Provider>
  );
}

export function useRunWorkflow(): RunWorkflowContextValue | null {
  const context = useContext(RunWorkflowContext);
  return context;
}
