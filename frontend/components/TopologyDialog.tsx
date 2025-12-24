"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Network, Copy, Check } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import type { TopologyResponse } from "@/lib/types";

// Track if mermaid has been initialized globally
let mermaidInitialized = false;

interface TopologyDialogProps {
  isOpen: boolean;
  result: TopologyResponse | null;
  onClose: () => void;
}

export default function TopologyDialog({
  isOpen,
  result,
  onClose,
}: TopologyDialogProps) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>("");

  useEffect(() => {
    if (!isOpen || !result?.mermaid) return;

    const renderMermaid = async () => {
      try {
        setRenderError(null);
        setSvgContent("");

        // Dynamic import to avoid SSR issues
        const mermaidModule = await import("mermaid");
        const mermaid = mermaidModule.default;

        // Verify mermaid loaded correctly
        if (!mermaid || typeof mermaid.initialize !== "function") {
          throw new Error("Mermaid failed to load properly");
        }

        // Only initialize once to avoid issues
        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: "loose",
            theme: "neutral",
            logLevel: "error",
          });
          mermaidInitialized = true;
        }

        // Get theme colors for the diagram (all must be strings)
        const agentColor = theme.colors.nodes.agent.header;
        const sequentialBg = theme.colors.nodes.agent.badges.sequential.background;
        const userInputColor = theme.colors.nodes.userInput.header;
        const outputFileColor = theme.colors.nodes.outputFile.header;

        // Replace hardcoded colors in Mermaid source with theme colors
        const themedMermaid = result.mermaid
          .replace(/fill:#4ade80/g, `fill:${agentColor}`)
          .replace(/fill:#e0f2fe/g, `fill:${sequentialBg}`)
          .replace(/stroke:#0284c7/g, `stroke:${sequentialBg}`)
          .replace(/fill:#fbbf24/g, `fill:${userInputColor}`)
          .replace(/fill:#60a5fa/g, `fill:${outputFileColor}`);

        // Generate unique ID for this render
        const id = `mermaid-${Date.now()}`;

        // Render the diagram
        const { svg } = await mermaid.render(id, themedMermaid);
        setSvgContent(svg);
      } catch (error) {
        console.error("Mermaid render error:", error);
        setRenderError(
          error instanceof Error ? error.message : "Failed to render diagram"
        );
      }
    };

    // Small delay to ensure dialog is fully mounted
    const timer = setTimeout(renderMermaid, 200);
    return () => clearTimeout(timer);
  }, [isOpen, result?.mermaid, theme]);

  const handleCopy = async () => {
    if (!result?.mermaid) return;

    try {
      await navigator.clipboard.writeText(result.mermaid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  if (!result) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-blue-500" />
            Agent Topology
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({result.agent_count} agents)
            </span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="diagram" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="diagram">Diagram</TabsTrigger>
            <TabsTrigger value="ascii">ASCII</TabsTrigger>
          </TabsList>

          <TabsContent
            value="diagram"
            className="flex-1 min-h-0 overflow-auto mt-4"
          >
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 z-10"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Mermaid
                  </>
                )}
              </Button>

              {renderError ? (
                <div className="rounded-md bg-red-500/10 p-4 text-red-400">
                  <p className="font-medium">Failed to render diagram</p>
                  <p className="text-sm mt-1">{renderError}</p>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                    {result.mermaid}
                  </pre>
                </div>
              ) : svgContent ? (
                <div
                  className="flex justify-center items-center min-h-[300px] bg-muted/50 rounded-md p-4"
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
              ) : (
                <div className="flex justify-center items-center min-h-[300px] bg-muted/50 rounded-md p-4 text-muted-foreground">
                  Loading diagram...
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent
            value="ascii"
            className="flex-1 min-h-0 overflow-auto mt-4"
          >
            <pre className="bg-muted rounded-md p-4 text-sm font-mono whitespace-pre overflow-auto">
              {result.ascii}
            </pre>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
