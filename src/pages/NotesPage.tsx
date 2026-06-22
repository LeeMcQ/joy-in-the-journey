/* REC 5 — Living Spiritual Journal + REC 8 — Sharing */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BookHeart, MessageSquareText, ChevronRight, FileText, Highlighter, Trash2, BarChart3, CheckCircle2, BookOpen, Clock, Share2, Clock3 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useTheme } from "@/components/ui/ThemeProvider";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { colorConfig } from "@/components/study/HighlightableText";
import { ShareModal } from "@/components/ui/ShareModal";
import { showToast } from "@/components/ui/Toast";
import { cn, studyLabel, countQuestions } from "@/lib/utils";
import { formatInsightMessage, formatStudyCompletionMessage, shareOrCopy } from "@/lib/sharing";
import type { Study, Question } from "@/data/types";

type Tab = "timeline" | "answers" | "highlights" | "progress";

function depthDots(answer: string): { dots: number; label: string | null } {
  const words = answer.trim().split(/\s+/).length;
  if (words >= 100) return { dots: 3, label: "Deep Reflection" };
  if (words >= 30) return { dots: 2, label: null };
  return { dots: 1, label: null };
}

const MILESTONES = [
  { count: 7,  label: "Faithful Student",  emoji: "🌱" },
  { count: 14, label: "Devoted Seeker",    emoji: "📖" },
  { count: 21, label: "Steadfast Pilgrim", emoji: "✝️" },
  { count: 28, label: "Completed Journey", emoji: "👑" },
];

function getDailyRevisit(answerGroups: { study: Study; answers: { q: Question; answer: string }[] }[]) {
  const all = answerGroups.flatMap((g) => g.answers.map((a) => ({ ...a, studyTitle: g.study.title, studyId: g.study.id })));
  if (all.length < 2) return null;
  return all[Math.floor(Date.now() / 86400000) % all.length];
}

