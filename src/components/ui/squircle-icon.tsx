import { shade } from "@/lib/tokens";

interface SquircleIconProps {
  tint: string;
  size?: number;
  children: React.ReactNode;
}

export function SquircleIcon({ tint, size = 22, children }: SquircleIconProps) {
  const r = Math.round(size * 0.295);
  return (
    <span
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: r,
        background: `linear-gradient(135deg, ${tint}, ${shade(tint, -14)})`,
        boxShadow: `inset 0 0.5px 0 rgba(255,255,255,0.35), 0 0.5px 1px rgba(0,0,0,0.15)`,
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      {children}
    </span>
  );
}

interface ProjectSquircleProps {
  name: string;
  color: string;
  size?: number;
}

export function ProjectSquircle({ name, color, size = 22 }: ProjectSquircleProps) {
  const r = Math.round(size * 0.295);
  return (
    <span
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: r,
        background: `linear-gradient(135deg, ${color}, ${shade(color, -12)})`,
        boxShadow: `inset 0 0.5px 0 rgba(255,255,255,0.35), 0 0.5px 1px rgba(0,0,0,0.18)`,
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        fontSize: Math.round(size * 0.46),
        fontWeight: 600,
        letterSpacing: '-0.04em',
        textTransform: 'uppercase' as const,
      }}
    >
      {name[0]}
    </span>
  );
}
