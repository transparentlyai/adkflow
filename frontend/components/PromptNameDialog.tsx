"use client";

import { useState } from "react";

interface PromptNameDialogProps {
  isOpen: boolean;
  onSubmit: (promptName: string) => void;
  onCancel: () => void;
  type?: "prompt" | "context";
}

export default function PromptNameDialog({
  isOpen,
  onSubmit,
  onCancel,
  type = "prompt",
}: PromptNameDialogProps) {
  const [promptName, setPromptName] = useState("");
  const [error, setError] = useState("");

  // Labels based on type
  const labels = {
    prompt: {
      title: "Create New Prompt",
      description: "Enter a name for the prompt file",
      inputLabel: "Prompt Name",
      placeholder: "e.g., Customer Greeting, System Instructions",
      fileExtension: ".prompt.md",
      button: "Create Prompt",
      errorMessage: "Please enter a prompt name",
    },
    context: {
      title: "Create New Static Context",
      description: "Enter a name for the context file",
      inputLabel: "Context Name",
      placeholder: "e.g., API Documentation, Product Catalog",
      fileExtension: ".context.md",
      button: "Create Context",
      errorMessage: "Please enter a context name",
    },
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate prompt name
    if (!promptName.trim()) {
      setError(labels[type].errorMessage);
      return;
    }

    onSubmit(promptName.trim());
    setPromptName(""); // Reset for next time
  };

  const handleCancel = () => {
    setError("");
    setPromptName("");
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {labels[type].title}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {labels[type].description}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="mb-4">
            <label
              htmlFor="promptName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              {labels[type].inputLabel}
            </label>
            <input
              type="text"
              id="promptName"
              value={promptName}
              onChange={(e) => setPromptName(e.target.value)}
              placeholder={labels[type].placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500">
              File will be saved as: <span className="font-mono">{promptName ? promptName.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-') : type === 'prompt' ? 'prompt-name' : 'context-name'}{labels[type].fileExtension}</span>
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
            >
              {labels[type].button}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
