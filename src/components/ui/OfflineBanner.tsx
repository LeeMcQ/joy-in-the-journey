/* REC 7 — Offline indicator banner */
import { useEffect, useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const online = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(false);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    if (!online) { setWasOffline(true); setShowBackOnline(false); }
    else if (wasOffline) {
      setShowBackOnline(true);
      const t = setTimeout(() => { setShowBackOnline(false); setWasOffline(false); }, 3000);
      return () => clearTimeout(t);
    }
  }, [online, wasOffline]);

  if (online && !showBackOnline) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] py-2 px-4 text-center text-[13px] font-semibold transition-all duration-300",
        showBackOnline ? "bg-emerald-500/90 text-white" : "bg-amber-500/95 text-amber-950",
      )}
      style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 8px)" }}
    >
      {showBackOnline ? "✅ Back online" : "📵 You're offline — Bible and studies still available"}
    </div>
  );
}
