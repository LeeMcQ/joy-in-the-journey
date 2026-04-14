import { useState, useCallback, useRef, useEffect } from "react";
import { Highlighter, X, Trash2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import { feedbackHighlight } from "@/lib/audio";
import type { HighlightColor, HighlightContext, UserHighlight } from "@/data/types";

/* ================================================================== */
/*  Colour config                                                     */
/* ================================================================== */

export const HIGHLIGHT_COLORS: {
  id: HighlightColor;
  label: string;
  bg: string;
  bgStrong: string;
  ring: string;
}[] = [
  {
    id: "gold",
    label: "Gold",
    bg: "bg-yellow-200/40",
    bgStrong: "bg-yellow-300/60",
    ring: "ring-yellow-400",
  },
  {
    id: "blue",
    label: "Blue",
    bg: "bg-blue-200/40",
    bgStrong: "bg-blue-300/50",
    ring: "ring-blue-400",
  },
  {
    id: "green",
    label: "Green",
    bg: "bg-emerald-200/40",
    bgStrong: "bg-emerald-300/50",
    ring: "ring-emerald-400",
  },
  {
    id: "pink",
    label: "Pink",
    bg: "bg-pink-200/40",
    bgStrong: "bg-pink-300/50",
    ring: "ring-pink-400",
  },
];

export function colorConfig(color: HighlightColor) {
  return HIGHLIGHT_COLORS.find((c) => c.id === color) ?? HIGHLIGHT_COLORS[0];
}

/* ================================================================== */
/*  Props                                                             */
/* ================================================================== */

interface Props {
  /** The full text to render */
  text: string;
  /** Study ID for persistence */
  studyId: number;
  /** Context for the highlight (question, section, etc.) */
  context: HighlightContext;
  /** Extra classes on the wrapper <p> */
  className?: string;
  /** Inline style (for dynamic font size/family) */
  style?: React.CSSProperties;
}

/* ================================================================== */
/*  Component                                                         */
/* ================================================================== */

export function HighlightableText({
  text,
  studyId,
  context,
  className,
  style,
}: Props) {
  const highlights = useAppStore((s) => s.getHighlights(studyId));
  const addHighlight = useAppStore((s) => s.addHighlight);
  const removeHighlight = useAppStore((s) => s.removeHighlight);

  const [picker, setPicker] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const [tappedHighlight, setTappedHighlight] = useState<UserHighlight | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Filter highlights for this specific context
  const contextKey = JSON.stringify(context);
  const myHighlights = highlights.filter(
    (h) => JSON.stringify(h.context) === contextKey,
  );

  /* ── Handle text selection ──────────────────────────── */
  const handleSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      return;
    }

    const selectedText = sel.toString().trim();
    if (selectedText.length < 2) return;

    // Get position for the picker
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    setPicker({
      text: selectedText,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
    });
  }, []);

  const selectionTimerRef = useRef<ReturnType<typeof setTimeout>>();

  /* ── Mouseup / touchend listener ────────────────────── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handler = () => {
      clearTimeout(selectionTimerRef.current);
      selectionTimerRef.current = setTimeout(handleSelection, 10);
    };
    el.addEventListener("mouseup", handler);
    el.addEventListener("touchend", handler);
    return () => {
      clearTimeout(selectionTimerRef.current);
      el.removeEventListener("mouseup", handler);
      el.removeEventListener("touchend", handler);
    };
  }, [handleSelection]);

  /* ── Close picker on outside tap (mouse + touch) ──── */
  useEffect(() => {
    if (!picker && !tappedHighlight) return;
    const handler = (e: Event) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPicker(null);
        setTappedHighlight(null);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [picker, tappedHighlight]);

  /* ── Pick a colour ──────────────────────────────────── */
  const handlePickColor = (color: HighlightColor) => {
    if (!picker) return;
    addHighlight(studyId, picker.text, color, context);
    feedbackHighlight();
    setPicker(null);
    window.getSelection()?.removeAllRanges();
  };

  /* ── Delete a highlight ─────────────────────────────── */
  const handleDeleteHighlight = () => {
    if (!tappedHighlight) return;
    removeHighlight(studyId, tappedHighlight.id);
    setTappedHighlight(null);
  };

  /* ── Render text with highlights applied ────────────── */
  const renderedNodes = renderWithHighlights(text, myHighlights, (hl) => {
    setTappedHighlight(hl);
    setPicker(null);
  });

  return (
    <div ref={containerRef} className={cn("relative select-text", className)}>
      <p className="whitespace-pre-line leading-[1.85]" style={style}>{renderedNodes}</p>

      {/* ── Colour picker popup ───────────────────────── */}
      {picker && (
        <div
          className="absolute z-50 animate-scale-in"
          style={{
            left: `clamp(4px, ${picker.x - 72}px, calc(100% - 196px))`,
            top: Math.max(0, picker.y - 44),
          }}
        >
          <div className="flex items-center gap-1 rounded-xl bg-navy-800 px-2 py-1.5 shadow-lg ring-1 ring-white/10">
            <Highlighter size={13} className="mr-1 text-white/40" />
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => handlePickColor(c.id)}
                className={cn(
                  "h-7 w-7 rounded-full transition-transform active:scale-90",
                  c.bgStrong,
                )}
                aria-label={`Highlight ${c.label}`}
              />
            ))}
            <button
              onClick={() => { setPicker(null); window.getSelection()?.removeAllRanges(); }}
              className="ml-1 rounded-full p-1 text-white/30 hover:text-white/60"
            >
              <X size={13} />
            </button>
          </div>
          {/* Arrow */}
          <div className="mx-auto h-2 w-2 -translate-y-px rotate-45 bg-navy-800" />
        </div>
      )}

      {/* ── Highlight action popup (delete) ───────────── */}
      {tappedHighlight && (
        <div className="absolute left-1/2 top-0 z-50 -translate-x-1/2 -translate-y-12 animate-scale-in">
          <div className="flex items-center gap-2 rounded-xl bg-navy-800 px-3 py-2 shadow-lg ring-1 ring-white/10">
            <span className={cn("h-3 w-3 rounded-full", colorConfig(tappedHighlight.color).bgStrong)} />
            <span className="max-w-[160px] truncate text-xs text-white/70">
              {tappedHighlight.text}
            </span>
            <button
              onClick={handleDeleteHighlight}
              className="rounded-md p-1 text-red-400 hover:bg-red-500/20 active:scale-90"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={() => setTappedHighlight(null)}
              className="rounded-md p-1 text-white/30 hover:text-white/60"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Highlight rendering — merge highlight ranges over text            */
/* ================================================================== */

function renderWithHighlights(
  text: string,
  highlights: UserHighlight[],
  onTapHighlight: (hl: UserHighlight) => void,
): React.ReactNode[] {
  if (!highlights.length) return [text];

  // Build a list of regions to highlight
  type Region = { start: number; end: number; highlight: UserHighlight };
  const regions: Region[] = [];

  for (const hl of highlights) {
    // Find all occurrences of the highlighted text
    let searchFrom = 0;
    while (true) {
      const idx = text.indexOf(hl.text, searchFrom);
      if (idx === -1) break;
      regions.push({ start: idx, end: idx + hl.text.length, highlight: hl });
      searchFrom = idx + 1;
      break; // Only mark the first occurrence
    }
  }

  if (!regions.length) return [text];

  // Sort by start position
  regions.sort((a, b) => a.start - b.start);

  // Build nodes
  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  for (const region of regions) {
    // Avoid overlapping: skip if this region starts before cursor
    if (region.start < cursor) continue;

    // Plain text before highlight
    if (region.start > cursor) {
      nodes.push(text.slice(cursor, region.start));
    }

    // Highlighted span
    const cfg = colorConfig(region.highlight.color);
    nodes.push(
      <mark
        key={region.highlight.id}
        onClick={(e) => {
          e.stopPropagation();
          onTapHighlight(region.highlight);
        }}
        className={cn(
          "cursor-pointer rounded-sm px-0.5 -mx-0.5 transition-all",
          cfg.bg,
          "hover:ring-1",
          cfg.ring,
        )}
      >
        {text.slice(region.start, region.end)}
      </mark>,
    );

    cursor = region.end;
  }

  // Trailing text
  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}
