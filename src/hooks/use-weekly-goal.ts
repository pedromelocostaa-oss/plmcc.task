import { useState } from "react";

/** Retorna a chave da semana ISO atual: "2026-W23" */
export function getWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow); // quinta-feira da semana
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Retorna "2 – 8 jun 2026" para o intervalo Mon–Sun da semana atual */
export function getWeekRange(date: Date = new Date()): string {
  const d = new Date(date);
  const dow = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (dt: Date) =>
    dt.toLocaleDateString("pt-BR", { day: "numeric", month: "short", timeZone: "America/Sao_Paulo" });
  const year = sunday.toLocaleDateString("pt-BR", { year: "numeric", timeZone: "America/Sao_Paulo" });

  const start = fmt(monday).replace(".", "");
  const end = fmt(sunday).replace(".", "");
  return `${start} – ${end} de ${year}`;
}

/** true se hoje for segunda-feira (no fuso de Brasília) */
function isMonday(): boolean {
  const dow = new Date().toLocaleDateString("en-US", { weekday: "short", timeZone: "America/Sao_Paulo" });
  return dow === "Mon";
}

export function useWeeklyGoal() {
  const weekKey = getWeekKey();
  const storageKey = `hq-weekly-goal-${weekKey}`;

  const [goal, setGoal] = useState<string>(() => {
    try { return localStorage.getItem(storageKey) ?? ""; } catch { return ""; }
  });

  const hasGoal = goal.trim().length > 0;
  const isMonday_ = isMonday();
  // Exibe o prompt se: (a) segunda e sem objetivo, ou (b) o usuário clicar em "definir"
  const [forcePrompt, setForcePrompt] = useState(false);
  const showPrompt = !hasGoal && (isMonday_ || forcePrompt);

  function saveGoal(text: string) {
    const t = text.trim();
    if (!t) return;
    setGoal(t);
    setForcePrompt(false);
    try { localStorage.setItem(storageKey, t); } catch {}
  }

  function editGoal() {
    setForcePrompt(true);
  }

  function clearGoal() {
    setGoal("");
    try { localStorage.removeItem(storageKey); } catch {}
  }

  return {
    goal,
    hasGoal,
    showPrompt,
    isMonday: isMonday_,
    weekKey,
    weekRange: getWeekRange(),
    saveGoal,
    editGoal,
    clearGoal,
  };
}
