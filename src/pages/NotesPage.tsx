import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  StickyNote,
  MessageSquareText,
  ChevronRight,
  FileText,
  Highlighter,
  Trash2,
  BarChart3,
  CheckCircle2,
  BookOpen,
  Clock,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useTheme } from "@/components/ui/ThemeProvider";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { colorConfig } from "@/components/study/HighlightableText";
import { cn, studyLabel, countQuestions } from "@/lib/utils";
import type { Study, Question } from "@/data/types";

/* ================================================================== */
/*  Tab types                                                         */
/* ================================================================== */

type Tab = "answers" | "highlights" | "progress";

/* ================================================================== */
/*  Page                                                              */
/* ================================================================== */

export function NotesPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const studies = useAppStore((s) => s.studies);
  const progress = useAppStore((s) => s.progress);
  const removeHighlight = useAppStore((s) => s.removeHighlight);
  const getAllHighlights = useAppStore((s) => s.getAllHighlights);
  const getCompletionPercent = useAppStore((s) => s.getCompletionPercent);
  const overallPct = useAppStore((s) => s.overallPercent());
  const totalAnswered = useAppStore((s) => s.totalAnswered());
  const totalHL = useAppStore((s) => s.totalHighlights());

  const [tab, setTab] = useState<Tab>("answers");

  /* ── Answers grouped by study ───────────────────────── */
  const answerGroups = useMemo(() => {
    const groups: { study: Study; answers: { q: Question; answer: string }[] }[] = [];
    for (const study of studies) {
      const p = progress[study.id];
      if (!p) continue;
      const answers: { q: Question; answer: string }[] = [];
      for (const el of study.elements) {
        if (el.kind === "question") {
          const ans = p.answeredQuestions[el.data.number];
          if (ans) answers.push({ q: el.data, answer: ans });
        }
      }
      if (answers.length) groups.push({ study, answers });
    }
    return groups;
  }, [studies, progress]);

  /* ── All highlights ─────────────────────────────────── */
  const allHighlights = useMemo(() => getAllHighlights(), [getAllHighlights, progress]);

  /* ── Progress stats ─────────────────────────────────── */
  const completedCount = studies.filter((s) => progress[s.id]?.completed).length;
  const startedCount = Object.values(progress).filter((p) => p.started).length;

  return (
    <div className="flex flex-col gap-4 px-5 pb-4 pt-10">
      <h1 className="font-display text-[24px] font-bold">My Notes</h1>

      {/* ── Tabs ─────────────────────────────────────────── */}
      <div className="flex gap-1 rounded-xl bg-surface p-1">
        {([
          { id: "answers" as Tab, label: "Answers", count: totalAnswered },
          { id: "highlights" as Tab, label: "Highlights", count: totalHL },
          { id: "progress" as Tab, label: "Progress", count: completedCount },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-lg py-2 text-center text-[12px] font-semibold transition-all",
              tab === t.id
                ? "bg-gold-500 text-navy-900 shadow-gold-glow"
                : "text-muted",
            )}
          >
            {t.label}
            {t.count > 0 && (
              <span className={cn(
                "ml-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-2xs font-bold",
                tab === t.id ? "bg-navy-900/20 text-navy-900" : "bg-surface text-muted",
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── ANSWERS TAB ──────────────────────────────────── */}
      {tab === "answers" && (
        <>
          {answerGroups.length === 0 && <EmptyState icon={StickyNote} message="No answers yet" sub="Start a study and answer questions — your responses will appear here." onAction={() => navigate("/studies")} actionLabel="Start Studying" isDark={isDark} />}

          {answerGroups.map(({ study, answers }) => (
            <section key={study.id} className="flex flex-col gap-2">
              <button onClick={() => navigate(`/study/${study.id}`)} className="flex items-center gap-2 py-1">
                <FileText size={14} className="text-gold-500" />
                <h2 className="flex-1 text-left text-xs font-bold uppercase tracking-caps text-gold-500">
                  {studyLabel(study.number)} — {study.title}
                </h2>
                <ChevronRight size={14} className="text-muted" />
              </button>

              {answers.map((entry) => (
                <div key={`${study.id}-q${entry.q.number}`} className="card card-surface">
                  <div className="flex gap-2.5">
                    <span className="q-badge !h-6 !w-6 text-[10px]">{entry.q.number}</span>
                    <p className="text-secondary flex-1 text-[13px] font-medium leading-snug">
                      {entry.q.text}
                    </p>
                  </div>
                  <p className="mt-1.5 pl-8 font-scripture text-[11px] italic text-gold-600/70">
                    {entry.q.scripture.raw}
                  </p>
                  <div className="mt-2.5 flex gap-2.5 pl-8">
                    <MessageSquareText size={13} className="mt-0.5 shrink-0 text-gold-500/50" />
                    <p className="text-[13px] leading-relaxed">{entry.answer}</p>
                  </div>
                </div>
              ))}
            </section>
          ))}
        </>
      )}

      {/* ── HIGHLIGHTS TAB ───────────────────────────────── */}
      {tab === "highlights" && (
        <>
          {allHighlights.length === 0 && <EmptyState icon={Highlighter} message="No highlights yet" sub="Select text in any study and choose a colour to highlight it." isDark={isDark} />}

          {allHighlights.map(({ studyId, studyTitle, highlight: hl }) => {
            const cfg = colorConfig(hl.color);
            return (
              <div key={hl.id} className="card card-surface animate-fade-in">
                <div className="flex items-start gap-3">
                  <div className={cn("mt-1 h-3 w-3 shrink-0 rounded-full", cfg.bgStrong)} />
                  <div className="min-w-0 flex-1">
                    <p className={cn("rounded-md px-1 -mx-1 text-[14px] font-medium leading-relaxed", cfg.bg)}>
                      {hl.text}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/study/${studyId}`)}
                        className="text-muted text-[11px] hover:text-gold-500"
                      >
                        {studyTitle}
                      </button>
                      <span className="text-muted text-[10px]">·</span>
                      <span className="text-muted text-[10px]">
                        {hl.context.type === "question" && `Q${hl.context.questionNumber}`}
                        {hl.context.type === "note" && `Note Q${hl.context.questionNumber}`}
                        {hl.context.type === "section" && "Section"}
                        {hl.context.type === "introduction" && "Intro"}
                      </span>
                      <span className="text-muted text-[10px]">·</span>
                      <span className="text-muted text-[10px]">
                        {new Date(hl.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeHighlight(studyId, hl.id)}
                    className="shrink-0 rounded-md p-1.5 text-muted hover:text-red-400 active:bg-red-500/10"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ── PROGRESS TAB ─────────────────────────────────── */}
      {tab === "progress" && (
        <div className="flex flex-col gap-4">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            <MiniStat icon={BookOpen} value={startedCount} label="Started" />
            <MiniStat icon={CheckCircle2} value={completedCount} label="Complete" />
            <MiniStat icon={BarChart3} value={`${overallPct}%`} label="Overall" />
          </div>

          {/* Per-study progress */}
          <div className="flex flex-col gap-2">
            {studies.map((study) => {
              const p = progress[study.id];
              const pct = getCompletionPercent(study.id);
              const answered = Object.keys(p?.answeredQuestions ?? {}).length;
              const total = countQuestions(study);
              const hlCount = p?.highlights?.length ?? 0;

              return (
                <button
                  key={study.id}
                  onClick={() => navigate(`/study/${study.id}`)}
                  className="card card-surface card-interactive flex items-center gap-3 text-left"
                >
                  <ProgressRing percent={pct} size={38} strokeWidth={3}>
                    {p?.completed ? (
                      <CheckCircle2 size={14} className="text-gold-500" />
                    ) : (
                      <span className="text-[8px] font-bold">{pct}%</span>
                    )}
                  </ProgressRing>

                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold leading-snug truncate">
                      {study.title}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-muted text-[11px]">
                      <span>{answered}/{total} answered</span>
                      {hlCount > 0 && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <Highlighter size={10} /> {hlCount}
                          </span>
                        </>
                      )}
                      {p?.completed && p.completedAt && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <Clock size={10} /> {new Date(p.completedAt).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={16} className={isDark ? "text-white/10" : "text-navy-200"} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Sub-components                                                    */
/* ================================================================== */

function EmptyState({
  icon: Icon,
  message,
  sub,
  onAction,
  actionLabel,
  isDark,
}: {
  icon: typeof StickyNote;
  message: string;
  sub: string;
  onAction?: () => void;
  actionLabel?: string;
  isDark: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl", isDark ? "bg-white/5" : "bg-navy-50")}>
        <Icon size={28} className="text-muted opacity-40" />
      </div>
      <div className="text-center">
        <p className="text-secondary text-sm font-medium">{message}</p>
        <p className="text-muted mt-1 max-w-[260px] text-[13px] leading-relaxed">{sub}</p>
      </div>
      {onAction && actionLabel && (
        <button onClick={onAction} className="btn-primary mt-2">{actionLabel}</button>
      )}
    </div>
  );
}

function MiniStat({ icon: Icon, value, label }: { icon: typeof BookOpen; value: number | string; label: string }) {
  return (
    <div className="card card-surface flex flex-col items-center gap-1.5 py-4">
      <Icon size={16} className="text-gold-500/50" />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-muted text-2xs font-medium uppercase tracking-caps">{label}</p>
    </div>
  );
}
