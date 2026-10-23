import { useEffect, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Eye, EyeOff, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSessionFn, loginFn } from "@/lib/auth.functions";
import { safeRedirect } from "@/lib/auth-shared";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: async ({ search }) => {
    if (typeof window === "undefined") {
      const user = await getSessionFn();
      if (user) throw redirect({ href: safeRedirect(search.redirect) });
    }
  },
  head: () => ({ meta: [{ title: "Entrar · Pedro's HQ" }] }),
  component: LoginPage,
});

const MESSAGES = {
  invalid: "E-mail ou senha incorretos.",
  unavailable: "Não foi possível verificar o login agora. Tente novamente em instantes.",
  network: "Sem conexão com o servidor. Verifique sua internet.",
} as const;

function LoginPage() {
  const search = Route.useSearch();
  const target = safeRedirect(search.redirect);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedFor, setLockedFor] = useState(0);

  // Sessao ainda valida no navegador (ex.: access token vencido que o servidor nao renovou):
  // renova e volta. O carimbo evita loop se o servidor continuar recusando.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const last = Number(sessionStorage.getItem("hq-login-bounce") ?? 0);
      if (Date.now() - last < 10_000) return;
      const { data } = await supabase.auth.getSession();
      if (!cancelled && data.session) {
        sessionStorage.setItem("hq-login-bounce", String(Date.now()));
        window.location.assign(target);
      }
    })();
    return () => { cancelled = true; };
  }, [target]);

  useEffect(() => {
    if (lockedFor <= 0) return;
    const t = setInterval(() => setLockedFor((s) => (s > 1 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [lockedFor]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || lockedFor > 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await loginFn({ data: { email, password } });
      if (res.ok) {
        window.location.assign(target);
        return;
      }
      if (res.reason === "locked") {
        setLockedFor(res.retryAfter ?? 30);
        setError("Muitas tentativas. Aguarde para tentar de novo.");
      } else {
        setError(MESSAGES[res.reason]);
      }
      setPassword("");
    } catch {
      setError(MESSAGES.network);
    } finally {
      setLoading(false);
    }
  }

  const blocked = loading || lockedFor > 0;

  return (
    <div style={{
      minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24,
      background: "var(--hq-bg)", color: "var(--hq-text)",
    }}>
      <form onSubmit={onSubmit} style={{
        width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 14,
        background: "var(--hq-surface)", borderRadius: 20, padding: "32px 28px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, margin: "0 auto 14px",
            background: "var(--hq-accent-bg)", display: "grid", placeItems: "center",
          }}>
            <Lock size={22} color="var(--hq-accent)" />
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.025em" }}>Pedro's HQ</h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--hq-text-secondary)" }}>
            Entre para continuar
          </p>
        </div>

        <label style={labelStyle}>
          E-mail
          <input
            type="email" name="email" autoComplete="username" required autoFocus
            value={email} onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Senha
          <div style={{ position: "relative" }}>
            <input
              type={show ? "text" : "password"} name="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, paddingRight: 44 }}
            />
            <button
              type="button" onClick={() => setShow((v) => !v)}
              aria-label={show ? "Ocultar senha" : "Mostrar senha"}
              style={{
                position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                background: "transparent", border: "none", cursor: "pointer", padding: 8,
                color: "var(--hq-text-muted)", display: "flex",
              }}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        <div role="alert" aria-live="polite" style={{ minHeight: 18, fontSize: 12.5, color: "var(--hq-danger)" }}>
          {error}
          {lockedFor > 0 && ` (${lockedFor}s)`}
        </div>

        <button
          type="submit" disabled={blocked}
          style={{
            background: "var(--hq-accent)", color: "#fff", border: "none", borderRadius: 12,
            padding: "12px 16px", fontSize: 14, fontWeight: 600,
            cursor: blocked ? "not-allowed" : "pointer", opacity: blocked ? 0.6 : 1,
          }}
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 6,
  fontSize: 12, fontWeight: 600, color: "var(--hq-text-secondary)",
};

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", fontSize: 15, padding: "11px 14px",
  borderRadius: 12, border: "1px solid var(--hq-border)",
  background: "var(--hq-inlay-bg, var(--hq-bg))", color: "var(--hq-text)", outline: "none",
};
