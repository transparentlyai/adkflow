"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { extractVariables } from "@/lib/variableExtractor";

// Dynamically import MDEditor to avoid SSR issues
const MDEditor = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default),
  { ssr: false }
);

export interface PromptData {
  id: string;
  name: string;
  content: string;
  filePath: string;
  variables?: string[];
}

export interface PromptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptData: PromptData | null;
  onSave: (updatedPrompt: PromptData) => void;
  type?: "prompt" | "context";
}

/**
 * PromptEditorModal Component
 *
 * A modal dialog for editing prompt content with markdown support.
 * Features:
 * - Full-width markdown editor
 * - Automatic variable detection from {variable_name} patterns
 * - File path display for easy reference
 * - Responsive design with Tailwind CSS
 */
export default function PromptEditorModal({
  isOpen,
  onClose,
  promptData,
  onSave,
  type = "prompt",
}: PromptEditorModalProps) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);

  // Labels based on type
  const labels = {
    prompt: {
      namePlaceholder: "Prompt name",
      saveButton: "Save Prompt",
    },
    context: {
      namePlaceholder: "Context name",
      saveButton: "Save Context",
    },
  };

  // Initialize content and name when promptData changes
  useEffect(() => {
    if (promptData) {
      setName(promptData.name || "");
      setContent(promptData.content || "");
    } else {
      setName("");
      setContent("");
    }
  }, [promptData]);

  // Auto-detect variables whenever content changes
  useEffect(() => {
    const variables = extractVariables(content);
    setDetectedVariables(variables);
  }, [content]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleSave = () => {
    if (!promptData) return;

    const updatedPrompt: PromptData = {
      ...promptData,
      name: name.trim() || promptData.name,
      content,
      variables: detectedVariables,
    };

    onSave(updatedPrompt);
    onClose();
  };

  const handleCancel = () => {
    // Reset content and name to original
    if (promptData) {
      setName(promptData.name || "");
      setContent(promptData.content || "");
    }
    onClose();
  };

  if (!isOpen || !promptData) {
    return null;
  }

  return (
    // Portal-like overlay using React createPortal pattern
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-7xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <label htmlFor="prompt-name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                id="prompt-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={labels[type].namePlaceholder}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">File:</span>
              <code className="text-sm text-gray-900 bg-gray-100 px-3 py-1 rounded border border-gray-200 font-mono select-all">
                {promptData.filePath}
              </code>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content - Editor */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto p-6">
            <MDEditor
              value={content}
              onChange={(value) => setContent(value || "")}
              preview="edit"
              height="100%"
              visibleDragbar={false}
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Variables Section */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Detected Variables
              </h4>
              {detectedVariables.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {detectedVariables.map((variable) => (
                    <span
                      key={variable}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
                    >
                      <code className="text-xs">{`{${variable}}`}</code>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  No variables detected. Use {"{variable_name}"} syntax to define variables.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Action Buttons */}
        <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {labels[type].saveButton}
          </button>
        </div>
      </div>
    </div>
  );
}
