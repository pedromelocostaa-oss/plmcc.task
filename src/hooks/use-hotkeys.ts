import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

interface Handlers {
  onQuickAdd?: () => void;
  onSearch?: () => void;
  onCloseOverlays?: () => void;
}

export function useGlobalHotkeys({ onQuickAdd, onSearch, onCloseOverlays }: Handlers) {
  const router = useRouter();

  useEffect(() => {
    const isEditable = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    };

    let gComboTimer: number | null = null;

    const onKey = (e: KeyboardEvent) => {
      const editable = isEditable(e.target);

      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault(); onSearch?.(); return;
      }
      if ((e.key === "n" || e.key === "N") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault(); onQuickAdd?.(); return;
      }
      if (e.key === "/" && !editable) {
        e.preventDefault(); onSearch?.(); return;
      }
      if (e.key === "Escape") { onCloseOverlays?.(); return; }

      if (!editable) {
        if (e.key === "g" || e.key === "G") {
          gComboTimer = window.setTimeout(() => { gComboTimer = null; }, 1000);
          const next = (ev: KeyboardEvent) => {
            const map: Record<string, string> = {
              h: "/", H: "/",
              t: "/tasks", T: "/tasks",
              d: "/dashboard", D: "/dashboard",
              n: "/notes", N: "/notes",
              b: "/purchases", B: "/purchases",
              l: "/bookmarks", L: "/bookmarks",
              u: "/upcoming", U: "/upcoming",
            };
            const to = map[ev.key];
            if (to) { ev.preventDefault(); router.navigate({ to } as any); }
            window.removeEventListener("keydown", next);
            if (gComboTimer) clearTimeout(gComboTimer);
          };
          window.addEventListener("keydown", next, { once: true });
          return;
        }
        if (e.key === "?") {
          import("sonner").then(({ toast }) => {
            toast("Atalhos: ⌘K busca · ⌘N adicionar · G+H/T/D/N/B/L/U nav · Esc fecha", { duration: 6000 });
          });
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, onQuickAdd, onSearch, onCloseOverlays]);
}
