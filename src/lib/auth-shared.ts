// Destino pos-login: aceita so caminhos internos (evita open redirect).
export function safeRedirect(raw: unknown, fallback = "/"): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (/[\r\n\t]/.test(raw)) return fallback;
  if (raw === "/login" || raw.startsWith("/login?") || raw.startsWith("/login/")) return fallback;
  return raw;
}

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;