function relTime(iso?: string): string {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "Today"; if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotesPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const studies           = useAppStore((s) => s.studies);
  const progress          = useAppStore((s) => s.progress);
  const removeHighlight   = useAppStore((s) => s.removeHighlight);
  const getAllHighlights   = useAppStore((s) => s.getAllHighlights);
  const getCompletionPercent = useAppStore((s) => s.getCompletionPercent);
  const overallPct        = useAppStore((s) => s.overallPercent());
  const totalAnswered     = useAppStore((s) => s.totalAnswered());
  const totalHL           = useAppStore((s) => s.totalHighlights());

  const [tab, setTab] = useState<Tab>("timeline");
  const [shareModal, setShareModal] = useState<{ open: boolean; text: string; title: string }>({ open: false, text: "", title: "" });

  const answerGroups = useMemo(() => {
    return studies.flatMap((study) => {
      const p = progress[study.id];
      if (!p) return [];
      const answers = study.elements
        .filter((el) => el.kind === "question")
        .map((el) => ({ q: el.data as Question, answer: p.answeredQuestions[(el.data as Question).number] }))
        .filter((a) => a.answer);
      return answers.length ? [{ study, answers }] : [];
    });
  }, [studies, progress]);

  const allHighlights = useMemo(() => getAllHighlights(), [getAllHighlights, progress]);
  const completedCount = studies.filter((s) => progress[s.id]?.completed).length;
  const startedCount   = Object.values(progress).filter((p) => p.started).length;
  const dailyRevisit   = getDailyRevisit(answerGroups);

  const openShare = (text: string, title: string) => setShareModal({ open: true, text, title });

  return (
    <div className="flex flex-col gap-4 px-5 pb-4 pt-10">
      <h1 className="font-display text-[24px] font-bold">My Spiritual Journal</h1>

      {/* Milestone badges */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {MILESTONES.map((m) => {
          const earned = completedCount >= m.count;
          return (
            <div key={m.count} className={cn("flex shrink-0 flex-col items-center gap-1 rounded-full px-3 py-2", earned ? "bg-gold-500/10 ring-1 ring-gold-500/30" : "bg-surface opacity-40")}>
              <span className="text-lg">{m.emoji}</span>
              <span className={cn("text-[10px] font-bold whitespace-nowrap", earned ? "text-gold-500" : "text-muted")}>{m.label}</span>
              {!earned && <span className="text-[9px] text-muted">{m.count - completedCount} more</span>}
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-surface p-1">
        {([{ id: "timeline" as Tab, label: "Timeline" }, { id: "answers" as Tab, label: "Answers", count: totalAnswered }, { id: "highlights" as Tab, label: "Highlights", count: totalHL }, { id: "progress" as Tab, label: "Progress", count: completedCount }]).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex-1 rounded-lg py-2 text-center text-[11px] font-semibold transition-all", tab === t.id ? "bg-gold-500 text-navy-900 shadow-gold-glow" : "text-muted")}>
            {t.label}{"count" in t && (t.count ?? 0) > 0 && <span className={cn("ml-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-2xs font-bold", tab === t.id ? "bg-navy-900/20 text-navy-900" : "bg-surface text-muted")}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* TIMELINE */}
      {tab === "timeline" && (
        <div className="flex flex-col gap-4">
          {dailyRevisit && (
            <div className="rounded-2xl border border-gold-500/30 bg-gold-500/[0.04] p-4">
              <div className="flex items-center gap-2 mb-2"><Clock3 size={12} className="text-gold-500/60" /><span className="text-[10px] text-muted uppercase tracking-widest">From your journal</span></div>
              <p className="text-[13px] font-semibold text-secondary">{dailyRevisit.q.text}</p>
              <p className="mt-1 text-[13px] italic text-muted line-clamp-2">"{dailyRevisit.answer}"</p>
              <button onClick={() => navigate(`/study/${dailyRevisit.studyId}`)} className="mt-2 text-[11px] font-semibold text-gold-500 active:opacity-70">Reflect further →</button>
            </div>
          )}
          {answerGroups.length === 0 && allHighlights.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <BookHeart size={28} className="opacity-30 text-muted" />
              <p className="text-secondary text-sm font-medium">Your spiritual journey begins here</p>
              <p className="text-muted text-[13px]">Complete your first study to see your journal grow</p>
              <button onClick={() => navigate("/studies")} className="btn-primary mt-2">Start First Study</button>
            </div>
          )}
          <div className="border-l-2 border-gold-500/20 ml-4 pl-4 space-y-4">
            {studies.filter((s) => progress[s.id]?.completed).reverse().map((study) => {
              const firstAnswer = Object.values(progress[study.id]?.answeredQuestions ?? {})[0] ?? "";
              return (
                <div key={`c-${study.id}`} className="relative">
                  <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-gold-500 ring-2 ring-navy-900" />
                  <div className="rounded-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-gold-500/20 to-transparent p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-gold-500 uppercase tracking-widest">✓ Completed</span>
                          <p className="font-display text-[15px] font-bold mt-0.5">{study.title}</p>
                          <p className="text-muted text-[11px]">{relTime(progress[study.id]?.completedAt)}</p>
                        </div>
                        <button onClick={() => openShare(formatStudyCompletionMessage({ studyNumber: study.number, studyTitle: study.title, keyAnswer: firstAnswer, streakDays: 1 }), "Share Completion")} className="rounded-xl p-2 text-gold-500/60 active:opacity-70"><Share2 size={15} /></button>
                      </div>
                      {firstAnswer && <p className="mt-2 text-[12px] italic text-muted line-clamp-2">"{firstAnswer}"</p>}
                    </div>
                  </div>
                </div>
              );
            })}
            {answerGroups.slice(0, 5).flatMap(({ study, answers }) =>
              answers.slice(0, 2).map(({ q, answer }) => {
                const depth = depthDots(answer);
                return (
                  <div key={`a-${study.id}-${q.number}`} className="relative">
                    <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-navy-600 ring-2 ring-navy-900" />
                    <div className="card card-surface">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[12px] font-semibold text-secondary flex-1">{q.text}</p>
                        <button onClick={() => openShare(formatInsightMessage({ question: q.text, answer, studyTitle: study.title }), "Share Reflection")} className="shrink-0 p-1 text-muted active:opacity-70"><Share2 size={13} /></button>
                      </div>
                      <div className="flex items-center gap-1 mt-1 mb-2">
                        {Array.from({ length: depth.dots }).map((_, i) => <span key={i} className="text-gold-500 text-[8px]">●</span>)}
                        {depth.label && <span className="ml-1 rounded-full bg-gold-500/10 text-gold-500 text-[10px] px-2 py-0.5 font-bold">{depth.label}</span>}
                      </div>
                      <p className="text-[13px] leading-relaxed text-muted line-clamp-3">{answer}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ANSWERS */}
      {tab === "answers" && (
        <>
          {answerGroups.length === 0 && <div className="flex flex-col items-center gap-4 py-16 text-center"><BookHeart size={28} className="opacity-30 text-muted" /><p className="text-secondary text-sm">No answers yet</p><button onClick={() => navigate("/studies")} className="btn-primary mt-2">Start Studying</button></div>}
          {answerGroups.map(({ study, answers }) => (
            <section key={study.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 py-1">
                <button onClick={() => navigate(`/study/${study.id}`)} className="flex items-center gap-2 flex-1">
                  <FileText size={14} className="text-gold-500" />
                  <h2 className="flex-1 text-left text-xs font-bold uppercase tracking-caps text-gold-500">{studyLabel(study.number)} — {study.title}</h2>
                  <ChevronRight size={14} className="text-muted" />
                </button>
                <button onClick={() => openShare(`✝️ *${study.title}*\n\n${answers.map(({ q, answer }) => `Q: ${q.text}\nA: ${answer}`).join("\n\n")}\n\nleemcq.github.io/joy-in-the-journey`, "Share Study Journal")} className="p-1.5 rounded-lg text-gold-500/60 active:opacity-70"><Share2 size={13} /></button>
              </div>
              {answers.map(({ q, answer }) => {
                const depth = depthDots(answer);
                return (
                  <div key={`${study.id}-q${q.number}`} className="card card-surface">
                    <div className="flex gap-2.5">
                      <span className="q-badge !h-6 !w-6 text-[10px]">{q.number}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-secondary text-[13px] font-medium leading-snug">{q.text}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {Array.from({ length: depth.dots }).map((_, i) => <span key={i} className="text-gold-500 text-[8px]">●</span>)}
                          {depth.label && <span className="ml-1 rounded-full bg-gold-500/10 text-gold-500 text-[10px] px-2 py-0.5 font-bold">{depth.label}</span>}
                        </div>
                      </div>
                      <button onClick={() => openShare(formatInsightMessage({ question: q.text, answer, studyTitle: study.title }), "Share Reflection")} className="shrink-0 p-1 text-muted active:opacity-70"><Share2 size={13} /></button>
                    </div>
                    <p className="mt-1.5 pl-8 font-scripture text-[11px] italic text-gold-600/70">{q.scripture?.raw}</p>
                    <div className="mt-2.5 flex gap-2.5 pl-8"><MessageSquareText size={13} className="mt-0.5 shrink-0 text-gold-500/50" /><p className="text-[13px] leading-relaxed">{answer}</p></div>
                  </div>
                );
              })}
            </section>
          ))}
        </>
      )}

      {/* HIGHLIGHTS */}
      {tab === "highlights" && (
        <>
          {allHighlights.length === 0 && <div className="flex flex-col items-center gap-4 py-16 text-center"><Highlighter size={28} className="opacity-30 text-muted" /><p className="text-secondary text-sm">No highlights yet</p><p className="text-muted text-[13px]">Select text in any study and choose a colour.</p></div>}
          {allHighlights.map(({ studyId, studyTitle, highlight: hl }) => {
            const cfg = colorConfig(hl.color);
            return (
              <div key={hl.id} className="card card-surface animate-fade-in">
                <div className="flex items-start gap-3">
                  <div className={cn("mt-1 h-3 w-3 shrink-0 rounded-full", cfg.bgStrong)} />
                  <div className="min-w-0 flex-1">
                    <p className={cn("rounded-md px-1 -mx-1 text-[14px] font-medium leading-relaxed", cfg.bg)}>{hl.text}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <button onClick={() => navigate(`/study/${studyId}`)} className="text-muted text-[11px] hover:text-gold-500">{studyTitle}</button>
                      <span className="text-muted text-[10px]">·</span>
                      <span className="text-muted text-[10px]">{hl.context.type === "question" && `Q${hl.context.questionNumber}`}{hl.context.type === "section" && "Section"}{hl.context.type === "introduction" && "Intro"}</span>
                      <span className="text-muted text-[10px]">·</span>
                      <span className="text-muted text-[10px]">{new Date(hl.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button onClick={() => removeHighlight(studyId, hl.id)} className="shrink-0 rounded-md p-1.5 text-muted hover:text-red-400 active:bg-red-500/10"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* PROGRESS */}
      {tab === "progress" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="card card-surface flex flex-col items-center gap-1.5 py-4"><BookOpen size={16} className="text-gold-500/50" /><p className="text-lg font-bold">{startedCount}</p><p className="text-muted text-2xs uppercase tracking-caps">Started</p></div>
            <div className="card card-surface flex flex-col items-center gap-1.5 py-4"><CheckCircle2 size={16} className="text-gold-500/50" /><p className="text-lg font-bold">{completedCount}</p><p className="text-muted text-2xs uppercase tracking-caps">Complete</p></div>
            <div className="card card-surface flex flex-col items-center gap-1.5 py-4"><BarChart3 size={16} className="text-gold-500/50" /><p className="text-lg font-bold">{overallPct}%</p><p className="text-muted text-2xs uppercase tracking-caps">Overall</p></div>
          </div>
          {studies.map((study) => {
            const p = progress[study.id];
            const pct = getCompletionPercent(study.id);
            const answered = Object.keys(p?.answeredQuestions ?? {}).length;
            const total = countQuestions(study);
            return (
              <button key={study.id} onClick={() => navigate(`/study/${study.id}`)} className="card card-surface card-interactive flex items-center gap-3 text-left">
                <ProgressRing percent={pct} size={38} strokeWidth={3}>{p?.completed ? <CheckCircle2 size={14} className="text-gold-500" /> : <span className="text-[8px] font-bold">{pct}%</span>}</ProgressRing>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold leading-snug truncate">{study.title}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-muted text-[11px]">
                    <span>{answered}/{total} answered</span>
                    {p?.completedAt && <><span>·</span><span className="flex items-center gap-0.5"><Clock size={10} /> {new Date(p.completedAt).toLocaleDateString()}</span></>}
                  </div>
                </div>
                <ChevronRight size={16} className={isDark ? "text-white/10" : "text-navy-200"} />
              </button>
            );
          })}
        </div>
      )}

      <ShareModal open={shareModal.open} onClose={() => setShareModal((s) => ({ ...s, open: false }))} title={shareModal.title} previewText={shareModal.text} onShare={() => shareOrCopy(shareModal.text, (msg) => showToast(msg))} />
    </div>
  );
}
