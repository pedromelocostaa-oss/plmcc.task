import { useState, useRef, ReactNode } from "react";

interface Props {
  onRefresh: () => void | Promise<void>;
  children: ReactNode;
  threshold?: number;
  disabled?: boolean;
}

const PULL_THRESHOLD = 64;
const MAX_PULL = 96;

export function PullToRefresh({ onRefresh, children, threshold = PULL_THRESHOLD, disabled }: Props) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function onTouchStart(e: React.TouchEvent) {
    if (disabled || refreshing) return;
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    if (scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    isPulling.current = true;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!isPulling.current || disabled || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) { setPullY(0); return; }
    // Rubber-band effect
    const clamped = Math.min(MAX_PULL, dy * 0.5);
    setPullY(clamped);
  }

  async function onTouchEnd() {
    if (!isPulling.current) return;
    isPulling.current = false;
    if (pullY >= threshold) {
      setRefreshing(true);
      setPullY(40);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullY(0);
      }
    } else {
      setPullY(0);
    }
  }

  const progress = Math.min(1, pullY / threshold);
  const showIndicator = pullY > 4 || refreshing;

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, overflowY: "auto", position: "relative", WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"] }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull indicator */}
      {showIndicator && (
        <div style={{
          position: "sticky", top: 0, left: 0, right: 0,
          height: pullY,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
          zIndex: 10,
          overflow: "hidden",
          transition: refreshing ? "height 200ms ease" : "none",
        }}>
          <div style={{
            width: 32, height: 32,
            borderRadius: "50%",
            background: "var(--hq-modal-bg)",
            backdropFilter: "blur(12px)",
            border: "1px solid var(--hq-card-border)",
            display: "grid", placeItems: "center",
            transform: `scale(${0.5 + progress * 0.5}) rotate(${progress * 180}deg)`,
            transition: refreshing ? "transform 200ms ease" : "none",
            boxShadow: "var(--hq-shadow)",
          }}>
            {refreshing ? (
              <div style={{
                width: 14, height: 14, borderRadius: "50%",
                border: "2px solid var(--hq-border)",
                borderTopColor: "var(--hq-accent)",
                animation: "spin 700ms linear infinite",
              }} />
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M7 12l-3-3M7 12l3-3" stroke="var(--hq-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      <div style={{ transform: `translateY(${pullY}px)`, transition: !isPulling.current && !refreshing ? "transform 220ms ease" : "none" }}>
        {children}
      </div>
    </div>
  );
}
