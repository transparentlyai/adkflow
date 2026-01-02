import type { FilePickerNavigationBarProps } from "./types";

export function FilePickerNavigationBar({
  theme,
  parentPath,
  manualPath,
  loading,
  onGoUp,
  onManualPathChange,
  onNavigate,
}: FilePickerNavigationBarProps) {
  return (
    <div
      className="px-6 py-3 border-b"
      style={{
        backgroundColor: theme.colors.nodes.common.footer.background,
        borderColor: theme.colors.nodes.common.container.border,
      }}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={onGoUp}
          disabled={!parentPath || loading}
          className="px-3 py-1 rounded text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-50"
          style={{
            backgroundColor: theme.colors.ui.muted,
            color: theme.colors.nodes.common.text.secondary,
          }}
          title="Go up one directory"
        >
          ↑ Up
        </button>
        <input
          type="text"
          value={manualPath}
          onChange={(e) => onManualPathChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && manualPath.trim()) {
              onNavigate(manualPath.trim());
            }
          }}
          className="flex-1 text-sm font-mono rounded px-2 py-1 border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          style={{
            color: theme.colors.nodes.common.text.secondary,
            backgroundColor: theme.colors.nodes.common.container.background,
            borderColor: theme.colors.ui.border,
          }}
          placeholder="Enter path..."
        />
        <button
          onClick={() => manualPath.trim() && onNavigate(manualPath.trim())}
          disabled={loading || !manualPath.trim()}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-sm font-medium transition-colors"
        >
          Go
        </button>
      </div>
    </div>
  );
}
