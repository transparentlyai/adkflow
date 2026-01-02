import type { DirectoryEntry } from "@/lib/types";
import type { Theme } from "@/lib/themes/types";

export interface FilePickerProps {
  isOpen: boolean;
  projectPath: string;
  initialPath?: string;
  onSelect: (path: string) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  fileFilter?: (entry: DirectoryEntry) => boolean;
  /** Default file extensions to filter by (e.g., ['.md', '.txt']) */
  defaultExtensions?: string[];
  /** Label for the filter (e.g., "Markdown files") */
  filterLabel?: string;
  /** Allow creating new files (save mode) */
  allowCreate?: boolean;
}

export interface FilePickerNavigationBarProps {
  theme: Theme;
  parentPath: string | null;
  manualPath: string;
  loading: boolean;
  onGoUp: () => void;
  onManualPathChange: (path: string) => void;
  onNavigate: (path: string) => void;
}

export interface FilePickerBrowserProps {
  theme: Theme;
  entries: DirectoryEntry[];
  loading: boolean;
  error: string;
  selectedFile: string | null;
  onFileClick: (entry: DirectoryEntry) => void;
}

export interface FilePickerCreateNewProps {
  theme: Theme;
  currentPath: string;
  newFileName: string;
  projectPath: string;
  onNewFileNameChange: (name: string) => void;
  onSubmit: () => void;
  getRelativePath: (path: string) => string;
}

export interface FilePickerFooterProps {
  theme: Theme;
  entries: DirectoryEntry[];
  defaultExtensions?: string[];
  filterLabel?: string;
  showAllFiles: boolean;
  canSelect: boolean;
  allowCreate?: boolean;
  newFileName: string;
  onShowAllFilesChange: (show: boolean) => void;
  onCancel: () => void;
  onSelect: () => void;
}
