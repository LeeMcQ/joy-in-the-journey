import { useSyncExternalStore } from "react";
import {
  getActiveProvider,
  hasValidStoredKey,
  PROVIDER_CHANGE_EVENT,
  type ActiveProviderId,
} from "@/lib/llmProviders";

function subscribe(cb: () => void): () => void {
  window.addEventListener(PROVIDER_CHANGE_EVENT, cb);
  // Keep other tabs / installed-PWA windows in sync too.
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(PROVIDER_CHANGE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Snapshot string so useSyncExternalStore can compare cheaply. */
function snapshot(): string {
  const active = getActiveProvider();
  const ready = active === "server" ? true : hasValidStoredKey(active);
  return `${active}|${ready ? 1 : 0}`;
}

/**
 * Live view of the chosen AI provider. Re-renders when the learner changes
 * provider or saves / removes a key (in this tab or another).
 */
export function useAIProvider(): { active: ActiveProviderId; hasKey: boolean } {
  const snap = useSyncExternalStore(subscribe, snapshot, snapshot);
  const [active, ready] = snap.split("|");
  return { active: active as ActiveProviderId, hasKey: ready === "1" };
}
