/* REC 2 — Gold pill badge scripture references */
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { splitReferences } from "@/lib/scriptureUtils";

interface Props { reference: string; onTap: (ref: string) => void; className?: string; }

export function ScriptureLink({ reference, onTap, className }: Props) {
  if (!reference) return null;
  const refs = splitReferences(reference);
  if (refs.length <= 1) return <RefPill text={refs[0] ?? reference} onTap={() => onTap(refs[0] ?? reference)} className={className} showIcon />;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-1 gap-y-1", className)}>
      <BookOpen size={11} className="shrink-0 text-gold-500/40" />
      {refs.map((ref, i) => <RefPill key={`${ref}-${i}`} text={ref} onTap={() => onTap(ref)} showIcon={false} />)}
    </div>
  );
}

function RefPill({ text, onTap, className, showIcon = true }: { text: string; onTap: () => void; className?: string; showIcon?: boolean; }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onTap(); }}
      className={cn("inline-flex items-center gap-1 mx-0.5 rounded-full bg-gold-500/15 px-2 py-0.5 text-[12px] font-semibold text-gold-400 ring-1 ring-gold-500/30 transition-all duration-150 active:bg-gold-500/25 active:scale-[0.97]", className)}
    >
      {showIcon && <BookOpen size={10} className="shrink-0 text-gold-400/70" />}
      <span>{text}</span>
      <span className="text-gold-400/50 text-[9px]">↗</span>
    </button>
  );
}
