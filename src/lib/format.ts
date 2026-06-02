import { TAG_PALETTE } from "./types";

/** ISO date (YYYY-MM-DD) no fuso de Brasília */
export function toIso(date: Date = new Date()): string {
  return date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/** ISO de hoje no fuso de Brasília */
export function todayIso(): string {
  return toIso(new Date());
}

export function tagColor(tag: string): string {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  return TAG_PALETTE[h % TAG_PALETTE.length];
}

export function hostname(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export function formatDue(dueDate: string | null, status: string): { label: string; color: string } {
  if (!dueDate) return { label: "", color: "" };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dueDate + "T00:00:00");
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  if (status === "done") return { label: `${dd}/${mm}`, color: "#6e7681" };
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: `${dd}/${mm} · atrasado`, color: "#ef4444" };
  if (diff === 0) return { label: "Hoje", color: "#f97316" };
  if (diff === 1) return { label: "Amanhã", color: "#d29922" };
  return { label: `${dd}/${mm}`, color: "#6e7681" };
}

export function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === "done") return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(dueDate + "T00:00:00").getTime() < today.getTime();
}

export function isToday(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(dueDate + "T00:00:00").getTime() === today.getTime();
}

export function isThisWeek(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dueDate + "T00:00:00");
  const diff = (d.getTime() - today.getTime()) / 86400000;
  return diff >= 0 && diff <= 7;
}

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
