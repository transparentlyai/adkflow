"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { FileJson, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

function ContextViewerContent() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key");
  const [content, setContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (key) {
      const stored = localStorage.getItem(`log-context-${key}`);
      if (stored) {
        setContent(stored);
        // Clean up after retrieving
        localStorage.removeItem(`log-context-${key}`);
      }
    }
  }, [key]);

  const handleCopy = async () => {
    if (content) {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!content) {
    return (
      <div className="h-screen flex items-center justify-center text-muted-foreground">
        No context data found. The link may have expired.
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <FileJson className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Context Viewer</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="h-8"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy JSON
            </>
          )}
        </Button>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language="json"
          value={content}
          options={{
            readOnly: true,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            folding: true,
            showFoldingControls: "always",
            fontSize: 13,
            wordWrap: "on",
            automaticLayout: true,
          }}
          theme="vs-dark"
        />
      </div>
    </div>
  );
}

export default function ContextPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <ContextViewerContent />
    </Suspense>
  );
}
