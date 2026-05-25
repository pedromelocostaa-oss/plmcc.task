import { useRef } from "react";

interface Options { threshold?: number; onLongPress: () => void; }

export function useLongPress({ threshold = 450, onLongPress }: Options) {
  const timer = useRef<number | null>(null);
  const moved = useRef(false);

  function start() {
    moved.current = false;
    timer.current = window.setTimeout(() => {
      if (!moved.current) {
        if ("vibrate" in navigator) navigator.vibrate(8);
        onLongPress();
      }
    }, threshold);
  }

  function cancel() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  function markMoved() {
    moved.current = true;
    cancel();
  }

  return {
    onPointerDown: start,
    onPointerMove: markMoved,
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
  };
}
