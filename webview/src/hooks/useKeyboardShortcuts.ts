import { useEffect } from "react";

interface ShortcutHandlers {
  onTogglePlay: () => void;
  onNext: () => void;
  onFocusUrl?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onTogglePlay,
  onNext,
  onFocusUrl,
  enabled = true,
}: ShortcutHandlers): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        onTogglePlay();
      }
      if (event.code === "KeyN" && event.shiftKey) {
        event.preventDefault();
        onNext();
      }
      if (event.code === "Slash" && event.metaKey) {
        event.preventDefault();
        onFocusUrl?.();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, onTogglePlay, onNext, onFocusUrl]);
}
