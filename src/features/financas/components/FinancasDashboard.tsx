import { createContext, useContext, useMemo, type CSSProperties, type ComponentType, type ReactNode } from "react";
import {
  ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, CreditCard, Landmark, PiggyBank,
  Eye, EyeOff, Receipt, TrendingUp,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useDashboardData } from "../lib/queries";
import { formatMoney } from "../lib/privacy";
import { useHideValues } from "../lib/use-hide-values";
import {
  PRESETS, buildDashboard, capitalizeFirst, editRange, formatCents, formatDateBR, formatDayMonth, isIsoDate, monthLabel, monthShort,
  presetRange, resolvePeriod, shiftMonth,
  type DashboardModel, type FaturaStatus, type Period, type PresetKey, type SearchParams,
} from "../lib/dashboard";
import { colors } from "@/lib/tokens";

export type DashboardLink = ComponentType<{ to: string; style?: CSSProperties; children: ReactNode }>;

const GREEN = "#34C759";
const RED = "#FF3B30";
const BLUE = "#007AFF";
const PURPLE = "#5856D6";
const ORANGE = "#FF9500";
const PALETTE = ["#007AFF", "#5856D6", "#FF9500", "#34C759", "#AF52DE", "#FF2D55", "#5AC8FA", "#FFCC00"];

const STATUS: Record<FaturaStatus, { label: string; color: string }> = {
  aberta: { label: "Aberta", color: BLUE },
  fechada: { label: "Fechada", color: ORANGE },
  vencida: { label: "Vencida", color: RED },
};

// Todo valor em reais da tela passa por aqui: mostra o número ou a máscara, conforme a escolha do usuário.
const MoneyContext = createContext<(cents: number) => string>(formatCents);
const useMoney = () => useContext(MoneyContext);

