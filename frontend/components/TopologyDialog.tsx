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

        // Get theme colors for the diagram from topology section
        const topo = theme.colors.topology;

        // Replace hardcoded colors in Mermaid source with theme colors
        const themedMermaid = result.mermaid
          // Agent nodes (green)
          .replace(/fill:#4ade80/g, `fill:${topo.agentNode.fill}`)
          .replace(/stroke:#166534/g, `stroke:${topo.agentNode.stroke}`)
          // Subgraph depth 0
          .replace(/fill:#1e3a5f/g, `fill:${topo.subgraph.depth0.fill}`)
          .replace(/stroke:#60a5fa/g, `stroke:${topo.subgraph.depth0.stroke}`)
          .replace(/color:#e0f2fe/g, `color:${topo.subgraph.depth0.text}`)
          // Subgraph depth 1
          .replace(/fill:#2d4a6f/g, `fill:${topo.subgraph.depth1.fill}`)
          .replace(/stroke:#818cf8/g, `stroke:${topo.subgraph.depth1.stroke}`)
          .replace(/color:#e0e7ff/g, `color:${topo.subgraph.depth1.text}`)
          // Subgraph depth 2
          .replace(/fill:#3d5a7f/g, `fill:${topo.subgraph.depth2.fill}`)
          .replace(/stroke:#a78bfa/g, `stroke:${topo.subgraph.depth2.stroke}`)
          .replace(/color:#ede9fe/g, `color:${topo.subgraph.depth2.text}`)
          // Subgraph depth 3
          .replace(/fill:#4d6a8f/g, `fill:${topo.subgraph.depth3.fill}`)
          .replace(/stroke:#c4b5fd/g, `stroke:${topo.subgraph.depth3.stroke}`)
          .replace(/color:#f5f3ff/g, `color:${topo.subgraph.depth3.text}`)
          // UserInput nodes (amber/emerald)
          .replace(/fill:#fbbf24/g, `fill:${topo.userInput.fill}`)
          .replace(/stroke:#b45309/g, `stroke:${topo.userInput.stroke}`)
          // OutputFile nodes (blue/gray)
          .replace(/fill:#60a5fa/g, `fill:${topo.outputFile.fill}`)
          .replace(/stroke:#1d4ed8/g, `stroke:${topo.outputFile.stroke}`)
          // Start node (green circle)
          .replace(/fill:#22c55e/g, `fill:${topo.start.fill}`)
          .replace(/stroke:#16a34a/g, `stroke:${topo.start.stroke}`)
          // End node (red circle)
          .replace(/fill:#ef4444/g, `fill:${topo.end.fill}`)
          .replace(/stroke:#dc2626/g, `stroke:${topo.end.stroke}`);

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
