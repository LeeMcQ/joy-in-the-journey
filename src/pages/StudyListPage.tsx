import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  BookOpen,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useTheme } from "@/components/ui/ThemeProvider";
import { ArrowHeader } from "@/components/ui/ArrowHeader";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { cn, countQuestions, truncate } from "@/lib/utils";
import type { Study } from "@/data/types";

export function StudyListPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const studies = useAppStore((s) => s.studies);
  const progress = useAppStore((s) => s.progress);
  const getCompletionPercent = useAppStore((s) => s.getCompletionPercent);

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return studies;
    const q = query.toLowerCase();
    return studies.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.introduction.toLowerCase().includes(q) ||
        String(s.number).includes(q),
    );
  }, [studies, query]);

  const completedCount = studies.filter((s) => progress[s.id]?.completed).length;

  return (
    <div className="flex flex-col gap-5 px-5 pb-4 pt-10">
      {/* ── Page header ──────────────────────────────────── */}
      <div>
        <h1 className="font-display text-[24px] font-bold">
          Study Series
        </h1>
        <p className="text-muted mt-1 text-[13px]">
          {completedCount} of {studies.length} completed
        </p>
      </div>

      {/* ── Search bar ───────────────────────────────────── */}
      <div className="relative">
        <Search
          size={16}
          className="text-muted pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, topic, or number…"
          className="input pl-10 pr-10"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Study list ───────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {filtered.map((study, i) => (
          <StudyListItem
            key={study.id}
            study={study}
            index={i}
            pct={getCompletionPercent(study.id)}
            completed={!!progress[study.id]?.completed}
            started={!!progress[study.id]?.started}
            isDark={isDark}
            onTap={() => navigate(`/study/${study.id}`)}
          />
        ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16">
            <Search size={32} className="text-muted opacity-30" />
            <p className="text-muted text-sm">
              No studies match "{query}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Individual study list item                                        */
/* ------------------------------------------------------------------ */

function StudyListItem({
  study,
  index,
  pct,
  completed,
  started,
  isDark,
  onTap,
}: {
  study: Study;
  index: number;
  pct: number;
  completed: boolean;
  started: boolean;
  isDark: boolean;
  onTap: () => void;
}) {
  const total = countQuestions(study);

  return (
    <button
      onClick={onTap}
      className={cn(
        "card card-surface card-interactive w-full text-left",
        "animate-slide-up",
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      {/* Gold arrow header */}
      <ArrowHeader
        title={study.title}
        number={study.number}
        compact
        className="mb-3"
      />

      {/* Body row */}
      <div className="flex items-center gap-3">
        {/* Progress / status indicator */}
        <div className="shrink-0">
          {completed ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-500/15">
              <CheckCircle2 size={20} className="text-gold-500" />
            </div>
          ) : (
            <ProgressRing percent={pct} size={40} strokeWidth={3}>
              <span className="text-[9px] font-bold">{pct}%</span>
            </ProgressRing>
          )}
        </div>

        {/* Text content */}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-relaxed text-secondary">
            {truncate(study.introduction, 100)}
          </p>
          <div className="mt-1.5 flex items-center gap-3">
            <span className="text-muted flex items-center gap-1 text-[11px]">
              <BookOpen size={11} /> {total} questions
            </span>
            {started && !completed && (
              <span className="badge-gold text-2xs">In Progress</span>
            )}
            {completed && (
              <span className="inline-flex items-center gap-1 text-2xs font-semibold text-gold-500">
                <CheckCircle2 size={10} /> Complete
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <ChevronRight
          size={18}
          className={cn(
            "shrink-0",
            isDark ? "text-white/15" : "text-navy-200",
          )}
        />
      </div>
    </button>
  );
}
