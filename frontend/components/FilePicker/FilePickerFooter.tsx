import type { FilePickerFooterProps } from "./types";

export function FilePickerFooter({
  theme,
  entries,
  defaultExtensions,
  filterLabel,
  showAllFiles,
  canSelect,
  allowCreate,
  newFileName,
  selectDirectory,
  onShowAllFilesChange,
  onCancel,
  onSelect,
}: FilePickerFooterProps) {
  const fileCount = entries.filter((e) => !e.is_directory).length;
  const folderCount = entries.filter((e) => e.is_directory).length;

  return (
    <div
      className="px-6 py-4 border-t flex justify-between items-center"
      style={{
        backgroundColor: theme.colors.nodes.common.footer.background,
        borderColor: theme.colors.nodes.common.container.border,
      }}
    >
      <div className="flex items-center gap-4">
        <div
          className="text-xs"
          style={{ color: theme.colors.nodes.common.text.muted }}
        >
          {selectDirectory
            ? `${folderCount} folders`
            : `${fileCount} files, ${folderCount} folders`}
        </div>
        {!selectDirectory &&
          defaultExtensions &&
          defaultExtensions.length > 0 && (
            <label
              className="flex items-center gap-2 text-xs cursor-pointer"
              style={{ color: theme.colors.nodes.common.text.secondary }}
            >
              <input
                type="checkbox"
                checked={showAllFiles}
                onChange={(e) => onShowAllFilesChange(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
                style={{ borderColor: theme.colors.ui.border }}
              />
              <span>Show all files</span>
              {!showAllFiles && filterLabel && (
                <span style={{ color: theme.colors.nodes.common.text.muted }}>
                  ({filterLabel})
                </span>
              )}
            </label>
          )}
      </div>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 font-medium transition-colors hover:opacity-80"
          style={{ color: theme.colors.nodes.common.text.secondary }}
        >
          Cancel
        </button>
        <button
          onClick={onSelect}
          disabled={!canSelect}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
        >
          {selectDirectory
            ? "Select Directory"
            : allowCreate && newFileName.trim()
              ? "Create"
              : "Select"}
        </button>
      </div>
    </div>
  );
}
