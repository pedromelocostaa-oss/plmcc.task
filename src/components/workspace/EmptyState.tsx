import { colors, spring, radius } from "@/lib/tokens";

interface EmptyStateProps {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  kbd?: string;
  compact?: boolean;
}

export function EmptyState({
  icon,
  iconColor,
  title,
  description,
  actionLabel,
  onAction,
  kbd,
  compact = false,
}: EmptyStateProps) {
  const iconSize = compact ? 44 : 56;
  const iconRadius = compact ? 11 : 14;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      padding: compact ? "32px 20px" : "48px 20px",
      textAlign: "center",
    }}>
      <div style={{
        width: iconSize,
        height: iconSize,
        borderRadius: iconRadius,
        background: `linear-gradient(135deg, ${iconColor}22, ${iconColor}11)`,
        border: `1px solid ${iconColor}28`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: iconColor,
      }}>
        {icon}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
        <h3 style={{
          margin: 0,
          fontSize: compact ? 14 : 16,
          fontWeight: 600,
          letterSpacing: "-0.015em",
          color: colors.text,
        }}>
          {title}
        </h3>
        <p style={{
          margin: 0,
          fontSize: 13,
          color: colors.textSecondary,
          maxWidth: 320,
          lineHeight: 1.5,
        }}>
          {description}
        </p>
      </div>

      {(actionLabel && onAction) && (
        <button
          onClick={onAction}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            background: colors.accentSoft,
            border: `1px solid var(--hq-accent-border)`,
            borderRadius: radius.md,
            color: colors.accent,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            transition: `all 0.15s ${spring.gentle}`,
          }}
        >
          <span>{actionLabel}</span>
          {kbd && <span className="kbd">{kbd}</span>}
        </button>
      )}
    </div>
  );
}
