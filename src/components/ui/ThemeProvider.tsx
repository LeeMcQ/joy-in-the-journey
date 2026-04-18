import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useAppStore } from "@/store/useAppStore";
import type { AppSettings, FontFamily } from "@/data/types";

/* ------------------------------------------------------------------ */
/*  Font family CSS stacks                                            */
/* ------------------------------------------------------------------ */

const FONT_STACKS: Record<FontFamily, string> = {
  sans: '"DM Sans", system-ui, -apple-system, sans-serif',
  serif: '"Lora", "EB Garamond", Georgia, serif',
  mono: '"Source Code Pro", ui-monospace, monospace',
};

/* ------------------------------------------------------------------ */
/*  Theme semantic tokens (consumed by components)                    */
/* ------------------------------------------------------------------ */

export interface ThemeTokens {
  mode: AppSettings["theme"];

  // Convenience booleans
  isDark: boolean;
  isLight: boolean;
  isSepia: boolean;

  // Card helper — returns the right card class
  card: string;
  cardInteractive: string;

  // Text helpers
  textColor: string;
  textSecondary: string;
  textMuted: string;
}

const ThemeContext = createContext<ThemeTokens | null>(null);

/* ------------------------------------------------------------------ */
/*  Provider                                                          */
/* ------------------------------------------------------------------ */

const META_COLORS: Record<AppSettings["theme"], string> = {
  dark: "#0F172A",
  light: "#FFFFFF",
  sepia: "#F5F0E6",
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useAppStore((s) => s.settings.theme);
  const fontSize = useAppStore((s) => s.settings.fontSize);
  const fontFamily = useAppStore((s) => s.settings.fontFamily);

  /* Apply theme class + meta color */
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark", "theme-sepia");
    root.classList.add(`theme-${mode}`);

    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", META_COLORS[mode]);
  }, [mode]);

  /* Apply global font size + font family as CSS variables on :root */
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--app-font-size", `${fontSize}px`);
	
    root.style.setProperty("--app-line-height", fontSize <= 14 ? "1.6" : fontSize <= 18 ? "1.7" : "1.8");
    root.style.setProperty("--app-font-family", FONT_STACKS[fontFamily]);
	
  }, [fontSize, fontFamily]);

  /* Build semantic token object */
  const tokens = useMemo<ThemeTokens>(() => {
    const isDark = mode === "dark";
    const isLight = mode === "light";
    const isSepia = mode === "sepia";

    return {
      mode,
      isDark,
      isLight,
      isSepia,

      card: "card card-surface",
      cardInteractive: "card card-surface card-interactive",

      textColor: "text-primary",
      textSecondary: "text-secondary",
      textMuted: "text-muted",
    };
  }, [mode]);

  return (
    <ThemeContext.Provider value={tokens}>{children}</ThemeContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

export function useTheme(): ThemeTokens {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
