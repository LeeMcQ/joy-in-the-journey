import { cn } from "@/lib/utils";

interface Props {
  /** 0–100 */
  percent: number;
}

export function ReadingProgressBar({ percent }: Props) {
  return (
    <div className="h-[3px] w-full bg-surface" role="progressbar" aria-valuenow={percent}>
      <div
        className={cn(
          "h-full rounded-r-full transition-all duration-700 ease-spring",
          percent === 100
            ? "bg-gradient-to-r from-gold-500 to-gold-300 shadow-gold-glow"
            : "bg-gold-500",
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
