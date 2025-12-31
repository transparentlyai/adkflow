"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import FilePicker from "@/components/FilePicker";

interface PromptNameDialogProps {
  isOpen: boolean;
  onSubmit: (promptName: string) => void;
  onSelectExisting?: (filePath: string) => void;
  onCancel: () => void;
  type?: "prompt" | "context" | "tool" | "process" | "outputFile";
  projectPath?: string;
}

export default function PromptNameDialog({
  isOpen,
  onSubmit,
  onSelectExisting,
  onCancel,
  type = "prompt",
  projectPath,
}: PromptNameDialogProps) {
  const [promptName, setPromptName] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"create" | "existing">("create");
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);

  const labels = {
    prompt: {
      title: "Create New Prompt",
      description: "Enter a name for the prompt file or select an existing one",
      inputLabel: "Prompt Name",
      placeholder: "e.g., Customer Greeting, System Instructions",
      fileExtension: ".prompt.md",
      directory: "prompts/",
      button: "Create Prompt",
      selectButton: "Select Prompt",
      errorMessage: "Please enter a prompt name",
      filterExtensions: [".prompt.md", ".md"],
      filterLabel: "Prompt files",
    },
    context: {
      title: "Create New Static Context",
      description:
        "Enter a name for the context file or select an existing one",
      inputLabel: "Context Name",
      placeholder: "e.g., API Documentation, Product Catalog",
      fileExtension: ".context.md",
      directory: "static/",
      button: "Create Context",
      selectButton: "Select Context",
      errorMessage: "Please enter a context name",
      filterExtensions: [".context.md", ".md"],
      filterLabel: "Context files",
    },
    tool: {
      title: "Create New Tool",
      description: "Enter a name for the tool file or select an existing one",
      inputLabel: "Tool Name",
      placeholder: "e.g., Data Fetcher, Calculator",
      fileExtension: ".py",
      directory: "tools/",
      button: "Create Tool",
      selectButton: "Select Tool",
      errorMessage: "Please enter a tool name",
      filterExtensions: [".py"],
      filterLabel: "Python files",
    },
    process: {
      title: "Create New Process",
      description:
        "Enter a name for the process file or select an existing one",
      inputLabel: "Process Name",
      placeholder: "e.g., Data Transformer, Validator",
      fileExtension: ".py",
      directory: "tools/",
      button: "Create Process",
      selectButton: "Select Process",
      errorMessage: "Please enter a process name",
      filterExtensions: [".py"],
      filterLabel: "Python files",
    },
    outputFile: {
      title: "Create New Output File",
      description: "Enter a name for the output file or select an existing one",
      inputLabel: "Output File Name",
      placeholder: "e.g., results, report, analysis",
      fileExtension: ".txt",
      directory: "outputs/",
      button: "Create Output File",
      selectButton: "Select Output File",
      errorMessage: "Please enter an output file name",
      filterExtensions: [],
      filterLabel: "All files",
    },
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!promptName.trim()) {
      setError(labels[type].errorMessage);
      return;
    }
    onSubmit(promptName.trim());
    resetState();
  };

  const resetState = () => {
    setPromptName("");
    setError("");
    setMode("create");
  };

  const handleCancel = () => {
    resetState();
    onCancel();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleCancel();
    }
  };

  const handleFilePickerSelect = (filePath: string) => {
    if (onSelectExisting) {
      onSelectExisting(filePath);
    }
    setIsFilePickerOpen(false);
    resetState();
  };

  const isPythonFile = type === "tool" || type === "process";
  const fileNamePreview = promptName
    ? promptName
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, isPythonFile ? "_" : "-")
    : type === "prompt"
      ? "prompt-name"
      : type === "context"
        ? "context-name"
        : type === "outputFile"
          ? "output"
          : "tool_name";

  const canSelectExisting = !!onSelectExisting && !!projectPath;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{labels[type].title}</DialogTitle>
            <DialogDescription>{labels[type].description}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {canSelectExisting && (
              <RadioGroup
                value={mode}
                onValueChange={(value) =>
                  setMode(value as "create" | "existing")
                }
                className="space-y-3"
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem
                    value="create"
                    id="mode-create"
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <Label
                      htmlFor="mode-create"
                      className="cursor-pointer font-medium"
                    >
                      Create new file
                    </Label>
                    {mode === "create" && (
                      <div className="space-y-2 pl-0">
                        <Input
                          id="promptName"
                          value={promptName}
                          onChange={(e) => setPromptName(e.target.value)}
                          placeholder={labels[type].placeholder}
                          autoFocus
                        />
                        <p className="text-xs text-muted-foreground">
                          File will be saved as:{" "}
                          <span className="font-mono">
                            {labels[type].directory}
                            {fileNamePreview}
                            {labels[type].fileExtension}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <RadioGroupItem
                    value="existing"
                    id="mode-existing"
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <Label
                      htmlFor="mode-existing"
                      className="cursor-pointer font-medium"
                    >
                      Select existing file
                    </Label>
                    {mode === "existing" && (
                      <div className="space-y-2 pl-0">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsFilePickerOpen(true)}
                          >
                            Browse...
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </RadioGroup>
            )}

            {!canSelectExisting && (
              <div className="space-y-2">
                <Label htmlFor="promptName">{labels[type].inputLabel}</Label>
                <Input
                  id="promptName"
                  value={promptName}
                  onChange={(e) => setPromptName(e.target.value)}
                  placeholder={labels[type].placeholder}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  File will be saved as:{" "}
                  <span className="font-mono">
                    {labels[type].directory}
                    {fileNamePreview}
                    {labels[type].fileExtension}
                  </span>
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit">
                {mode === "existing"
                  ? labels[type].selectButton
                  : labels[type].button}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {projectPath && (
        <FilePicker
          isOpen={isFilePickerOpen}
          projectPath={projectPath}
          initialPath={projectPath + "/" + labels[type].directory}
          onSelect={handleFilePickerSelect}
          onCancel={() => setIsFilePickerOpen(false)}
          title={`Select ${type.charAt(0).toUpperCase() + type.slice(1)} File`}
          description={`Choose an existing ${type} file from your project`}
          defaultExtensions={labels[type].filterExtensions}
          filterLabel={labels[type].filterLabel}
        />
      )}
    </>
  );
}
