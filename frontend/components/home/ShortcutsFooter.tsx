import { useState, useRef, useCallback } from "react";
import { formatShortcut, isMacOS } from "@/lib/utils";
import { useFullscreen } from "@/hooks/useFullscreen";

const shortcuts = [
  { label: "Save", shortcut: () => formatShortcut("S") },
  { label: "Copy", shortcut: () => formatShortcut("C") },
  { label: "Paste", shortcut: () => formatShortcut("V") },
  { label: "Undo", shortcut: () => formatShortcut("Z") },
  { label: "Redo", shortcut: () => formatShortcut("Z", true) },
  { label: "Delete", shortcut: () => "Del" },
  { label: "Select", shortcut: () => (isMacOS() ? "⌘+Click" : "Ctrl+Click") },
  {
    label: "Zoom to Node",
    shortcut: () => (isMacOS() ? "⌥+Click" : "Alt+Click"),
  },
  {
    label: "Multi-select",
    shortcut: () => (isMacOS() ? "⇧+Drag" : "Shift+Drag"),
  },
];

export function ShortcutsFooter() {
  const { isFullscreen } = useFullscreen();
  const [isVisible, setIsVisible] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsVisible(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 300);
  }, []);

  return (
    <div
      className={
        isFullscreen
          ? `fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ${isVisible ? "translate-y-0" : "translate-y-full"}`
          : ""
      }
      onMouseEnter={isFullscreen ? handleMouseEnter : undefined}
      onMouseLeave={isFullscreen ? handleMouseLeave : undefined}
    >
      {isFullscreen && (
        <div className="absolute bottom-full left-0 right-0 h-4 bg-transparent" />
      )}
      <footer className="flex items-center justify-center gap-4 px-4 py-0.5 border-t border-border/50 bg-background/50">
        {shortcuts.map((item, index) => (
          <span key={item.label} className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground opacity-40">
              {item.label}
            </span>
            <kbd className="text-[10px] text-muted-foreground opacity-50 font-mono">
              {item.shortcut()}
            </kbd>
            {index < shortcuts.length - 1 && (
              <span className="text-muted-foreground opacity-30 ml-3">·</span>
            )}
          </span>
        ))}
      </footer>
    </div>
  );
}
