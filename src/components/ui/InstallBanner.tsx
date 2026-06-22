/* REC 7 — Smart install prompt banner */
import { useEffect, useState } from "react";
import { X, Smartphone } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "joy-install-dismissed-at";
const INSTALLED_KEY = "joy-installed";
const SESSIONS_KEY  = "joy-sessions";

function shouldShow(): boolean {
  if (localStorage.getItem(INSTALLED_KEY) === "true") return false;
  const sessions = parseInt(localStorage.getItem(SESSIONS_KEY) ?? "0", 10);
  if (sessions < 2) return false;
  const dismissed = localStorage.getItem(DISMISSED_KEY);
  if (!dismissed) return true;
  return Date.now() - parseInt(dismissed, 10) > 7 * 86400000;
}

export function InstallBanner() {
  const { canInstall, install } = useInstallPrompt();
  const [visible, setVisible] = useState(false);

  useEffect(() => { setVisible(canInstall && shouldShow()); }, [canInstall]);

  const handleInstall = async () => {
    const accepted = await install();
    if (accepted) { localStorage.setItem(INSTALLED_KEY, "true"); setVisible(false); }
  };

  const handleDismiss = () => { localStorage.setItem(DISMISSED_KEY, String(Date.now())); setVisible(false); };

  if (!visible) return null;

  return (
    <div className={cn("fixed bottom-[76px] left-4 right-4 z-40 animate-slide-up rounded-2xl border border-gold-500/20 bg-navy-700 p-4 shadow-xl")}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-500/15">
          <Smartphone size={18} className="text-gold-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install for offline access</p>
          <p className="mt-0.5 text-[12px] text-muted">Instant Bible access, daily reminders, and faster loading — even without internet.</p>
          <div className="mt-3 flex gap-2">
            <button onClick={handleInstall} className="rounded-xl bg-gold-500 px-4 py-2 text-[13px] font-bold text-navy-900 active:opacity-80">Install App</button>
            <button onClick={handleDismiss} className="px-3 py-2 text-[13px] text-muted active:opacity-70">Not now</button>
          </div>
        </div>
        <button onClick={handleDismiss} className="shrink-0 p-1 text-muted active:opacity-70"><X size={16} /></button>
      </div>
    </div>
  );
}
