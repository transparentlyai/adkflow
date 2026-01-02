import type { FilePickerCreateNewProps } from "./types";

export function FilePickerCreateNew({
  theme,
  currentPath,
  newFileName,
  projectPath,
  onNewFileNameChange,
  onSubmit,
  getRelativePath,
}: FilePickerCreateNewProps) {
  return (
    <div
      className="px-6 py-3 border-t"
      style={{
        backgroundColor: theme.colors.nodes.common.footer.background,
        borderColor: theme.colors.nodes.common.container.border,
      }}
    >
      <div className="flex items-center gap-2">
        <label
          className="text-sm whitespace-nowrap"
          style={{ color: theme.colors.nodes.common.text.secondary }}
        >
          New file:
        </label>
        <input
          type="text"
          value={newFileName}
          onChange={(e) => onNewFileNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newFileName.trim()) {
              onSubmit();
            }
          }}
          placeholder="Enter filename..."
          className="flex-1 text-sm font-mono rounded px-2 py-1 border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          style={{
            color: theme.colors.nodes.common.text.secondary,
            backgroundColor: theme.colors.nodes.common.container.background,
            borderColor: theme.colors.ui.border,
          }}
        />
      </div>
      {newFileName.trim() && (
        <div
          className="mt-1 text-xs font-mono truncate"
          style={{ color: theme.colors.nodes.common.text.muted }}
        >
          {getRelativePath(currentPath)}/{newFileName.trim()}
        </div>
      )}
    </div>
  );
}
