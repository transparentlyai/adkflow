"use client";

import { useState } from "react";

interface PromptNameDialogProps {
  isOpen: boolean;
  onSubmit: (promptName: string) => void;
  onCancel: () => void;
}

export default function PromptNameDialog({
  isOpen,
  onSubmit,
  onCancel,
}: PromptNameDialogProps) {
  const [promptName, setPromptName] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate prompt name
    if (!promptName.trim()) {
      setError("Please enter a prompt name");
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
            Create New Prompt
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Enter a name for the prompt file
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="mb-4">
            <label
              htmlFor="promptName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Prompt Name
            </label>
            <input
              type="text"
              id="promptName"
              value={promptName}
              onChange={(e) => setPromptName(e.target.value)}
              placeholder="e.g., Customer Greeting, System Instructions"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500">
              File will be saved as: <span className="font-mono">{promptName ? promptName.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-') : 'prompt-name'}.prompt.md</span>
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
              Create Prompt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
