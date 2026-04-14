import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Share2,
  PartyPopper,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useReadingStyle } from "@/hooks/useReadingStyle";
import { ArrowHeader } from "@/components/ui/ArrowHeader";
import { ReadingProgressBar } from "@/components/study/ReadingProgressBar";
import { QuestionBlock } from "@/components/study/QuestionBlock";
import { SectionBlock } from "@/components/study/SectionBlock";
import { BiblePopup } from "@/components/study/BiblePopup";
import { HighlightableText } from "@/components/study/HighlightableText";
import { cn, countQuestions, studyLabel } from "@/lib/utils";
import { feedbackComplete, feedbackBookmark, feedbackScripture, playNavBack, playNavForward } from "@/lib/audio";

export function StudyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const readingStyle = useReadingStyle();
  const scrollRef = useRef<HTMLDivElement>(null);

  const studies = useAppStore((s) => s.studies);
  const startStudy = useAppStore((s) => s.startStudy);
  const completeStudy = useAppStore((s) => s.completeStudy);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);
  const getProgress = useAppStore((s) => s.getProgress);
  const getCompletionPercent = useAppStore((s) => s.getCompletionPercent);

  const studyId = Number(id);
  const study = studies.find((s) => s.id === studyId);

  /* ── Bible popup ────────────────────────────────────── */
  const [scriptureRef, setScriptureRef] = useState<string | null>(null);
  const handleScriptureTap = useCallback((ref: string) => {
    feedbackScripture();
    setScriptureRef(ref);
  }, []);
  const closeBiblePopup = useCallback(() => {
    setScriptureRef(null);
  }, []);

  /* ── Completion celebration ─────────────────────────── */
  const [showCelebration, setShowCelebration] = useState(false);

  /* ── Mark started on mount ──────────────────────────── */
  useEffect(() => {
    if (study) {
      const p = getProgress(studyId);
      if (!p.started) startStudy(studyId);
    }
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [studyId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 404 ────────────────────────────────────────────── */
  if (!study) {
    return (
      <div className="flex h-[80dvh] flex-col items-center justify-center gap-5 px-5">
        <p className="font-display text-6xl font-bold text-gold-500/20">404</p>
        <p className="text-muted text-sm">Study not found</p>
        <button onClick={() => navigate("/studies")} className="btn-primary">
          Back to Studies
        </button>
      </div>
    );
  }

  const progress = getProgress(studyId);
  const pct = getCompletionPercent(studyId);
  const total = countQuestions(study);
  const answered = Object.keys(progress.answeredQuestions).length;
  const remaining = total - answered;
  const prevStudy = studies.find((s) => s.number === study.number - 1);
  const nextStudy = studies.find((s) => s.number === study.number + 1);

  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleComplete = () => {
    completeStudy(studyId);
    feedbackComplete();
    setShowCelebration(true);
    clearTimeout(celebrationTimerRef.current);
    celebrationTimerRef.current = setTimeout(() => setShowCelebration(false), 3000);
  };

  // Cleanup celebration timer
  useEffect(() => () => clearTimeout(celebrationTimerRef.current), []);

  let elementIndex = 0;

  return (
    <>
      <div
        ref={scrollRef}
        className="flex h-[100dvh] flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain scrollbar-hide"
      >
        {/* ── STICKY HEADER ──────────────────────────────── */}
        <div className="sticky top-0 z-40 shrink-0">
          <ReadingProgressBar percent={pct} />

          <header
            className={cn(
              "flex items-center justify-between gap-2 px-4 py-2",
              "border-b backdrop-blur-2xl backdrop-saturate-150",
              isDark
                ? "border-white/[0.06] bg-navy-800/90"
                : "border-theme bg-base/90",
            )}
          >
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 rounded-lg py-1 pr-2 text-sm font-medium text-gold-500 active:opacity-70"
            >
              <ArrowLeft size={18} />
              <span className="max-[340px]:hidden">Back</span>
            </button>

            <p className="text-muted truncate text-[11px] font-semibold uppercase tracking-caps">
              {studyLabel(study.number)}
            </p>

            <div className="flex items-center gap-1">
              <button
                onClick={() => { feedbackBookmark(); toggleBookmark(studyId); }}
                className="rounded-lg p-2.5 -m-1 active:opacity-70"
                aria-label={progress.bookmarked ? "Remove bookmark" : "Bookmark"}
              >
                <Bookmark
                  size={18}
                  className={cn(
                    "transition-all duration-200",
                    progress.bookmarked
                      ? "fill-gold-500 text-gold-500 drop-shadow-[0_0_4px_rgba(212,160,23,0.3)]"
                      : isDark ? "text-white/20" : "text-muted",
                  )}
                />
              </button>
              <button
                onClick={() => {
                  navigator.share?.({
                    title: `${study.title} — Joy in the Journey`,
                    text: `Study ${study.number}: ${study.title}`,
                  });
                }}
                className="rounded-lg p-2.5 -m-1 active:opacity-70"
              >
                <Share2
                  size={16}
                  className={isDark ? "text-white/20" : "text-muted"}
                />
              </button>
            </div>
          </header>
        </div>

        {/* ── STUDY CONTENT ──────────────────────────────── */}
        <div className="flex flex-col gap-6 px-5 pb-12 pt-7">

          {/* Arrow header */}
          <ArrowHeader
            title={study.title}
            number={study.number}
            seriesName="The Joy in the Journey Bible Study Series"
            className="animate-slide-up"
          />

          {/* Inline progress bar */}
          <div className="flex items-center gap-3 animate-slide-up stagger-1">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-gold-500 transition-all duration-700 ease-spring"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-muted shrink-0 text-[11px] font-semibold tabular-nums">
              {answered}/{total}
            </span>
          </div>

          {/* Introduction */}
          <div
            className="note-block animate-slide-up stagger-2 leading-[1.85] text-secondary"
            style={readingStyle}
          >
            <HighlightableText
              text={study.introduction}
              studyId={studyId}
              context={{ type: "introduction" }}
              style={readingStyle}
            />
          </div>

          <hr className="divider-gold animate-fade-in stagger-3" />

          {/* Questions & sections */}
          {study.elements.map((el, i) => {
            const idx = elementIndex++;
            if (el.kind === "question") {
              return (
                <QuestionBlock
                  key={`q-${el.data.number}-${i}`}
                  question={el.data}
                  studyId={studyId}
                  studyTitle={study.title}
                  studyIntro={study.introduction}
                  index={idx}
                  onScriptureTap={handleScriptureTap}
                />
              );
            }
            return (
              <SectionBlock key={`s-${i}`} section={el.data} studyId={studyId} sectionIndex={i} index={idx} />
            );
          })}

          <hr className="divider-gold" />

          {/* ── COMPLETION FOOTER ────────────────────────── */}
          <div className="card card-surface">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {answered} of {total} answered
                </p>
                <p className="text-muted text-[12px]">
                  {progress.completed
                    ? "Study completed — well done!"
                    : pct === 100
                      ? "All questions answered!"
                      : `${remaining} remaining`}
                </p>
              </div>
              {progress.completed ? (
                <span className="flex items-center gap-1.5 rounded-full bg-gold-500/10 px-3 py-1.5 text-sm font-semibold text-gold-500">
                  <CheckCircle2 size={16} /> Complete
                </span>
              ) : pct === 100 ? (
                <button onClick={handleComplete} className="btn-primary !py-2 !px-4 text-sm">
                  <CheckCircle2 size={16} /> Mark Complete
                </button>
              ) : null}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3 safe-bottom">
            {prevStudy ? (
              <button
                onClick={() => { playNavBack(); navigate(`/study/${prevStudy.id}`); }}
                className="btn-secondary flex-1 text-sm"
              >
                <ChevronLeft size={16} />
                <span className="truncate">{prevStudy.title}</span>
              </button>
            ) : (
              <div className="flex-1" />
            )}
            {nextStudy ? (
              <button
                onClick={() => { playNavForward(); navigate(`/study/${nextStudy.id}`); }}
                className="btn-primary flex-1 text-sm"
              >
                <span className="truncate">{nextStudy.title}</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={() => navigate("/studies")} className="btn-primary flex-1 text-sm">
                All Studies
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── BIBLE POPUP ──────────────────────────────── */}
      <BiblePopup
        reference={scriptureRef}
        onClose={closeBiblePopup}
        onOpenReader={(ref) => navigate(`/bible?ref=${encodeURIComponent(ref)}`)}
      />

      {/* ── CELEBRATION OVERLAY ──────────────────────── */}
      {showCelebration && (
        <div className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center animate-fade-in">
          <div className="animate-scale-in flex flex-col items-center gap-3 rounded-3xl bg-navy-800/95 px-10 py-8 shadow-gold-glow-lg backdrop-blur-xl">
            <PartyPopper size={40} className="text-gold-400" />
            <p className="font-display text-xl font-bold text-gold-400">Study Complete!</p>
            <p className="text-sm text-white/60">{study.title}</p>
          </div>
        </div>
      )}
    </>
  );
}
