import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (!loading && user) nav({ to: "/" }); }, [user, loading, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || "Erro");
    } finally { setBusy(false); }
  }

  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1117" }}>
      <div style={{ width: 360, padding: 32, background: "#161b22", border: "1px solid #30363d", borderRadius: 10 }}>
        <div style={{ fontFamily: "DM Mono", fontSize: 10, color: "#6e7681", letterSpacing: 1 }}>WORKSPACE</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#e6edf3", marginBottom: 24 }}>Pedro's HQ</div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password" placeholder="Senha" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
          {error && <div style={{ color: "#ef4444", fontSize: 12 }}>{error}</div>}
          <button type="submit" disabled={busy} style={{
            background: "#f97316", color: "#0d1117", border: "none", padding: "10px 14px",
            borderRadius: 6, fontWeight: 600, cursor: "pointer", opacity: busy ? 0.6 : 1,
          }}>
            {busy ? "..." : mode === "signin" ? "Entrar" : "Criar conta"}
          </button>
          <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            style={{ background: "transparent", color: "#8b949e", border: "none", fontSize: 12, cursor: "pointer", marginTop: 4 }}>
            {mode === "signin" ? "Não tem conta? Criar uma" : "Já tem conta? Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#0d1117", border: "1px solid #30363d", color: "#e6edf3",
  padding: "10px 12px", borderRadius: 6, fontSize: 14,
};
