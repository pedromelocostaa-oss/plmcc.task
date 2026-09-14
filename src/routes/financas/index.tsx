import { createFileRoute, Link } from "@tanstack/react-router";
import { Wallet, ArrowUpRight, ArrowDownRight, TrendingUp, Receipt, Landmark, Tag, CreditCard, RefreshCw } from "lucide-react";
import { useContas, useCategorias, useResumoMes, useLancamentos } from "@/features/financas/lib/queries";
import { colors, radius } from "@/lib/tokens";

export const Route = createFileRoute("/financas/")({
  component: FinancasDashboard,
  head: () => ({ meta: [{ title: "Finanças · Pedro's HQ" }] }),
});

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function FinancasDashboard() {
  const { data: contas = [] } = useContas();
  const { data: categorias = [] } = useCategorias();
  const { data: resumo } = useResumoMes();
  const { data: lancamentos = [] } = useLancamentos();

  const saldoTotal = contas.reduce((s, c) => s + Number(c.saldo_inicial), 0);
  const saldo = resumo?.saldo ?? 0;

  return (
    <div style={{ padding: "24px 16px 80px", maxWidth: 900, margin: "0 auto" }}>
      <style>{`
        @keyframes mmFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mmSlideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .mm-fade { animation: mmFadeIn 0.22s ease-out; }
        .mm-slide { animation: mmSlideUp 0.32s cubic-bezier(0.16, 1, 0.3, 1); }
        .mm-card { background: var(--hq-surface); border: none; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05); transition: box-shadow 0.2s; }
        .mm-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06); }
        @media (prefers-color-scheme: dark) {
          .mm-card { box-shadow: 0 4px 16px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.25); }
          .mm-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.50), 0 2px 6px rgba(0,0,0,0.35); }
        }
      `}</style>

      {/* Page title */}
      <div className="mm-fade" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em", margin: 0 }}>Finanças</h1>
      </div>

      {/* Patrimônio hero card */}
      <div className="mm-slide" style={{
        background: "linear-gradient(135deg, #007AFF, #5AC8FA)",
        borderRadius: 20, padding: "24px 28px",
        marginBottom: 16,
        boxShadow: "0 4px 20px rgba(0,122,255,0.25)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        color: "#fff",
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, opacity: 0.7, marginBottom: 4 }}>Patrimônio Total</div>
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums" }}>
            {fmt(saldoTotal)}
          </div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
            {contas.length} conta{contas.length !== 1 ? "s" : ""} ativa{contas.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div style={{
          width: 56, height: 56, borderRadius: 18,
          background: "rgba(255,255,255,0.2)",
          display: "grid", placeItems: "center",
        }}>
          <Wallet size={28} />
        </div>
      </div>

      {/* Metric cards */}
      <div className="mm-slide" style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12, marginBottom: 24,
      }}>
        <MetricCard
          label="Receitas"
          value={fmt(resumo?.receitas ?? 0)}
          icon={<ArrowUpRight size={16} />}
          color="#34C759"
        />
        <MetricCard
          label="Despesas"
          value={fmt(resumo?.despesas ?? 0)}
          icon={<ArrowDownRight size={16} />}
          color="#FF3B30"
        />
        <MetricCard
          label="Resultado"
          value={fmt(saldo)}
          icon={<TrendingUp size={16} />}
          color={saldo >= 0 ? "#34C759" : "#FF3B30"}
        />
      </div>

      {/* Shortcuts */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.textMuted, marginBottom: 10 }}>
          Acesso rápido
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          <ShortcutCard to="/financas/lancamentos" icon={<Receipt size={17} />} color="#007AFF" title="Lançamentos" desc={`${lancamentos.length} este mês`} />
          <ShortcutCard to="/financas/contas" icon={<Landmark size={17} />} color="#34C759" title="Contas" desc={`${contas.length} ativa${contas.length !== 1 ? "s" : ""}`} />
          <ShortcutCard to="/financas/categorias" icon={<Tag size={17} />} color="#FF9500" title="Categorias" desc={`${categorias.length} cadastrada${categorias.length !== 1 ? "s" : ""}`} />
          <ShortcutCard to="/financas/cartoes" icon={<CreditCard size={17} />} color="#AF52DE" title="Cartões" />
          <ShortcutCard to="/financas/recorrencias" icon={<RefreshCw size={17} />} color="#5856D6" title="Recorrências" />
        </div>
      </div>

      {/* Contas list */}
      {contas.length > 0 && (
        <div className="mm-slide">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.textMuted }}>
              Suas contas
            </span>
            <Link to="/financas/contas" style={{ fontSize: 12, color: "#007AFF", textDecoration: "none", fontWeight: 500 }}>Ver todas</Link>
          </div>
          <div className="mm-card" style={{ overflow: "hidden" }}>
            {contas.slice(0, 5).map((c, i) => (
              <div key={c.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "14px 18px",
                borderBottom: i < Math.min(contas.length, 5) - 1 ? `1px solid ${colors.border}` : "none",
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: (c.cor ?? "#007AFF") + "18",
                  display: "grid", placeItems: "center",
                  flexShrink: 0,
                }}>
                  <Landmark size={18} color={c.cor ?? "#007AFF"} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.nome}</div>
                  <div style={{ fontSize: 11, color: colors.textMuted }}>
                    {c.tipo === "conta_corrente" ? "Conta corrente" : c.tipo === "poupanca" ? "Poupança" : c.tipo === "dinheiro" ? "Dinheiro" : c.tipo === "investimento" ? "Investimento" : "Cartão"}
                  </div>
                </div>
                <div style={{
                  fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums",
                  color: Number(c.saldo_inicial) >= 0 ? colors.text : "#FF3B30",
                }}>
                  {fmt(Number(c.saldo_inicial))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {contas.length === 0 && categorias.length === 0 && (
        <div className="mm-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(0,122,255,0.1)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
            <Wallet size={30} color="#007AFF" />
          </div>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Comece configurando suas finanças</div>
          <div style={{ fontSize: 14, color: colors.textMuted, lineHeight: 1.5 }}>
            Crie suas <Link to="/financas/contas" style={{ color: "#007AFF", textDecoration: "none", fontWeight: 500 }}>contas</Link> e{" "}
            <Link to="/financas/categorias" style={{ color: "#007AFF", textDecoration: "none", fontWeight: 500 }}>categorias</Link> para começar.
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="mm-card mm-slide" style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.textMuted }}>
          {label}
        </span>
        <div style={{
          width: 30, height: 30, borderRadius: 9,
          background: color + "18",
          display: "grid", placeItems: "center",
        }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums", color }}>
        {value}
      </div>
    </div>
  );
}

function ShortcutCard({ to, icon, color, title, desc }: { to: string; icon: React.ReactNode; color: string; title: string; desc?: string }) {
  return (
    <Link to={to} style={{ textDecoration: "none" }}>
      <div className="mm-card" style={{
        padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10,
        cursor: "pointer",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: color + "18",
          display: "grid", placeItems: "center",
        }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{title}</div>
          {desc && <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{desc}</div>}
        </div>
      </div>
    </Link>
  );
}
