"use client";

import { memo, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy, CheckCheck, GripHorizontal } from "lucide-react";
import Editor from "@monaco-editor/react";

const MIN_HEIGHT = 80;
const MAX_HEIGHT = 500;

export interface ContentBlockProps {
  content: string;
  onAccept: () => void;
}

/**
 * Renders a content block with a readonly Monaco editor and action buttons.
 * Used to display suggested/fixed content from AI with options to copy or accept.
 */
const ContentBlock = memo(({ content, onAccept }: ContentBlockProps) => {
  const [copied, setCopied] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Calculate initial height based on content lines
  const lineCount = content.split("\n").length;
  const initialHeight = Math.min(
    Math.max(lineCount * 20 + 20, MIN_HEIGHT),
    300,
  );
  const [height, setHeight] = useState(initialHeight);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.movementY;
      setHeight((h) => Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, h + deltaY)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  return (
    <div className="my-2 rounded-lg border bg-muted/30 overflow-hidden w-full max-w-full">
      <div style={{ height }} className="w-full overflow-hidden">
        <Editor
          value={content}
          language="markdown"
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            lineNumbers: "off",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            folding: false,
            renderLineHighlight: "none",
            automaticLayout: true,
            scrollbar: {
              vertical: "auto",
              horizontal: "hidden",
            },
            padding: { top: 8, bottom: 8 },
          }}
        />
      </div>
      {/* Resize handle */}
      <div
        className="h-2 cursor-ns-resize bg-background border-t flex items-center justify-center hover:bg-muted/50 transition-colors"
        onMouseDown={handleResizeStart}
      >
        <GripHorizontal className="h-3 w-3 text-muted-foreground/50" />
      </div>
      <div className="flex gap-2 p-2 border-t bg-background">
        <Button size="sm" variant="outline" onClick={handleCopy}>
          {copied ? (
            <CheckCheck className="h-3 w-3 mr-1" />
          ) : (
            <Copy className="h-3 w-3 mr-1" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button size="sm" onClick={onAccept}>
          <Check className="h-3 w-3 mr-1" />
          Use it
        </Button>
      </div>
    </div>
  );
});

ContentBlock.displayName = "ContentBlock";

export default ContentBlock;
