import { useEffect, RefObject } from "react";

export function useFocusTrap(ref: RefObject<HTMLElement | null>, active = true) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const el = ref.current;
    const getFocusables = (): HTMLElement[] => Array.from(
      el.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Prefere o elemento com [autofocus] (ex: input de título do modal).
    // Sem isso, o focus trap focava no primeiro elemento interativo (botão X
    // ou aba), roubando o foco do input logo após o autoFocus do React agir —
    // o usuário precisava clicar manualmente no campo para começar a digitar.
    const autoFocusEl = el.querySelector<HTMLElement>("[autofocus]");
    const first = autoFocusEl ?? getFocusables()[0];
    // Pequeno delay para deixar a animação de entrada do modal completar
    // antes de focar — evita comportamento errático em alguns browsers.
    setTimeout(() => first?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusables = getFocusables();
      if (!focusables.length) return;
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    el.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, [ref, active]);
}
