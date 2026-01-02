"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LogExplorerPage } from "@/components/LogExplorer/LogExplorerPage";

function LogExplorerContent() {
  const searchParams = useSearchParams();
  const projectPath = searchParams.get("project");

  return <LogExplorerPage projectPath={projectPath} />;
}

export default function LogsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <LogExplorerContent />
    </Suspense>
  );
}
