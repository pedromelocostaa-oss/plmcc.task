import { useState, useRef, ReactNode } from "react";
import { Check, Trash2 } from "lucide-react";

interface Props {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  children: ReactNode;
  disabled?: boolean;
}

const THRESHOLD = 80;
const REVEAL = 60;
const MAX_DRAG = 120;

export function SwipeableCard({ onSwipeRight, onSwipeLeft, children, disabled }: Props) {
  const [dx, setDx] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const startX = useRef(0);
  const isDragging = useRef(false);

  function onPointerDown(e: React.PointerEvent) {
    if (disabled) return;
    if (e.pointerType === "mouse") return;
    isDragging.current = true;
    startX.current = e.clientX;
    setTransitioning(false);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging.current) return;
    const delta = e.clientX - startX.current;
    if (delta > 0 && !onSwipeRight) return;
    if (delta < 0 && !onSwipeLeft) return;
    setDx(Math.max(-MAX_DRAG, Math.min(MAX_DRAG, delta)));
  }

  function onPointerUp() {
    if (!isDragging.current) return;
    isDragging.current = false;
    setTransitioning(true);
    if (dx > THRESHOLD && onSwipeRight) {
      setDx(MAX_DRAG);
      setTimeout(() => { onSwipeRight(); setDx(0); }, 180);
    } else if (dx < -THRESHOLD && onSwipeLeft) {
      setDx(-MAX_DRAG);
      setTimeout(() => { onSwipeLeft(); setDx(0); }, 180);
    } else {
      setDx(0);
    }
  }

  const showingRight = dx > REVEAL;
  const showingLeft = dx < -REVEAL;

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 10 }}>
      {dx > 0 && (
        <div style={{
          position: "absolute", inset: 0,
          background: showingRight ? "var(--hq-success)" : "rgba(48,209,88,0.4)",
          display: "flex", alignItems: "center", paddingLeft: 18,
          color: "#fff", fontWeight: 600, fontSize: 13, gap: 8, transition: "background 120ms",
        }}>
          <Check size={16} strokeWidth={2.5} /> Concluir
        </div>
      )}
      {dx < 0 && (
        <div style={{
          position: "absolute", inset: 0,
          background: showingLeft ? "var(--hq-danger)" : "rgba(255,69,58,0.4)",
          display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 18,
          color: "#fff", fontWeight: 600, fontSize: 13, gap: 8, transition: "background 120ms",
        }}>
          Deletar <Trash2 size={15} strokeWidth={2.5} />
        </div>
      )}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          transform: `translateX(${dx}px)`,
          transition: transitioning ? "transform 240ms cubic-bezier(0.2,0.85,0.25,1)" : "none",
          touchAction: "pan-y",
        }}
      >
        {children}
      </div>
    </div>
  );
}
