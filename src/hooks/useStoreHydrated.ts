import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";

/**
 * True once the persisted app store has been rehydrated. Persistence uses
 * IndexedDB, which is async, so on first render the store still holds its
 * defaults (no bookmark, dark theme, study plan not configured).
 */
export function useStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useAppStore.persist?.hasHydrated?.() ?? true);
  useEffect(() => {
    if (hydrated) return;
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAppStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, [hydrated]);
  return hydrated;
}
