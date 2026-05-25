/**
 * Brand logo components — inline SVG so Caveat font is inherited from the document.
 *
 * LogoWordmark  — full "Plm cc" mark (expanded sidebar, login screens, etc.)
 * LogoMark      — just the "cc" circle (collapsed sidebar, small spaces)
 */

const AMBER = "#E58430";

/**
 * Full wordmark: "Plm" (Caveat script) + "cc" circle symbol.
 * Geometric (outline) variant — matches the first logo in the brand kit.
 *
 * @param height  Rendered height in px (width scales automatically from 540:200 ratio)
 */
export function LogoWordmark({ height = 30 }: { height?: number }) {
  const w = (540 / 200) * height; // maintain 540:200 aspect ratio
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 540 200"
      width={w}
      height={height}
      style={{ display: "block", flexShrink: 0 }}
      aria-label="Plm cc — Pedro's HQ"
    >
      {/* "Plm" in Caveat */}
      <text
        x="10"
        y="155"
        fill={AMBER}
        fontFamily="'Caveat', cursive"
        fontWeight={600}
        fontSize={140}
        letterSpacing="-2"
      >
        Plm
      </text>

      {/* "cc" circle — geometric/outline style */}
      <g
        transform="translate(370 65)"
        fill="none"
        stroke={AMBER}
        strokeLinecap="round"
      >
        <circle cx="40" cy="40" r="36" strokeWidth={3.5} />
        <path d="M 36 28 Q 22 28 22 40 Q 22 52 36 52" strokeWidth={6} />
        <path d="M 58 28 Q 44 28 44 40 Q 44 52 58 52" strokeWidth={6} />
      </g>
    </svg>
  );
}

/**
 * Compact mark: just the "cc" outline circle (no text).
 * Used in the collapsed sidebar and other tight spaces.
 *
 * @param size  Width & height in px
 */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ display: "block", flexShrink: 0 }}
      aria-label="cc — Pedro's HQ"
    >
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke={AMBER}
        strokeWidth={4.5}
        strokeLinecap="round"
      />
      <path
        d="M 45 36 Q 28 36 28 50 Q 28 64 45 64"
        fill="none"
        stroke={AMBER}
        strokeWidth={7.5}
        strokeLinecap="round"
      />
      <path
        d="M 72 36 Q 55 36 55 50 Q 55 64 72 64"
        fill="none"
        stroke={AMBER}
        strokeWidth={7.5}
        strokeLinecap="round"
      />
    </svg>
  );
}
