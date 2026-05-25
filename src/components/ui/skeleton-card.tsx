import React from "react";

function SkeletonLine({ width, height, radius = 4, style }: {
  width: number | string; height: number; radius?: number; style?: React.CSSProperties;
}) {
  return (
    <span style={{
      display: "inline-block", width, height, borderRadius: radius,
      background: "linear-gradient(90deg, rgba(120,120,128,0.10), rgba(120,120,128,0.25), rgba(120,120,128,0.10))",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s ease-in-out infinite",
      ...style,
    }} />
  );
}

export function TaskCardSkeleton() {
  return (
    <div style={{
      padding: 12, borderRadius: 10,
      background: "var(--hq-card-bg)",
      border: "1px solid var(--hq-card-border)",
      marginBottom: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <SkeletonLine width={7} height={7} radius={4} />
        <SkeletonLine width="40%" height={11} />
        <span style={{ flex: 1 }} />
        <SkeletonLine width={22} height={14} radius={4} />
      </div>
      <SkeletonLine width="86%" height={13} style={{ marginBottom: 4 }} />
      <SkeletonLine width="62%" height={13} style={{ marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 6 }}>
        <SkeletonLine width={30} height={10} radius={2} />
        <SkeletonLine width={20} height={10} radius={2} />
      </div>
    </div>
  );
}

export function BookmarkCardSkeleton() {
  return (
    <div style={{
      padding: "10px 12px", borderRadius: 8,
      background: "var(--hq-card-bg, #1c1c1e)",
      border: "1px solid var(--hq-card-border)",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <SkeletonLine width={14} height={14} radius={3} />
      <div style={{ flex: 1 }}>
        <SkeletonLine width="65%" height={13} style={{ marginBottom: 4 }} />
        <SkeletonLine width="40%" height={10} />
      </div>
    </div>
  );
}

export function NoteCardSkeleton() {
  return (
    <div style={{
      padding: 16, borderRadius: 14,
      background: "var(--hq-card-bg)",
      border: "1px solid var(--hq-card-border)",
      minHeight: 140,
    }}>
      <SkeletonLine width="70%" height={15} style={{ marginBottom: 10 }} />
      <SkeletonLine width="100%" height={12} style={{ marginBottom: 4 }} />
      <SkeletonLine width="80%" height={12} style={{ marginBottom: 4 }} />
      <SkeletonLine width="50%" height={12} />
    </div>
  );
}

export function PurchaseRowSkeleton() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 16px",
      borderBottom: "1px solid var(--hq-divider)",
    }}>
      <SkeletonLine width={20} height={20} radius={10} />
      <SkeletonLine width={32} height={32} radius={8} />
      <div style={{ flex: 1 }}>
        <SkeletonLine width="55%" height={14} style={{ marginBottom: 4 }} />
        <SkeletonLine width="35%" height={10} />
      </div>
      <SkeletonLine width={60} height={14} radius={4} />
    </div>
  );
}
