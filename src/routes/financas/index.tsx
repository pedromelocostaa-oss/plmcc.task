import { createFileRoute, Link } from "@tanstack/react-router";
import { Landmark, Tag, ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { useContas, useCategorias, useResumoMes } from "@/features/financas/lib/queries";
import { colors, radius } from "@/lib/tokens";

export const Route = createFileRoute("/financas/")({
  component: FinancasDashboard,
  head: () => ({ meta: [{ title: "Finanças · Pedro's HQ" }] }),
});

function FinancasDashboard() {
  const { data: contas = [] } = useContas();
  const { data: categorias = [] } = useCategorias();
  const { data: resumo } = useResumoMes();

  const saldoTotal = contas.reduce((s, c) => s + Number(c.saldo_inicial), 0);

  return (
    <div style={{ padding: 32, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 24px" }}>Finanças</h1>

      {/* Cards resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <SummaryCard label="Saldo em contas" value={fmt(saldoTotal)} icon={<Landmark size={16} />} color="#0A84FF" />
        <SummaryCard
          label="Receitas do mês"
          value={fmt(resumo?.receitas ?? 0)}
          icon={<ArrowUpRight size={16} />}
          color="#30D158"
        />
        <SummaryCard
          label="Despesas do mês"
          value={fmt(resumo?.despesas ?? 0)}
          icon={<ArrowDownRight size={16} />}
          color="#FF375F"
        />
        <SummaryCard
          label="Saldo do mês"
          value={fmt(resumo?.saldo ?? 0)}
          icon={<TrendingUp size={16} />}
          color={resumo && resumo.saldo >= 0 ? "#30D158" : "#FF375F"}
        />
      </div>

      {/* Atalhos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
        <ShortcutCard to="/financas/lancamentos" emoji="📋" title="Lançamentos" desc={`${resumo?.total ?? 0} este mês`} />
        <ShortcutCard to="/financas/contas" emoji="🏦" title="Contas" desc={`${contas.length} ativa${contas.length !== 1 ? "s" : ""}`} />
        <ShortcutCard to="/financas/categorias" emoji="🏷️" title="Categorias" desc={`${categorias.length} cadastrada${categorias.length !== 1 ? "s" : ""}`} />
      </div>

      {/* Contas rápidas */}
      {contas.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Suas contas</h2>
            <Link to="/financas/contas" style={{ fontSize: 12, color: colors.accent, textDecoration: "none" }}>Ver todas</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {contas.slice(0, 5).map((c) => (
              <div key={c.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", background: colors.surface,
                border: `1px solid ${colors.border}`, borderRadius: radius.sm,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: (c.cor ?? "#0A84FF") + "18",
                  display: "grid", placeItems: "center", fontSize: 16,
                }}>
                  {c.tipo === "conta_corrente" ? "🏦" : c.tipo === "poupanca" ? "🐷" : c.tipo === "dinheiro" ? "💵" : c.tipo === "investimento" ? "📈" : "💳"}
                </div>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{c.nome}</span>
                <span style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt(Number(c.saldo_inicial))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {contas.length === 0 && categorias.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: colors.textMuted }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💰</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Comece configurando suas finanças</div>
          <div style={{ fontSize: 13 }}>
            Crie suas <Link to="/financas/contas" style={{ color: colors.accent }}>contas</Link> e{" "}
            <Link to="/financas/categorias" style={{ color: colors.accent }}>categorias</Link> para começar.
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div style={{
      background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md,
      padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ color }}>{icon}</div>
        <span style={{ fontSize: 11, color: colors.textMuted, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function ShortcutCard({ to, emoji, title, desc }: { to: string; emoji: string; title: string; desc: string }) {
  return (
    <Link to={to} style={{ textDecoration: "none" }}>
      <div style={{
        background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md,
        padding: "16px 18px", display: "flex", alignItems: "center", gap: 14,
        transition: "border-color 0.15s",
      }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = colors.accent; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = colors.border; }}
      >
        <div style={{ fontSize: 28 }}>{emoji}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{title}</div>
          <div style={{ fontSize: 12, color: colors.textSecondary }}>{desc}</div>
        </div>
      </div>
    </Link>
  );
}

function fmt(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