function todayBrasilia(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

// ── container: busca os dados e calcula ─────────────────────────────────────

export function FinancasDashboard({
  search, onSearchChange, Link,
}: { search: SearchParams; onSearchChange: (s: SearchParams) => void; Link: DashboardLink }) {
  const { data, isLoading, isError } = useDashboardData();
  const [hidden, toggleHidden] = useHideValues();
  const today = useMemo(todayBrasilia, []);
  const period = useMemo(() => resolvePeriod(search, today), [search, today]);
  const model = useMemo(
    () => buildDashboard({
      lancamentos: data?.lancamentos ?? [], faturas: data?.faturas ?? [],
      contas: data?.contas ?? [], categorias: data?.categorias ?? [],
      range: period.range, today,
    }),
    [data, period, today],
  );
  return (
    <FinancasDashboardUI
      model={model} period={period} today={today}
      loading={isLoading} error={isError}
      hidden={hidden} onToggleHidden={toggleHidden}
      onChange={onSearchChange} Link={Link}
    />
  );
}

// ── apresentação ────────────────────────────────────────────────────────────

export function FinancasDashboardUI({
  model, period, today, loading, error, onChange, Link, hidden = false, onToggleHidden,
}: {
  model: DashboardModel; period: Period; today: string; loading?: boolean; error?: boolean;
  onChange: (s: SearchParams) => void; Link: DashboardLink;
  hidden?: boolean; onToggleHidden?: () => void;
}) {
  const fmt = useMemo(() => (cents: number) => formatMoney(cents, hidden), [hidden]);
  const vazio = !loading && model.totalLancamentosNoPeriodo === 0 && model.proximasFaturas.length === 0 && model.contas.length === 0;

  return (
    <MoneyContext.Provider value={fmt}>
    <div style={{ padding: "24px 16px 80px", maxWidth: 1000, margin: "0 auto" }}>
      <style>{`
        .fd-card { background: var(--hq-surface); border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05); }
        @media (prefers-color-scheme: dark) { .fd-card { box-shadow: 0 4px 16px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.25); } }
        .fd-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
        .fd-grid-2 { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); }
        .fd-chip { border: none; border-radius: 999px; padding: 6px 12px; font-size: 12px; font-weight: 500; cursor: pointer; transition: background 0.15s; }
        .fd-row:hover { background: var(--hq-surface-hover); }
        .fd-skel { background: var(--hq-border); border-radius: 12px; opacity: 0.5; animation: fdPulse 1.2s ease-in-out infinite; }
        @keyframes fdPulse { 50% { opacity: 0.25; } }
      `}</style>

      <div style={{ marginBottom: 16, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em", margin: 0 }}>Finanças</h1>
          <p style={{ color: colors.textMuted, fontSize: 13, margin: "4px 0 0" }}>
            {period.mode === "mes" ? monthLabel(period.mes) : `${formatDateBR(period.range.from)} a ${formatDateBR(period.range.to)}`}
          </p>
        </div>
        {onToggleHidden && (
          <button
            type="button"
            onClick={onToggleHidden}
            aria-pressed={hidden}
            aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
            title={hidden ? "Mostrar valores" : "Ocultar valores"}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0, cursor: "pointer",
              padding: "8px 12px", borderRadius: 12, fontSize: 13, fontWeight: 500,
              border: `1px solid ${colors.border}`, background: "var(--hq-surface)", color: colors.textSecondary,
            }}
          >
            {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
            {hidden ? "Mostrar valores" : "Ocultar valores"}
          </button>
        )}
      </div>

      <PeriodBar period={period} today={today} onChange={onChange} />

      {error && (
        <div className="fd-card" style={{ padding: 20, marginBottom: 16, color: RED, fontSize: 14 }}>
          Não foi possível carregar os dados. Atualize a página.
        </div>
      )}

      {loading ? <Skeleton /> : (
        <>
          <Hero model={model} Link={Link} />

          <div className="fd-grid" style={{ marginBottom: 12 }}>
            <Stat icon={<ArrowUpRight size={18} color={GREEN} />} tint={GREEN} label="Receitas" value={fmt(model.receitas)} valueColor={GREEN}
              sub={model.receitas > 0 ? `${fmt(model.receitasRecebidas)} já recebido` : "Nenhuma no período"} />
            <Stat icon={<ArrowDownRight size={18} color={RED} />} tint={RED} label="Despesas" value={fmt(model.despesas)} valueColor={RED}
              sub={model.despesas > 0 ? `${fmt(model.despesasNoCartao)} no cartão · ${fmt(model.despesasAVista)} à vista` : "Nenhuma no período"} />
            <Stat icon={<TrendingUp size={18} color={BLUE} />} tint={BLUE} label="Saldo do período" value={fmt(model.saldoPeriodo)}
              valueColor={model.saldoPeriodo < 0 && !hidden ? RED : colors.text} sub="Receitas menos despesas" />
          </div>

          <Panel title="Cartão × caixa" hint="O cartão só sai do caixa quando a fatura é paga.">
            <div className="fd-grid">
              <Mini label="Gasto no cartão" value={fmt(model.despesasNoCartao)} note="Compras do período, pela data da compra" color={PURPLE} />
              <Mini label="Saída de caixa" value={fmt(model.saidaDeCaixa)}
                note={model.faturasPagasNoPeriodo > 0 ? `Inclui ${fmt(model.faturasPagasNoPeriodo)} de faturas pagas` : "Despesas pagas à vista + faturas pagas"} color={ORANGE} />
            </div>
          </Panel>

          <div className="fd-grid-2" style={{ marginTop: 12 }}>
            <Faturas model={model} Link={Link} />
            <Categorias model={model} />
          </div>

          <div className="fd-grid-2" style={{ marginTop: 12 }}>
            <Evolucao model={model} />
            <Recentes model={model} today={today} Link={Link} />
          </div>

          {vazio && (
            <p style={{ textAlign: "center", color: colors.textMuted, fontSize: 13, marginTop: 24 }}>
              Ainda não há dados. Cadastre contas e lançamentos para ver o dashboard.
            </p>
          )}
        </>
      )}
    </div>
    </MoneyContext.Provider>
  );
}

// ── seletor de período ──────────────────────────────────────────────────────

function PeriodBar({ period, today, onChange }: { period: Period; today: string; onChange: (s: SearchParams) => void }) {
  const { from, to } = period.range;
  const mesAtual = period.mode === "mes" ? period.mes : from.slice(0, 7);

  function applyPreset(key: PresetKey) {
    const r = presetRange(key, today);
    if (key === "este-mes" || key === "mes-passado") onChange({ mes: r.from.slice(0, 7) });
    else onChange({ de: r.from, ate: r.to });
  }
  function isActive(key: PresetKey) {
    const r = presetRange(key, today);
    return r.from === from && r.to === to;
  }
  const seg = (active: boolean): CSSProperties => ({
    border: "none", padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13,
    fontWeight: active ? 600 : 500,
    background: active ? "var(--hq-surface)" : "transparent",
    color: active ? colors.text : colors.textSecondary,
    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
  });
  const dateInput: CSSProperties = {
    background: "var(--hq-inlay-bg, var(--hq-bg))", border: `1px solid ${colors.border}`, color: colors.text,
    padding: "7px 10px", borderRadius: 10, fontSize: 13,
  };

  return (
    <div className="fd-card" style={{ padding: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div role="tablist" aria-label="Tipo de período" style={{ display: "flex", gap: 2, padding: 3, borderRadius: 11, background: colors.bg }}>
          <button role="tab" aria-selected={period.mode === "mes"} style={seg(period.mode === "mes")} onClick={() => onChange({ mes: mesAtual })}>Mês</button>
          <button role="tab" aria-selected={period.mode === "periodo"} style={seg(period.mode === "periodo")}
            onClick={() => onChange({ de: from, ate: to })}>Período</button>
        </div>

        {period.mode === "mes" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button aria-label="Mês anterior" onClick={() => onChange({ mes: shiftMonth(period.mes, -1) })} style={navBtn}><ChevronLeft size={16} /></button>
            <span style={{ minWidth: 150, textAlign: "center", fontSize: 14, fontWeight: 600 }}>{capitalizeFirst(monthLabel(period.mes))}</span>
            <button aria-label="Próximo mês" onClick={() => onChange({ mes: shiftMonth(period.mes, 1) })} style={navBtn}><ChevronRight size={16} /></button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, color: colors.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
              De
              <input type="date" aria-label="Data inicial" value={from} style={dateInput}
                onChange={(e) => isIsoDate(e.target.value) && onChange(editRange(period.range, "de", e.target.value))} />
            </label>
            <label style={{ fontSize: 12, color: colors.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
              Até
              <input type="date" aria-label="Data final" value={to} style={dateInput}
                onChange={(e) => isIsoDate(e.target.value) && onChange(editRange(period.range, "ate", e.target.value))} />
            </label>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {PRESETS.map((p) => (
          <button key={p.key} className="fd-chip" onClick={() => applyPreset(p.key)}
            style={{
              background: isActive(p.key) ? "rgba(0,122,255,0.12)" : colors.bg,
              color: isActive(p.key) ? BLUE : colors.textSecondary,
              fontWeight: isActive(p.key) ? 600 : 500,
            }}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const navBtn: CSSProperties = {
  background: "transparent", border: `1px solid ${colors.border}`, borderRadius: 10, width: 32, height: 32,
  display: "grid", placeItems: "center", cursor: "pointer", color: colors.textSecondary,
};

// ── blocos ──────────────────────────────────────────────────────────────────

function Hero({ model, Link }: { model: DashboardModel; Link: DashboardLink }) {
  const fmt = useMoney();
  return (
    <div style={{
      background: "linear-gradient(135deg, #007AFF, #5AC8FA)", borderRadius: 20, padding: "22px 26px", marginBottom: 12,
      boxShadow: "0 4px 20px rgba(0,122,255,0.25)", color: "#fff",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, opacity: 0.8, marginBottom: 4 }}>Saldo nas contas</div>
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums" }}>
            {fmt(model.saldoContas)}
          </div>
        </div>
        <Link to="/financas/contas" style={{ color: "#fff", fontSize: 12, fontWeight: 600, textDecoration: "none", opacity: 0.9 }}>Ver contas</Link>
      </div>
      {model.contas.length > 0 ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {model.contas.slice(0, 4).map((c) => (
            <span key={c.id} style={{ background: "rgba(255,255,255,0.18)", borderRadius: 999, padding: "4px 10px", fontSize: 12 }}>
              {c.nome} · {fmt(c.saldo)}
            </span>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>Nenhuma conta ativa ainda.</div>
      )}
      {model.faturasPagasSemConta > 0 && (
        <div style={{ fontSize: 11, opacity: 0.75, marginTop: 10 }}>
          O pagamento de fatura ainda não desconta de nenhuma conta.
        </div>
      )}
    </div>
  );
}

function Stat({ icon, tint, label, value, valueColor, sub }: {
  icon: ReactNode; tint: string; label: string; value: string; valueColor?: string; sub?: string;
}) {
  return (
    <div className="fd-card" style={{ padding: "16px 18px", display: "flex", gap: 14, alignItems: "center" }}>
      <div style={{ width: 40, height: 40, borderRadius: 14, background: `${tint}1A`, display: "grid", placeItems: "center", flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.textMuted }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums", color: valueColor ?? colors.text }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function Panel({ title, hint, action, children }: { title: string; hint?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="fd-card" style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{title}</h2>
          {hint && <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{hint}</div>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Mini({ label, value, note, color }: { label: string; value: string; note: string; color: string }) {
  return (
    <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: 12 }}>
      <div style={{ fontSize: 12, color: colors.textMuted }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 11, color: colors.textMuted }}>{note}</div>
    </div>
  );
}

function Faturas({ model, Link }: { model: DashboardModel; Link: DashboardLink }) {
  const fmt = useMoney();
  const f = model.parcelasFuturas;
  return (
    <Panel title="Próximas faturas" hint="Faturas em aberto, independentes do período escolhido"
      action={<Link to="/financas/cartoes" style={linkStyle}>Ver cartões</Link>}>
      {model.proximasFaturas.length === 0 ? (
        <Empty icon={<CreditCard size={22} color={PURPLE} />} text="Nenhuma fatura em aberto" />
      ) : (
        <div>
          {model.proximasFaturas.map((x, i) => (
            <div key={x.id} className="fd-row" style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 6px",
              borderBottom: i < model.proximasFaturas.length - 1 ? `1px solid ${colors.border}` : "none",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  Fatura de {monthLabel(x.mes_referencia.slice(0, 7))}
                </div>
                <div style={{ fontSize: 11, color: colors.textMuted }}>
                  fecha {formatDayMonth(x.fechamento)} · vence {formatDayMonth(x.vencimento)} · {x.itens} {x.itens === 1 ? "item" : "itens"}
                </div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999,
                background: `${STATUS[x.status].color}1A`, color: STATUS[x.status].color,
              }}>{STATUS[x.status].label}</span>
              <div style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums", minWidth: 96, textAlign: "right" }}>
                {fmt(x.total)}
              </div>
            </div>
          ))}
          {f.quantidade > 0 && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: colors.bg }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>
                {fmt(f.total)} já comprometidos em {f.quantidade} {f.quantidade === 1 ? "parcela" : "parcelas"}
              </div>
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                Depois da próxima fatura:{" "}
                {f.porMes.map((m) => `${monthShort(m.mes)}/${m.mes.slice(2, 4)} ${fmt(m.total)}`).join(" · ")}
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function Categorias({ model }: { model: DashboardModel }) {
  const fmt = useMoney();
  const dados = model.categorias.map((c, i) => ({ ...c, cor: c.cor ?? (c.id === null ? "#8E8E93" : PALETTE[i % PALETTE.length]), valor: c.total / 100 }));
  const soCategoriaVazia = dados.length === 1 && dados[0].id === null;
  return (
    <Panel title="Despesas por categoria" hint="Compras do período, pela data da compra">
      {dados.length === 0 ? (
        <Empty icon={<PiggyBank size={22} color={BLUE} />} text="Sem despesas no período" />
      ) : (
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ width: 150, height: 150, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dados} dataKey="valor" nameKey="nome" innerRadius={44} outerRadius={70} paddingAngle={2} stroke="none" isAnimationActive={false}>
                  {dados.map((d, i) => <Cell key={i} fill={d.cor} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(Math.round(Number(v) * 100))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 6 }}>
            {dados.slice(0, 6).map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: d.cor, flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.nome}</span>
                <span style={{ color: colors.textMuted, fontSize: 11 }}>{d.percentual.toLocaleString("pt-BR")}%</span>
                <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt(d.total)}</span>
              </div>
            ))}
            {soCategoriaVazia && (
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                Categorize os lançamentos para ver a divisão dos gastos.
              </div>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}

function Evolucao({ model }: { model: DashboardModel }) {
  const fmt = useMoney();
  const dados = model.evolucao.map((e) => ({
    mes: monthShort(e.mes), receitas: e.receitas / 100, despesas: e.despesas / 100,
  }));
  const temDados = model.evolucao.some((e) => e.receitas > 0 || e.despesas > 0);
  return (
    <Panel title="Evolução mensal" hint="Receitas e despesas dos últimos 6 meses (data do lançamento)">
      {!temDados ? (
        <Empty icon={<TrendingUp size={22} color={BLUE} />} text="Sem movimento nos últimos 6 meses" />
      ) : (
        <div style={{ width: "100%", height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barGap={3}>
              <CartesianGrid vertical={false} stroke="var(--hq-border)" strokeDasharray="3 3" />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--hq-text-muted)" }} />
              <Tooltip formatter={(v) => fmt(Math.round(Number(v) * 100))} cursor={{ fill: "rgba(120,120,128,0.08)" }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              <Bar dataKey="receitas" name="Receitas" fill={GREEN} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="despesas" name="Despesas" fill={RED} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

function Recentes({ model, today, Link }: { model: DashboardModel; today: string; Link: DashboardLink }) {
  const fmt = useMoney();
  return (
    <Panel title="Lançamentos do período" hint={`${model.totalLancamentosNoPeriodo} no total`}
      action={<Link to="/financas/lancamentos" style={linkStyle}>Ver todos</Link>}>
      {model.recentes.length === 0 ? (
        <Empty icon={<Receipt size={22} color={BLUE} />} text="Nenhum lançamento no período" />
      ) : (
        <div>
          {model.recentes.map((r, i) => (
            <div key={r.id} className="fd-row" style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 6px",
              borderBottom: i < model.recentes.length - 1 ? `1px solid ${colors.border}` : "none",
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: "grid", placeItems: "center",
                background: r.tipo === "receita" ? `${GREEN}18` : r.tipo === "despesa" ? `${RED}18` : `${BLUE}18`,
              }}>
                {r.tipo === "receita" ? <ArrowUpRight size={15} color={GREEN} />
                  : r.tipo === "despesa" ? (r.noCartao ? <CreditCard size={14} color={RED} /> : <ArrowDownRight size={15} color={RED} />)
                  : <Landmark size={14} color={BLUE} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.descricao}</div>
                <div style={{ fontSize: 11, color: colors.textMuted }}>
                  {formatDayMonth(r.data)}{r.categoria ? ` · ${r.categoria}` : ""}{r.parcela ? ` · parcela ${r.parcela}` : ""}{r.noCartao ? " · cartão" : ""}{r.data > today ? " · agendado" : ""}
                </div>
              </div>
              <div style={{
                fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums",
                color: r.tipo === "receita" ? GREEN : r.tipo === "despesa" ? RED : colors.text,
              }}>
                {r.tipo === "receita" ? "+" : r.tipo === "despesa" ? "-" : ""}{fmt(r.valor)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

const linkStyle: CSSProperties = { fontSize: 12, color: BLUE, textDecoration: "none", fontWeight: 500 };

function Empty({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div style={{ textAlign: "center", padding: "22px 8px", color: colors.textMuted, fontSize: 13 }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: colors.bg, display: "grid", placeItems: "center", margin: "0 auto 8px" }}>{icon}</div>
      {text}
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }} aria-busy="true" aria-label="Carregando">
      <div className="fd-skel" style={{ height: 120 }} />
      <div className="fd-grid">
        <div className="fd-skel" style={{ height: 84 }} />
        <div className="fd-skel" style={{ height: 84 }} />
        <div className="fd-skel" style={{ height: 84 }} />
      </div>
      <div className="fd-skel" style={{ height: 220 }} />
    </div>
  );
}
