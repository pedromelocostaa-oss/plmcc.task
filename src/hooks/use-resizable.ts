import { useState, useEffect, useRef, useCallback } from "react";

interface Options {
  min: number;
  max: number;
  defaultValue: number;
  storageKey: string;
}

export function useResizable({ min, max, defaultValue, storageKey }: Options) {
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === "undefined") return defaultValue;
    const stored = parseInt(localStorage.getItem(storageKey) || "");
    return isFinite(stored) ? Math.max(min, Math.min(max, stored)) : defaultValue;
  });

  const dragRef = useRef({ active: false, startX: 0, startW: 0 });
  const latestRef = useRef(width);
  useEffect(() => { latestRef.current = width; }, [width]);

  const persist = useCallback((v: number) => {
    setWidth(v);
    try { localStorage.setItem(storageKey, String(v)); } catch {}
  }, [storageKey]);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { active: true, startX: e.clientX, startW: width };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const move = (ev: MouseEvent) => {
      if (!dragRef.current.active) return;
      const dx = dragRef.current.startX - ev.clientX;
      const next = Math.max(min, Math.min(max, dragRef.current.startW + dx));
      setWidth(next);
    };
    const up = () => {
      dragRef.current.active = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try { localStorage.setItem(storageKey, String(latestRef.current)); } catch {}
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }, [width, min, max, storageKey]);

  const resetWidth = useCallback(() => persist(defaultValue), [persist, defaultValue]);

  return { width, startResize, resetWidth };
}
