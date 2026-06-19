/**
 * PLMCC brand components — inline SVG, usa currentColor.
 * Controle a cor via prop `color` ou via CSS `color:`.
 *
 * Uso:
 *   <PlmccMark size={28} color="var(--hq-accent)" />
 *   <PlmccWordmark size={22} />
 */

// ─── PlmccMark ─────────────────────────────────────────────────────────────────
// Só o selo (círculo + dois C), sem texto.

type MarkProps = React.SVGProps<SVGSVGElement> & {
  size?: number;
  color?: string;
};

export function PlmccMark({ size = 32, color, style, ...props }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      aria-label="PLMCC"
      style={{ color, flexShrink: 0, display: "inline-block", ...style }}
      {...props}
    >
      <path d="M 50 6 Q 92 11 95 50 Q 92 89 50 94 Q 8 89 5 50 Q 8 11 50 6 Z" strokeWidth={4} />
      <path d="M 45 36 Q 28 36 28 50 Q 28 64 45 64" strokeWidth={7} />
      <path d="M 72 36 Q 55 36 55 50 Q 55 64 72 64" strokeWidth={7} />
    </svg>
  );
}

// ─── PlmccWordmark ─────────────────────────────────────────────────────────────
// "Plm" em Caveat 600 + selo SVG alinhado à baseline.

type WordmarkProps = {
  /** font-size do "Plm" em px. O selo escala junto. */
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
};

export function PlmccWordmark({
  size = 22,
  color = "var(--hq-accent)",
  className,
  style,
}: WordmarkProps) {
  const markSize = size * 0.44;
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        color,
        lineHeight: 1,
        ...style,
      }}
      aria-label="PLMCC"
    >
      <span
        style={{
          fontFamily: "'Caveat', cursive",
          fontWeight: 600,
          fontSize: size,
          letterSpacing: "-0.5px",
          lineHeight: 1,
        }}
      >
        Plm
      </span>
      <PlmccMark
        size={markSize}
        style={{
          marginLeft: size * 0.06,
          marginBottom: size * 0.16,
          alignSelf: "flex-end",
        }}
      />
    </span>
  );
}
