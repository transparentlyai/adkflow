import type { Theme } from "@/lib/themes/types";

interface SectionContainerProps {
  title: string;
  theme: Theme;
  children: React.ReactNode;
}

export function SectionContainer({
  title,
  theme,
  children,
}: SectionContainerProps) {
  return (
    <div className="space-y-3">
      <h4
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: theme.colors.nodes.common.text.primary }}
      >
        {title}
      </h4>
      <div
        className="space-y-3 pl-2 border-l-2"
        style={{ borderColor: theme.colors.ui.primary }}
      >
        {children}
      </div>
    </div>
  );
}
