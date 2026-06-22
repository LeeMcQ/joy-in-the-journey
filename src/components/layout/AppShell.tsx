import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, BookOpen, BookMarked, BookHeart, Sparkles, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ui/ThemeProvider";
import { feedbackTabSwitch } from "@/lib/audio";
import { GlobalAIChat } from "@/components/ui/GlobalAIChat";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { InstallBanner } from "@/components/ui/InstallBanner";

const tabs = [
  { path: "/",         icon: Home,          label: "Home",    isAI: false },
  { path: "/studies",  icon: BookOpen,       label: "Studies", isAI: false },
  { path: "/bible",    icon: BookMarked,     label: "Bible",   isAI: false },
  { path: "/notes",    icon: BookHeart,      label: "Journal", isAI: false },
  { path: "__ai__",    icon: Sparkles,       label: "Ask AI",  isAI: true  },
  { path: "/more",     icon: MoreHorizontal, label: "More",    isAI: false },
] as const;

// Increment session counter on each mount
if (typeof window !== "undefined") {
  const sessions = parseInt(localStorage.getItem("joy-sessions") ?? "0", 10);
  localStorage.setItem("joy-sessions", String(sessions + 1));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { isDark } = useTheme();
  const [showAIChat, setShowAIChat] = useState(false);
  const [hideNav, setHideNav]       = useState(false);

  // Hide nav on study reading pages
  useEffect(() => {
    setHideNav(/^\/study\/\d+/.test(location.pathname));
  }, [location.pathname]);

  const activeTab = tabs.find(
    (t) => !t.isAI && (t.path === "/" ? location.pathname === "/" : location.pathname.startsWith(t.path))
  );

  return (
    <div className={cn("flex h-dvh flex-col", isDark ? "bg-[rgb(var(--color-bg))]" : "bg-[rgb(var(--color-bg))]")}>
      <OfflineBanner />
      <InstallBanner />

      {/* Main content */}
      <main className={cn("flex-1 overflow-y-auto scrollbar-hide", !hideNav && "pb-[72px]")}>
        {children}
      </main>

      {/* Bottom nav */}
      {!hideNav && (
        <nav
          aria-label="Main navigation"
          className={cn(
            "fixed bottom-0 left-0 right-0 z-30",
            "border-t border-theme",
            isDark ? "bg-navy-900/95 backdrop-blur-xl" : "bg-white/95 backdrop-blur-xl",
            "safe-bottom",
          )}
        >
          <div className="flex items-stretch">
            {tabs.map((tab) => {
              const Icon    = tab.icon;
              const isActive = tab.isAI ? showAIChat : tab.path === activeTab?.path;
              return (
                <button
                  key={tab.path}
                  aria-label={tab.label}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => {
                    feedbackTabSwitch();
                    if (tab.isAI) { setShowAIChat((v) => !v); return; }
                    if (showAIChat) setShowAIChat(false);
                    navigate(tab.path);
                  }}
                  className={cn(
                    "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 transition-all",
                    isActive ? "text-gold-500" : isDark ? "text-white/35" : "text-navy-400",
                  )}
                >
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.2 : 1.7}
                    className={cn(
                      "transition-all",
                      isActive && tab.isAI && "text-gold-400 drop-shadow-[0_0_6px_rgba(212,160,23,0.5)]",
                    )}
                  />
                  <span className={cn("text-[10px] font-semibold tracking-wide", isActive ? "opacity-100" : "opacity-60")}>
                    {tab.label}
                  </span>
                  {isActive && !tab.isAI && (
                    <span className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-gold-500" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      <GlobalAIChat open={showAIChat} onClose={() => setShowAIChat(false)} />
    </div>
  );
}
