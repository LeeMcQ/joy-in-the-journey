/* REC 8 — WhatsApp-style share preview modal */
import { MessageCircle, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/Toast";

interface Props { open: boolean; onClose: () => void; title: string; previewText: string; onShare: () => void; }

export function ShareModal({ open, onClose, title, previewText, onShare }: Props) {
  if (!open) return null;

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(previewText); showToast("Copied to clipboard — paste into WhatsApp", { type: "success" }); }
    catch { showToast("Could not copy — please copy manually"); }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={cn("absolute bottom-0 left-0 right-0 rounded-t-3xl bg-navy-700 px-5 pt-5 pb-8 max-h-[75dvh] overflow-y-auto animate-slide-up")}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
        <p className="text-sm font-bold text-secondary">{title}</p>
        <div className="my-4">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">WhatsApp preview</p>
          <div className="rounded-2xl bg-[#1a2a1a] p-4">
            <p className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-[#e0e0e0]">{previewText}</p>
          </div>
        </div>
        <button onClick={() => { onShare(); onClose(); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3.5 text-[15px] font-bold text-white active:opacity-80">
          <MessageCircle size={18} /> Share via WhatsApp
        </button>
        <button onClick={handleCopy} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-surface py-3 text-[14px] font-semibold text-secondary active:opacity-80">
          <Copy size={15} /> Copy text
        </button>
        <button onClick={onClose} className="mt-3 w-full py-2 text-center text-sm text-muted active:opacity-70">Cancel</button>
      </div>
    </div>
  );
}
