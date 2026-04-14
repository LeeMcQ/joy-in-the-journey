import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Check,
  Pencil,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useReadingStyle } from "@/hooks/useReadingStyle";
import { cn } from "@/lib/utils";
import { ScriptureLink } from "@/components/study/ScriptureLink";
import { HighlightableText } from "@/components/study/HighlightableText";
import { feedbackSave } from "@/lib/audio";
import { AskAIButton } from "@/components/study/AskAIButton";
import type { Question } from "@/data/types";

interface Props {
  question: Question;
  studyId: number;
  studyTitle: string;
  studyIntro: string;
  index?: number;
  onScriptureTap?: (ref: string) => void;
}

export function QuestionBlock({
  question,
  studyId,
  studyTitle,
  studyIntro,
  index = 0,
  onScriptureTap,
}: Props) {
  const saved =
    useAppStore(
      (s) => s.getProgress(studyId).answeredQuestions[question.number],
    ) ?? "";
  const answerQuestion = useAppStore((s) => s.answerQuestion);

  const [answer, setAnswer] = useState(saved);
  const [noteOpen, setNoteOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { setAnswer(saved); }, [saved]);

  const debouncedSave = useCallback(
    (value: string) => {
      clearTimeout(timerRef.current);
      clearTimeout(idleTimerRef.current);
      if (!value.trim() || value.trim() === saved) return;
      setSaveState("saving");
      timerRef.current = setTimeout(() => {
        answerQuestion(studyId, question.number, value.trim());
        setSaveState("saved");
        feedbackSave();
        idleTimerRef.current = setTimeout(() => setSaveState("idle"), 1500);
      }, 800);
    },
    [answerQuestion, studyId, question.number, saved],
  );

  // Cleanup all timers on unmount
  useEffect(() => () => { clearTimeout(timerRef.current); clearTimeout(idleTimerRef.current); }, []);

  const handleChange = (val: string) => {
    setAnswer(val);
    debouncedSave(val);
  };

  const handleBlur = () => {
    clearTimeout(timerRef.current);
    clearTimeout(idleTimerRef.current);
    const trimmed = answer.trim();
    if (trimmed && trimmed !== saved) {
      answerQuestion(studyId, question.number, trimmed);
      setSaveState("saved");
      idleTimerRef.current = setTimeout(() => setSaveState("idle"), 1500);
    }
  };

  const readingStyle = useReadingStyle();

  const hasAnswer = !!saved;

  return (
    <div
      className="animate-slide-up"
      style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}
    >
      <div className={cn("card card-surface", hasAnswer && "ring-1 ring-gold-500/10")}>
        <div className="flex gap-3">
          {/* Badge */}
          <div className="flex flex-col items-center gap-1.5 pt-0.5">
            <span className={cn("q-badge", hasAnswer && "!bg-gold-500/20")}>
              {question.number}
            </span>
            {hasAnswer && <Check size={11} className="text-gold-500/60" />}
          </div>

          <div className="min-w-0 flex-1">
            {/* Question text — highlightable */}
            <HighlightableText
              text={question.text}
              studyId={studyId}
              context={{ type: "question", questionNumber: question.number }}
              className="font-medium" style={readingStyle}
            />

            {/* Scripture ref */}
            <div className="mt-1.5">
              <ScriptureLink
                reference={question.scripture.raw}
                onTap={onScriptureTap ?? (() => {})}
              />
            </div>

            {/* Sub-parts */}
            {question.subParts && question.subParts.length > 0 && (
              <ul className="mt-3 space-y-2 pl-0.5" style={readingStyle}>
                {question.subParts.map((part, i) => (
                  <li key={i} className="flex gap-2 text-secondary">
                    <span className="shrink-0 font-bold text-gold-500/40">
                      {String.fromCharCode(97 + i)}.
                    </span>
                    <span className="leading-relaxed">{part}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Collapsible note — also highlightable */}
            {question.note && (
              <div className="mt-3">
                <button
                  onClick={() => setNoteOpen(!noteOpen)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-2 -ml-3",
                    "text-[12px] font-semibold transition-all active:scale-[0.97]",
                    noteOpen ? "bg-gold-500/10 text-gold-500" : "text-gold-500/60 hover:bg-gold-500/5",
                  )}
                >
                  <MessageSquare size={12} />
                  {noteOpen ? "Hide note" : "Study note"}
                  {noteOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {noteOpen && (
                  <div className="note-block mt-2 animate-slide-up text-[13px] text-secondary">
                    <HighlightableText
                      text={question.note.text}
                      studyId={studyId}
                      context={{ type: "note", questionNumber: question.number }}
                    />
                    {question.note.sourceQuote && (
                      <blockquote className="mt-3 font-scripture italic">
                        "{question.note.sourceQuote.text}"
                        <cite>— {question.note.sourceQuote.attribution}</cite>
                      </blockquote>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Answer textarea */}
            <div className="relative mt-3">
              <textarea
                value={answer}
                onChange={(e) => handleChange(e.target.value)}
                onBlur={handleBlur}
                placeholder="Write down your thoughts…"
                rows={2}
                className={cn("textarea !pr-10", answer && "border-gold-500/15")}
              />
              <div className="absolute right-3 top-3">
                {saveState === "saving" && (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gold-500/30 border-t-gold-500" />
                )}
                {saveState === "saved" && (
                  <Check size={14} className="animate-scale-in text-gold-500" />
                )}
                {saveState === "idle" && answer && (
                  <Pencil size={12} className="text-muted opacity-30" />
                )}
              </div>
            </div>

            {/* Ask AI */}
            <AskAIButton
              studyTitle={studyTitle}
              studyIntro={studyIntro}
              questionText={question.text}
              scriptureRef={question.scripture.raw}
              studyNote={question.note?.text}
              userAnswer={answer}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
