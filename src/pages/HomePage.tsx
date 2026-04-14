import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Sparkles,
  TrendingUp,
  Clock,
  Calendar,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useTheme } from "@/components/ui/ThemeProvider";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { StudyPlanSetup } from "@/components/ui/StudyPlanSetup";
import { cn, countQuestions, studyLabel } from "@/lib/utils";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function HomePage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const studies = useAppStore((s) => s.studies);
  const progress = useAppStore((s) => s.progress);
  const overall = useAppStore((s) => s.overallPercent());
  const getCompletionPercent = useAppStore((s) => s.getCompletionPercent);
  const studyPlan = useAppStore((s) => s.studyPlan);
  const todayStudy = useAppStore((s) => s.getTodayStudy());
  const dayNumber = useAppStore((s) => s.getDayNumber());

  const [showSetup, setShowSetup] = useState(!studyPlan.configured);

  // Continue study — last touched incomplete, or today's study
  const inProgress = Object.values(progress)
    .filter((p) => p.started && !p.completed)
    .sort((a, b) => (b.lastAccessedAt ?? "").localeCompare(a.lastAccessedAt ?? ""));

  const continueStudy = inProgress.length
    ? studies.find((s) => s.id === inProgress[0].studyId)
    : todayStudy;

  const completedCount = studies.filter((s) => progress[s.id]?.completed).length;
  const startedCount = Object.values(progress).filter((p) => p.started).length;

  const continueProgress = continueStudy
    ? getCompletionPercent(continueStudy.id)
    : 0;

  return (
    <>
      {/* ── Onboarding modal ─────────────────────────────── */}
      {showSetup && (
        <StudyPlanSetup onComplete={() => setShowSetup(false)} />
      )}

      <div className="flex flex-col gap-6 px-5 pb-4">
        {/* ── Hero ────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-b-3xl px-1 pb-6 pt-14">
          <div className="pointer-events-none absolute -top-20 right-0 h-56 w-56 rounded-full bg-gold-500/[0.07] blur-3xl" />
          <p className="text-secondary text-sm font-medium">{greeting()}</p>
          <h1 className="mt-1 font-display text-[26px] font-bold leading-tight tracking-tight">
            Joy in the <span className="text-gold-gradient">Journey</span>
          </h1>
          <p className="text-muted mt-2 text-[13px] leading-relaxed">
            28 interactive Bible studies to guide your spiritual walk
          </p>
        </div>

        {/* ── Today's study card ──────────────────────────── */}
        {studyPlan.configured && todayStudy && (
          <button
            onClick={() => navigate(`/study/${todayStudy.id}`)}
            className="card card-gold card-interactive text-left"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold-500/15">
                <Calendar size={22} className="text-gold-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="badge-gold">
                    <Clock size={10} /> Day {dayNumber}
                  </span>
                </div>
                <h2 className="mt-1.5 font-display text-[17px] font-bold leading-snug">
                  {todayStudy.title}
                </h2>
                <p className="text-muted mt-0.5 text-[12px]">
                  {studyLabel(todayStudy.number)} · {countQuestions(todayStudy)} questions
                </p>
              </div>
              <ArrowRight size={18} className="shrink-0 text-gold-500/60" />
            </div>
          </button>
        )}

        {/* ── Continue studying (if different from today's) ── */}
        {continueStudy && (!studyPlan.configured || continueStudy.id !== todayStudy?.id) && (
          <button
            onClick={() => navigate(`/study/${continueStudy.id}`)}
            className="card card-surface card-interactive text-left"
          >
            <div className="flex items-center gap-4">
              <ProgressRing percent={continueProgress} size={48} strokeWidth={4}>
                <span className="text-[11px] font-bold text-gold-500">{continueProgress}%</span>
              </ProgressRing>
              <div className="min-w-0 flex-1">
                <span className="badge-gold text-2xs">
                  <Clock size={10} /> {inProgress.length ? "Continue" : "Start"}
                </span>
                <h2 className="mt-1.5 font-display text-[16px] font-bold leading-snug">
                  {continueStudy.title}
                </h2>
                <p className="text-muted mt-0.5 text-[12px]">
                  {studyLabel(continueStudy.number)}
                </p>
              </div>
              <ArrowRight size={16} className="shrink-0 text-gold-500/40" />
            </div>
          </button>
        )}

        {/* ── Progress ────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-caps text-muted">Your Progress</h2>
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={BookOpen} value={startedCount} label="Started" isDark={isDark} />
            <StatCard icon={Sparkles} value={completedCount} label="Complete" isDark={isDark} />
            <StatCard icon={TrendingUp} value={`${overall}%`} label="Overall" isDark={isDark} />
          </div>
        </section>

        {/* ── Quick links ─────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-caps text-muted">Quick Access</h2>
          <div className="flex flex-col gap-2">
            <QuickLink label="Browse All 28 Studies" sub="Complete study series" icon={BookOpen} onClick={() => navigate("/studies")} isDark={isDark} />
            <QuickLink label="My Notes & Highlights" sub="Review your study work" icon={Sparkles} onClick={() => navigate("/notes")} isDark={isDark} />
          </div>
        </section>

        {/* ── Recently studied ────────────────────────────── */}
        {inProgress.length > 1 && (
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-caps text-muted">Recently Studied</h2>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
              {inProgress.slice(0, 5).map((p) => {
                const study = studies.find((s) => s.id === p.studyId);
                if (!study) return null;
                const pct = getCompletionPercent(study.id);
                return (
                  <button key={study.id} onClick={() => navigate(`/study/${study.id}`)} className="card card-surface card-interactive shrink-0 flex w-[140px] flex-col items-center gap-2 py-5">
                    <ProgressRing percent={pct} size={40} strokeWidth={3}>
                      <span className="text-[9px] font-bold">{pct}%</span>
                    </ProgressRing>
                    <p className="w-full truncate text-center text-[11px] font-semibold">{study.title}</p>
                    <p className="text-muted text-2xs">{studyLabel(study.number)}</p>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function StatCard({ icon: Icon, value, label, isDark }: { icon: typeof BookOpen; value: number | string; label: string; isDark: boolean }) {
  return (
    <div className="card card-surface flex flex-col items-center gap-1.5 py-4">
      <Icon size={18} className={cn(isDark ? "text-gold-500/50" : "text-gold-600/60")} />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-muted text-2xs font-medium uppercase tracking-caps">{label}</p>
    </div>
  );
}

function QuickLink({ label, sub, icon: Icon, onClick, isDark }: { label: string; sub: string; icon: typeof BookOpen; onClick: () => void; isDark: boolean }) {
  return (
    <button onClick={onClick} className="card card-surface card-interactive flex items-center gap-3 text-left">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", isDark ? "bg-gold-500/10" : "bg-gold-100/60")}>
        <Icon size={18} className="text-gold-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-muted text-[12px]">{sub}</p>
      </div>
      <ArrowRight size={16} className="shrink-0 text-muted" />
    </button>
  );
}
