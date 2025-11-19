"use client";

interface SaveConfirmDialogProps {
  isOpen: boolean;
  projectPath: string;
  onSaveAndContinue: () => void;
  onDontSave: () => void;
  onCancel: () => void;
}

export default function SaveConfirmDialog({
  isOpen,
  projectPath,
  onSaveAndContinue,
  onDontSave,
  onCancel,
}: SaveConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Save Current Project?
          </h3>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 mb-4">
            You have unsaved changes in your current project.
          </p>

          {projectPath && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-xs text-gray-500 mb-1">Current project:</p>
              <p className="text-sm font-mono text-gray-700 break-all">
                {projectPath}
              </p>
            </div>
          )}

          <p className="text-sm text-gray-600">
            Would you like to save before continuing?
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end rounded-b-lg">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onDontSave}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-md transition-colors"
          >
            Don&apos;t Save
          </button>
          <button
            onClick={onSaveAndContinue}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
          >
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
