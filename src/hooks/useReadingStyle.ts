import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { FontFamily } from "@/data/types";

/** CSS font-family stacks for each option */
const FONT_STACKS: Record<FontFamily, string> = {
  sans: '"DM Sans", system-ui, -apple-system, sans-serif',
  serif: '"Lora", "EB Garamond", Georgia, serif',
  mono: '"Source Code Pro", ui-monospace, monospace',
};

export const FONT_LABELS: Record<FontFamily, string> = {
  sans: "Sans Serif",
  serif: "Serif",
  mono: "Monospace",
};

export const FONT_PREVIEW: Record<FontFamily, string> = {
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
};

/**
 * Returns a style object to apply to any reading container.
 * Usage: <div style={readingStyle}>{children}</div>
 */
export function useReadingStyle() {
  const fontSize = useAppStore((s) => s.settings.fontSize);
  const fontFamily = useAppStore((s) => s.settings.fontFamily);

  return useMemo(() => ({
    fontSize: `${fontSize}px`,
    lineHeight: fontSize <= 14 ? "1.7" : fontSize <= 18 ? "1.8" : "1.9",
    fontFamily: FONT_STACKS[fontFamily],
  }), [fontSize, fontFamily]);
}

/**
 * Tailwind class for the selected font family (for non-inline usage)
 */
export function useFontClass(): string {
  const fontFamily = useAppStore((s) => s.settings.fontFamily);
  switch (fontFamily) {
    case "sans": return "font-sans";
    case "serif": return "font-scripture";
    case "mono": return "font-mono";
  }
}
