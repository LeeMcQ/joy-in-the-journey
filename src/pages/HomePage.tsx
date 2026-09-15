import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Sparkles, TrendingUp, Clock, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useTheme } from "@/components/ui/ThemeProvider";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { StudyPlanSetup } from "@/components/ui/StudyPlanSetup";
import { StudyGroupPanel } from "@/components/ui/StudyGroupPanel";
import { cn, countQuestions, studyLabel } from "@/lib/utils";

const VERSES = [
  {
    ref: "Johannes 3:16",
    eng: "John 3:16",
    text: "Want so lief het God die wêreld gehad, dat Hy sy eniggebore Seun gegee het, sodat elkeen wat in Hom glo, nie verlore mag gaan nie, maar die ewige lewe kan hê.",
    textEng: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
  },
  {
    ref: "Spreuke 3:5-6",
    eng: "Proverbs 3:5-6",
    text: "Vertrou op die HERE met jou hele hart en steun nie op jou eie insig nie. Ken Hom in al jou weë, dan sal Hy jou paaie gelykmaak.",
    textEng: "Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.",
  },
  {
    ref: "Filippense 4:13",
    eng: "Philippians 4:13",
    text: "Ek is tot alles in staat deur Christus wat my krag gee.",
    textEng: "I can do all things through Christ which strengtheneth me.",
  },
  {
    ref: "Jesaja 41:10",
    eng: "Isaiah 41:10",
    text: "Wees nie bevrees nie, want Ek is met jou; kyk nie angstig rond nie, want Ek is jou God. Ek versterk jou, Ek help jou ook.",
    textEng: "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee.",
  },
  {
    ref: "Romeine 8:28",
    eng: "Romans 8:28",
    text: "En ons weet dat vir hulle wat God liefhet, alles ten goede meewerk, vir hulle wat na sy voorneme geroep is.",
    textEng: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.",
  },
  {
    ref: "Psalm 23:1",
    eng: "Psalm 23:1",
    text: "Die HERE is my herder; niks sal my ontbreek nie.",
    textEng: "The LORD is my shepherd; I shall not want.",
  },
  {
    ref: "Matthéüs 6:33",
    eng: "Matthew 6:33",
    text: "Maar soek eers die koninkryk van God en sy geregtigheid, en al hierdie dinge sal ook vir julle bygevoeg word.",
    textEng: "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.",
  },
];

function getDailyVerse() { return VERSES[Math.floor(Date.now() / 86400000) % VERSES.length]; }

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning"; if (h < 17) return "Good afternoon"; return "Good evening";
}

