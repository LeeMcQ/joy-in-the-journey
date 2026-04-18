import { type ReactNode, useRef, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  BookOpen,
  BookMarked,
  StickyNote,
  Sparkles,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ui/ThemeProvider";
import { feedbackTabSwitch } from "@/lib/audio";
import { GlobalAIChat } from "@/components/ui/GlobalAIChat";

/* ------------------------------------------------------------------ */
/*  Tab configuration — AI is the 5th tab (between Notes and More)    */
/* ------------------------------------------------------------------ */

const tabs = [
  { path: "/", icon: Home, label: "Home", isAI: false },
  { path: "/studies", icon: BookOpen, label: "Studies", isAI: false },
  { path: "/bible", icon: BookMarked, label: "Bible", isAI: false },
  { path: "/notes", icon: StickyNote, label: "Notes", isAI: false },
  { path: "__ai__", icon: Sparkles, label: "Ask AI", isAI: true },
  { path: "/more", icon: MoreHorizontal, label: "More", isAI: false },
] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const mainRef = useRef<HTMLDivElement>(null);
  const [showAIChat, setShowAIChat] = useState(false);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [pathname]);

  const isStudyDetail = pathname.startsWith("/study/");

  return (
    <div className="mx-auto flex h-[100dvh] max-w-lg flex-col overflow-hidden">
      <main
        ref={mainRef}
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide",
          "scroll-smooth overscroll-y-contain",
          !isStudyDetail && "pb-[calc(4rem+env(safe-area-inset-bottom))]",
        )}
      >
        <div className="animate-fade-in">{children}</div>
      </main>

      {/* Global AI Chat — accessible from any screen */}
      <GlobalAIChat open={showAIChat} onClose={() => setShowAIChat(false)} />

      {/* Bottom tab bar */}
      {!isStudyDetail && (
        <nav
          className={cn(
            "relative z-50 shrink-0",
            "border-t safe-bottom",
            "backdrop-blur-2xl backdrop-saturate-150",
            isDark
              ? "border-white/[0.06] bg-navy-900/85"
              : "border-theme bg-base/85",
			  
          )}
		  style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
        >
		
          <ActiveIndicator pathname={pathname} showAI={showAIChat} />

          <div className="flex items-stretch justify-around">
            {tabs.map(({ path, icon: Icon, label, isAI }) => {
              const active = isAI
                ? showAIChat
                : path === "/"
                  ? pathname === "/"
                  : pathname.startsWith(path);

              return (
                <button
                  key={path}
                  onClick={() => {
                    if (isAI) {
                      feedbackTabSwitch();
                      setShowAIChat(!showAIChat);
                    } else if (!active) {
                      feedbackTabSwitch();
                      setShowAIChat(false);
                      navigate(path);
                    }
                  }}
                  className={cn(
                    "group relative flex flex-1 flex-col items-center gap-[3px] pb-1 pt-2",
                    "transition-colors duration-200",
                    "active:scale-[0.92] active:transition-transform active:duration-100",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {isAI ? (
                    /* AI icon — dark filled circle */
                    <div className={cn(
                      "flex h-[28px] w-[28px] items-center justify-center rounded-full transition-all duration-200",
                      active
                        ? "bg-gold-500 shadow-gold-glow"
                        : isDark
                          ? "bg-white/10"
                          : "bg-navy-900/80",
                    )}>
                      <Icon
                        size={24}
                        strokeWidth={2}
                        className={active ? "text-navy-900" : "text-white"}
                      />
                    </div>
                  ) : (
                    <Icon
                      size={24}
                      strokeWidth={active ? 2.3 : 1.6}
                      className={cn(
                        "transition-all duration-200",
                        active
                          ? "text-gold-500 drop-shadow-[0_0_6px_rgba(212,160,23,0.35)]"
                          : isDark
                            ? "text-white/30 group-hover:text-white/50"
                            : "text-muted",
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "text-[10px] font-semibold leading-none tracking-wide",
                      "transition-colors duration-200",
                      active
                        ? "text-gold-500"
                        : isDark
                          ? "text-white/30"
                          : "text-muted",
                    )}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
		
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Active tab indicator                                              */
/* ------------------------------------------------------------------ */

function ActiveIndicator({ pathname, showAI }: { pathname: string; showAI: boolean }) {
  let activeIndex: number;

  if (showAI) {
    activeIndex = tabs.findIndex((t) => t.isAI);
  } else {
    activeIndex = tabs.findIndex(({ path, isAI }) =>
      !isAI && (path === "/" ? pathname === "/" : pathname.startsWith(path)),
    );
  }

  if (activeIndex < 0) return null;

  const leftPercent = (activeIndex / tabs.length) * 100 + 100 / tabs.length / 2;

  return (
    <div
      className="absolute top-0 h-[2px] w-8 -translate-x-1/2 rounded-full bg-gold-500 transition-all duration-300 ease-spring"
      style={{ left: `${leftPercent}%` }}
    />
  );
}
