"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Trash2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({
  open,
  onOpenChange,
}: SettingsDialogProps) {
  const {
    theme,
    themeId,
    builtInThemes,
    customThemes,
    setTheme,
    removeCustomTheme,
  } = useTheme();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Theme Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Theme</Label>
            <p className="text-sm text-muted-foreground">
              Choose a theme for the application
            </p>

            {/* Built-in themes */}
            <div className="flex gap-3">
              {builtInThemes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    themeId === t.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-accent"
                  }`}
                >
                  {t.id === "light" ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                  <span className="font-medium">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Themes */}
          {customThemes.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Custom Themes</Label>
              <div className="space-y-2">
                {customThemes.map((t) => (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                      themeId === t.id
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <button
                      onClick={() => setTheme(t.id)}
                      className="flex-1 text-left"
                    >
                      <div className="font-medium">{t.name}</div>
                      {t.description && (
                        <div className="text-sm text-muted-foreground">
                          {t.description}
                        </div>
                      )}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCustomTheme(t.id)}
                      className="ml-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Theme Info */}
          <div className="space-y-2 pt-4 border-t">
            <Label className="text-sm text-muted-foreground">
              Current Theme
            </Label>
            <div className="flex items-center gap-2">
              <span className="font-medium">{theme.name}</span>
              <span className="text-sm text-muted-foreground">
                v{theme.version}
              </span>
            </div>
            {theme.author && (
              <div className="text-sm text-muted-foreground">
                by {theme.author}
              </div>
            )}
            {theme.description && (
              <div className="text-sm text-muted-foreground">
                {theme.description}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
