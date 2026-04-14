import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { splitReferences } from "@/lib/scriptureUtils";

interface Props {
  /** Raw scripture string e.g. "John 16:13; 1 Cor. 2:14" */
  reference: string;
  /** Callback when a single reference is tapped */
  onTap: (reference: string) => void;
  className?: string;
}

/**
 * Splits multi-reference strings on semicolons / book boundaries
 * and renders each as a separate tappable pill.
 *
 * "John 16:13; 1 Cor. 2:14" → [John 16:13] [1 Cor. 2:14]
 */
export function ScriptureLink({ reference, onTap, className }: Props) {
  if (!reference) return null;

  const refs = splitReferences(reference);

  // Single ref — simpler layout
  if (refs.length <= 1) {
    return (
      <RefPill
        text={refs[0] ?? reference}
        onTap={() => onTap(refs[0] ?? reference)}
        className={className}
        showIcon
      />
    );
  }

  // Multiple refs — render as a wrapping flex row of pills
  return (
    <div className={cn("flex flex-wrap items-center gap-x-1 gap-y-1", className)}>
      <BookOpen size={12} className="shrink-0 text-gold-500/50" />
      {refs.map((ref, i) => (
        <RefPill
          key={`${ref}-${i}`}
          text={ref}
          onTap={() => onTap(ref)}
          showIcon={false}
        />
      ))}
    </div>
  );
}

/* ── Individual reference pill ──────────────────────── */

function RefPill({
  text,
  onTap,
  className,
  showIcon = true,
}: {
  text: string;
  onTap: () => void;
  className?: string;
  showIcon?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onTap();
      }}
      className={cn(
        "group inline-flex items-center gap-1",
        "rounded-md px-1.5 py-0.5",
        "font-scripture text-[12.5px] font-semibold italic",
        "text-gold-600 decoration-gold-500/30 underline underline-offset-2",
        "transition-all duration-150",
        "active:scale-[0.97] active:bg-gold-500/10",
        "hover:bg-gold-500/5",
        className,
      )}
    >
      {showIcon && (
        <BookOpen
          size={12}
          className="shrink-0 text-gold-500/50 transition-colors group-hover:text-gold-500"
        />
      )}
      <span>{text}</span>
    </button>
  );
}