export function HomePage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const studies            = useAppStore((s) => s.studies);
  const progress           = useAppStore((s) => s.progress);
  const overall            = useAppStore((s) => s.overallPercent());
  const getCompletionPercent = useAppStore((s) => s.getCompletionPercent);
  const studyPlan          = useAppStore((s) => s.studyPlan);
  const todayStudy         = useAppStore((s) => s.getTodayStudy());
  const dayNumber          = useAppStore((s) => s.getDayNumber());

  const [showSetup, setShowSetup] = useState(!studyPlan.configured);
  const [showStats, setShowStats] = useState(false);
  const [verseLang, setVerseLang]  = useState<"afr" | "eng">("afr");

  const verse = getDailyVerse();
  const inProgress = Object.values(progress).filter((p) => p.started && !p.completed).sort((a, b) => (b.lastAccessedAt ?? "").localeCompare(a.lastAccessedAt ?? ""));
  const continueStudy = inProgress.length ? studies.find((s) => s.id === inProgress[0].studyId) : todayStudy;
  const completedCount  = studies.filter((s) => progress[s.id]?.completed).length;
  const startedCount    = Object.values(progress).filter((p) => p.started).length;
  const continueProgress = continueStudy ? getCompletionPercent(continueStudy.id) : 0;

  return (
    <>
      {showSetup && <StudyPlanSetup onComplete={() => setShowSetup(false)} />}
      <div className="mx-auto w-full max-w-3xl flex flex-col gap-5 px-5 pb-4 md:px-8">
        {/* Greeting */}
        <div className="pt-12">
          <p className="text-secondary text-sm font-medium">{greeting()}</p>
          <h1 className="mt-0.5 font-display text-[24px] font-bold leading-tight tracking-tight">
            SDA Bible Study <span className="text-gold-gradient">Companion</span>
          </h1>
        </div>

        {/* Daily verse hero — theme-friendly surface (works in dark / light / sepia) */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl p-5 ring-1 ring-gold-500/20",
          isDark
            ? "bg-gradient-to-br from-navy-700 to-navy-800"
            : "bg-gradient-to-br from-[rgb(var(--color-surface))] to-[rgb(var(--color-bg))] shadow-sm",
        )}>
          <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-gold-500/[0.08] blur-2xl" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gold-500/60">
              ✦ {verseLang === "afr" ? "Vers van die dag" : "Verse of the day"}
            </span>
            <div className={cn("flex rounded-lg p-0.5", isDark ? "bg-white/8" : "bg-black/5")}>
              {(["afr", "eng"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setVerseLang(l)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase transition-all",
                    verseLang === l
                      ? "bg-gold-500 text-navy-900"
                      : isDark ? "text-white/40" : "text-muted",
                  )}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[15px] leading-relaxed text-secondary font-scripture italic">
            "{verseLang === "afr" ? verse.text : verse.textEng}"
          </p>
          <p className="mt-2 text-[12px] font-semibold text-gold-500">
            — {verseLang === "afr" ? verse.ref : verse.eng}
          </p>
        </div>

        {/* Primary CTA */}
        {studyPlan.configured && todayStudy && (
          <button onClick={() => navigate(`/study/${todayStudy.id}`)} className="card card-gold card-interactive text-left w-full">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold-500/15"><Calendar size={22} className="text-gold-500" /></div>
              <div className="min-w-0 flex-1">
                <span className="badge-gold"><Clock size={10} /> Day {dayNumber}</span>
                <h2 className="mt-1.5 font-display text-[17px] font-bold leading-snug">{todayStudy.title}</h2>
                <p className="text-muted mt-0.5 text-[12px]">{studyLabel(todayStudy.number)} · {countQuestions(todayStudy)} questions</p>
              </div>
              <ArrowRight size={18} className="shrink-0 text-gold-500/60" />
            </div>
          </button>
        )}

        {/* Continue studying */}
        {continueStudy && (!studyPlan.configured || continueStudy.id !== todayStudy?.id) && (
          <button onClick={() => navigate(`/study/${continueStudy.id}`)} className="card card-surface card-interactive text-left">
            <div className="flex items-center gap-4">
              <ProgressRing percent={continueProgress} size={48} strokeWidth={4}><span className="text-[11px] font-bold text-gold-500">{continueProgress}%</span></ProgressRing>
              <div className="min-w-0 flex-1">
                <span className="badge-gold text-2xs"><Clock size={10} /> {inProgress.length ? "Continue" : "Start"}</span>
                <h2 className="mt-1.5 font-display text-[16px] font-bold leading-snug">{continueStudy.title}</h2>
                <p className="text-muted mt-0.5 text-[12px]">{studyLabel(continueStudy.number)}</p>
              </div>
              <ArrowRight size={16} className="shrink-0 text-gold-500/40" />
            </div>
          </button>
        )}

        {/* Study Group Widget (Rec 8) */}
        <StudyGroupPanel variant="widget" />

        {/* Collapsible stats (Rec 1) */}
        <section>
          <button onClick={() => setShowStats(!showStats)} className="flex w-full items-center justify-between py-1">
            <h2 className="text-xs font-bold uppercase tracking-caps text-muted">My Journey · {overall}% complete</h2>
            {showStats ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
          </button>
          {showStats && (
            <div className="mt-3 grid grid-cols-3 gap-3 animate-slide-up">
              <StatCard icon={BookOpen} value={startedCount} label="Started" isDark={isDark} />
              <StatCard icon={Sparkles} value={completedCount} label="Complete" isDark={isDark} />
              <StatCard icon={TrendingUp} value={`${overall}%`} label="Overall" isDark={isDark} />
            </div>
          )}
        </section>

        {/* Quick links */}
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-caps text-muted">Quick Access</h2>
          <div className="flex flex-col gap-2">
            <QuickLink label="Browse All 28 Studies" sub="Complete study series" icon={BookOpen} onClick={() => navigate("/studies")} isDark={isDark} />
            <QuickLink label="My Journal & Highlights" sub="Review your study work" icon={Sparkles} onClick={() => navigate("/notes")} isDark={isDark} />
          </div>
        </section>
      </div>
    </>
  );
}

function StatCard({ icon: Icon, value, label, isDark }: { icon: typeof BookOpen; value: number | string; label: string; isDark: boolean }) {
  return (
    <div className="card card-surface flex flex-col items-center gap-1.5 py-4">
      <Icon size={18} className={cn(isDark ? "text-gold-500/50" : "text-gold-600/60")} />
      <p className="text-lg font-bold text-primary">{value}</p>
      <p className="text-muted text-2xs font-medium uppercase tracking-caps">{label}</p>
    </div>
  );
}

function QuickLink({ label, sub, icon: Icon, onClick, isDark }: { label: string; sub: string; icon: typeof BookOpen; onClick: () => void; isDark: boolean }) {
  return (
    <button onClick={onClick} className="card card-surface card-interactive flex items-center gap-3 text-left">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", isDark ? "bg-gold-500/10" : "bg-gold-100/60")}><Icon size={18} className="text-gold-500" /></div>
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-primary">{label}</p><p className="text-muted text-[12px]">{sub}</p></div>
      <ArrowRight size={16} className="shrink-0 text-muted" />
    </button>
  );
}
