import { X, Code } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogToolbarActionsProps {
  formatJson: boolean;
  hasActiveFilters: boolean;
  onFormatJsonChange: (formatJson: boolean) => void;
  onResetFilters: () => void;
}

export function LogToolbarActions({
  formatJson,
  hasActiveFilters,
  onFormatJsonChange,
  onResetFilters,
}: LogToolbarActionsProps) {
  return (
    <>
      <Button
        variant={formatJson ? "default" : "outline"}
        size="sm"
        onClick={() => onFormatJsonChange(!formatJson)}
        className="h-8"
      >
        <Code className="h-3.5 w-3.5 mr-1.5" />
        Format JSON
      </Button>

      <div className="flex-1" />

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onResetFilters}
          className="h-8 text-muted-foreground"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Clear filters
        </Button>
      )}
    </>
  );
}
