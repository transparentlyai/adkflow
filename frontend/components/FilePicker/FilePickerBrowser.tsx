import type { DirectoryEntry } from "@/lib/types";
import type { FilePickerBrowserProps } from "./types";
import { getFileIcon } from "./utils";

export function FilePickerBrowser({
  theme,
  entries,
  loading,
  error,
  selectedFile,
  onFileClick,
}: FilePickerBrowserProps) {
  if (loading) {
    return (
      <div className="flex-1 overflow-auto p-4 min-h-[250px]">
        <div
          className="flex items-center justify-center h-full"
          style={{ color: theme.colors.nodes.common.text.muted }}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-auto p-4 min-h-[250px]">
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex-1 overflow-auto p-4 min-h-[250px]">
        <div
          className="text-center py-8"
          style={{ color: theme.colors.nodes.common.text.muted }}
        >
          <p className="text-sm">No files found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 min-h-[250px]">
      <div className="space-y-1">
        {entries.map((entry) => (
          <FilePickerEntry
            key={entry.path}
            entry={entry}
            isSelected={selectedFile === entry.path}
            theme={theme}
            onClick={() => onFileClick(entry)}
          />
        ))}
      </div>
    </div>
  );
}

interface FilePickerEntryProps {
  entry: DirectoryEntry;
  isSelected: boolean;
  theme: FilePickerBrowserProps["theme"];
  onClick: () => void;
}

function FilePickerEntry({
  entry,
  isSelected,
  theme,
  onClick,
}: FilePickerEntryProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-2 rounded-md transition-colors flex items-center gap-3"
      style={{
        backgroundColor: isSelected
          ? theme.colors.ui.primary + "20"
          : entry.is_directory
            ? theme.colors.ui.muted
            : "transparent",
        boxShadow: isSelected ? `0 0 0 2px ${theme.colors.ui.primary}` : "none",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = theme.colors.ui.accent;
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = entry.is_directory
            ? theme.colors.ui.muted
            : "transparent";
        }
      }}
    >
      <span className="text-lg">
        {entry.is_directory ? "📁" : getFileIcon(entry.name)}
      </span>
      <span
        className="flex-1 text-sm"
        style={{
          color: entry.is_directory
            ? theme.colors.nodes.common.text.secondary
            : theme.colors.nodes.common.text.primary,
          fontWeight: entry.is_directory ? 500 : 400,
        }}
      >
        {entry.name}
      </span>
      {entry.is_directory && (
        <span
          className="text-xs"
          style={{ color: theme.colors.nodes.common.text.muted }}
        >
          →
        </span>
      )}
    </button>
  );
}
