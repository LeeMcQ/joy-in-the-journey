import { cn } from "@/lib/utils";

interface ArrowHeaderProps {
  /** Study title — rendered in all-small-caps inside the pennant */
  title: string;
  /** Study number — rendered as "# N" on the right of the pennant */
  number: number;
  /** Use the compact variant (40px instead of 52px) */
  compact?: boolean;
  /** Optional series line above the arrow */
  seriesName?: string;
  /** Extra classes on wrapper */
  className?: string;
}

/**
 * Gold arrow / pennant header that replicates the exact header from the
 * "Joy in the Journey" PDF study guides.
 *
 * Layout:
 * ┌─────────────────────────────────┐
 * │  GOD'S WORD GIVES YOU PEACE  # 1 ▶
 * └─────────────────────────────────┘
 *
 * The triangle point is created via CSS border-trick (see index.css).
 */
export function ArrowHeader({
  title,
  number,
  compact = false,
  seriesName,
  className,
}: ArrowHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Series line (italic script, matching PDF top line) */}
      {seriesName && (
        <p className="font-display text-xs italic tracking-wide text-muted">
          {seriesName}
        </p>
      )}

      {/* The pennant */}
      <div
        className={cn("arrow-header", compact && "arrow-header--sm")}
        role="heading"
        aria-level={1}
        aria-label={`Study ${number}: ${title}`}
      >
        <div className="arrow-header__body">
          <span className="arrow-header__title">{title}</span>
          <span className="arrow-header__number"># {number}</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline-SVG variant for places where pure CSS won't render         */
/*  (e.g. inside cards, OG images)                                    */
/* ------------------------------------------------------------------ */

interface ArrowHeaderSvgProps {
  title: string;
  number: number;
  width?: number;
  height?: number;
}

export function ArrowHeaderSvg({
  title,
  number,
  width = 340,
  height = 52,
}: ArrowHeaderSvgProps) {
  const pointW = 32;
  const bodyW = width - pointW;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Study ${number}: ${title}`}
    >
      <defs>
        <linearGradient id="gold-grad" x1="0" y1="0" x2="1" y2="0.5">
          <stop offset="0%" stopColor="#C8920F" />
          <stop offset="30%" stopColor="#D4A017" />
          <stop offset="65%" stopColor="#E5C44A" />
          <stop offset="100%" stopColor="#F0D97A" />
        </linearGradient>
      </defs>

      {/* Body rectangle */}
      <rect
        x="0"
        y="0"
        width={bodyW}
        height={height}
        rx="4"
        fill="url(#gold-grad)"
      />

      {/* Arrow point triangle */}
      <polygon
        points={`${bodyW},0 ${width},${height / 2} ${bodyW},${height}`}
        fill="#F0D97A"
      />

      {/* Title text */}
      <text
        x="16"
        y={height / 2 + 1}
        dominantBaseline="central"
        fontFamily="'Playfair Display', Georgia, serif"
        fontSize="14"
        fontWeight="700"
        letterSpacing="2"
        fill="#3B2D07"
        style={{ fontVariantCaps: "all-small-caps" } as React.CSSProperties}
      >
        {title.toUpperCase()}
      </text>

      {/* Number */}
      <text
        x={bodyW - 16}
        y={height / 2 + 1}
        dominantBaseline="central"
        textAnchor="end"
        fontFamily="'Playfair Display', Georgia, serif"
        fontSize="18"
        fontWeight="800"
        fill="#3B2D07"
      >
        # {number}
      </text>
    </svg>
  );
}
