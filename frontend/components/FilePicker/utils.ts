export function getFileIcon(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "md":
      return "📝";
    case "py":
      return "🐍";
    case "js":
    case "ts":
    case "tsx":
    case "jsx":
      return "📜";
    case "json":
    case "yaml":
    case "yml":
      return "⚙️";
    default:
      return "📄";
  }
}
