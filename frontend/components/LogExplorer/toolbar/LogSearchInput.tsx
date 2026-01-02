import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface LogSearchInputProps {
  search: string;
  onSearchChange: (search: string) => void;
}

export function LogSearchInput({
  search,
  onSearchChange,
}: LogSearchInputProps) {
  return (
    <div className="relative flex-1 max-w-xs">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search messages..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="h-8 pl-8 pr-8 text-sm"
      />
      {search && (
        <button
          onClick={() => onSearchChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
