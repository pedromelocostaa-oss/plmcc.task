import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";
import { useResumoMes, useContas } from "../lib/queries";
import { colors, radius } from "@/lib/tokens";

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export function FinanceWidget() {
  const { data: resumo } = useResumoMes();
  const { data: contas = [] } = useContas();

  const saldoContas = contas.reduce((s, c) => s + Number(c.saldo_inicial), 0);

  return (
    <Link to="/financas" style={{ textDecoration: "none", display: "block" }}>
      <div style={{
        background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md,
        padding: "14px 16px", transition: "border-color 0.15s",
      }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#30D158"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = colors.border; }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Wallet size={14} color="#30D158" />
          <span style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary }}>Finanças do mês</span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <MiniVal label="Receitas" value={fmt(resumo?.receitas ?? 0)} icon={<ArrowUpRight size={12} />} color="#30D158" />
          <MiniVal label="Despesas" value={fmt(resumo?.despesas ?? 0)} icon={<ArrowDownRight size={12} />} color="#FF375F" />
          <MiniVal label="Saldo" value={fmt(resumo?.saldo ?? 0)} color={resumo && resumo.saldo >= 0 ? "#30D158" : "#FF375F"} />
        </div>
        {contas.length > 0 && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>Patrimônio em contas</div>
            <div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmt(saldoContas)}</div>
          </div>
        )}
      </div>
    </Link>
  );
}

function MiniVal({ label, value, icon, color }: { label: string; value: string; icon?: React.ReactNode; color: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
        {icon && <span style={{ color }}>{icon}</span>}
        <span style={{ fontSize: 10, color: colors.textMuted }}>{label}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}
