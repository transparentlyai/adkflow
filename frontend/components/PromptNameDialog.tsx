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

interface PromptNameDialogProps {
  isOpen: boolean;
  onSubmit: (promptName: string) => void;
  onCancel: () => void;
  type?: "prompt" | "context" | "tool" | "process";
}

export default function PromptNameDialog({
  isOpen,
  onSubmit,
  onCancel,
  type = "prompt",
}: PromptNameDialogProps) {
  const [promptName, setPromptName] = useState("");
  const [error, setError] = useState("");

  const labels = {
    prompt: {
      title: "Create New Prompt",
      description: "Enter a name for the prompt file",
      inputLabel: "Prompt Name",
      placeholder: "e.g., Customer Greeting, System Instructions",
      fileExtension: ".prompt.md",
      directory: "prompts/",
      button: "Create Prompt",
      errorMessage: "Please enter a prompt name",
    },
    context: {
      title: "Create New Static Context",
      description: "Enter a name for the context file",
      inputLabel: "Context Name",
      placeholder: "e.g., API Documentation, Product Catalog",
      fileExtension: ".context.md",
      directory: "static/",
      button: "Create Context",
      errorMessage: "Please enter a context name",
    },
    tool: {
      title: "Create New Tool",
      description: "Enter a name for the tool file",
      inputLabel: "Tool Name",
      placeholder: "e.g., Data Fetcher, Calculator",
      fileExtension: ".py",
      directory: "tools/",
      button: "Create Tool",
      errorMessage: "Please enter a tool name",
    },
    process: {
      title: "Create New Process",
      description: "Enter a name for the process file",
      inputLabel: "Process Name",
      placeholder: "e.g., Data Transformer, Validator",
      fileExtension: ".py",
      directory: "tools/",
      button: "Create Process",
      errorMessage: "Please enter a process name",
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
    setPromptName("");
  };

  const handleCancel = () => {
    setError("");
    setPromptName("");
    onCancel();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleCancel();
    }
  };

  const isPythonFile = type === "tool" || type === "process";
  const fileNamePreview = promptName
    ? promptName.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, isPythonFile ? "_" : "-")
    : type === "prompt"
    ? "prompt-name"
    : type === "context"
    ? "context-name"
    : "tool_name";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{labels[type].title}</DialogTitle>
          <DialogDescription>{labels[type].description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                {labels[type].directory}{fileNamePreview}
                {labels[type].fileExtension}
              </span>
            </p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">{labels[type].button}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
