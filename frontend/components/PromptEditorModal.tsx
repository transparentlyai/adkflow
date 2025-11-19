"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { extractVariables } from "@/lib/variableExtractor";

// Dynamically import MDEditor and MarkdownPreview to avoid SSR issues
const MDEditor = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default),
  { ssr: false }
);

const MarkdownPreview = dynamic(
  () => import("@uiw/react-markdown-preview"),
  { ssr: false }
);

export interface PromptData {
  id: string;
  content: string;
  variables?: string[];
}

export interface PromptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptData: PromptData | null;
  onSave: (updatedPrompt: PromptData) => void;
}

/**
 * PromptEditorModal Component
 *
 * A modal dialog for editing prompt content with markdown support.
 * Features:
 * - Split view: markdown editor on left, preview on right
 * - Automatic variable detection from {variable_name} patterns
 * - Real-time preview with syntax highlighting
 * - Responsive design with Tailwind CSS
 */
export default function PromptEditorModal({
  isOpen,
  onClose,
  promptData,
  onSave,
}: PromptEditorModalProps) {
  const [content, setContent] = useState("");
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);

  // Initialize content when promptData changes
  useEffect(() => {
    if (promptData) {
      setContent(promptData.content || "");
    } else {
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
      content,
      variables: detectedVariables,
    };

    onSave(updatedPrompt);
    onClose();
  };

  const handleCancel = () => {
    // Reset content to original
    if (promptData) {
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
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Prompt</h2>
            <p className="text-sm text-gray-500 mt-1">
              ID: {promptData.id}
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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

        {/* Content - Split View */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Editor Panel */}
          <div className="flex-1 flex flex-col border-r border-gray-200 min-h-0">
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Markdown Editor
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <MDEditor
                value={content}
                onChange={(value) => setContent(value || "")}
                preview="edit"
                height={400}
                visibleDragbar={false}
                className="w-full"
              />
            </div>
          </div>

          {/* Preview Panel */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Preview
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <MarkdownPreview
                source={content}
                className="prose max-w-none"
              />
            </div>
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
            Save Prompt
          </button>
        </div>
      </div>
    </div>
  );
}
