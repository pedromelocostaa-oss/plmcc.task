import { useState, useMemo } from "react";
import { Plus, Trash2, Pencil, X, ChevronLeft, ChevronRight, Check, Search, ArrowDownRight, ArrowUpRight, ArrowLeftRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  useLancamentos, useCreateLancamento, useUpdateLancamento, useDeleteLancamento,
  useContas, useCategorias, useCreateRecorrencia,
} from "../lib/queries";
import type { LancamentoTipo, RecorrenciaFrequencia } from "../lib/types";
import { colors } from "@/lib/tokens";
import { useAllTasks } from "@/lib/queries";

const TIPO_LABELS: Record<LancamentoTipo, string> = { receita: "Receita", despesa: "Despesa", transferencia: "Transferência" };
const TIPO_COLORS: Record<LancamentoTipo, string> = { receita: "#34C759", despesa: "#FF3B30", transferencia: "#007AFF" };
const TIPO_ICONS: Record<LancamentoTipo, typeof ArrowUpRight> = { receita: ArrowUpRight, despesa: ArrowDownRight, transferencia: ArrowLeftRight };

type Preset = { label: string; tipo: LancamentoTipo; descricao: string; icon: string };
const PRESETS: Preset[] = [
  { label: "Salário", tipo: "receita", descricao: "Salário", icon: "💰" },
  { label: "Freelance", tipo: "receita", descricao: "Freelance", icon: "💻" },
  { label: "Dívida a receber", tipo: "receita", descricao: "", icon: "🤝" },
  { label: "Alimentação", tipo: "despesa", descricao: "Alimentação", icon: "🍔" },
  { label: "Transporte", tipo: "despesa", descricao: "Transporte", icon: "🚗" },
  { label: "Conta fixa", tipo: "despesa", descricao: "", icon: "📄" },
];

function getMesAtual() { return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 7); }
function formatMes(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
function shiftMes(mes: string, delta: number) {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function today() { return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); }

export function LancamentosView() {
  const { data: contas = [] } = useContas();
  const { data: categorias = [] } = useCategorias();
  const { data: tarefas = [] } = useAllTasks({ status: "todo" });
  const createLanc = useCreateLancamento();
  const updateLanc = useUpdateLancamento();
  const deleteLanc = useDeleteLancamento();
  const createRec = useCreateRecorrencia();

  const [mes, setMes] = useState(getMesAtual);
  const [filtroConta, setFiltroConta] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [busca, setBusca] = useState("");

  const filters: Record<string, unknown> = { mes };
  if (filtroConta) filters.conta_id = filtroConta;
  if (filtroCategoria) filters.categoria_id = filtroCategoria;
  if (filtroTipo) filters.tipo = filtroTipo;

  const { data: lancamentos = [], isLoading } = useLancamentos(filters as any);

  const filtered = useMemo(() => {
    if (!busca.trim()) return lancamentos;
    const s = busca.toLowerCase();
    return lancamentos.filter((l: any) =>
      l.descricao.toLowerCase().includes(s) || (l.observacao ?? "").toLowerCase().includes(s)
    );
  }, [lancamentos, busca]);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    (filtered as any[]).forEach((l) => {
      const list = map.get(l.data) ?? [];
      list.push(l);
      map.set(l.data, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const [showForm, setShowForm] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState<LancamentoTipo>("despesa");
  const [data, setData] = useState(today());
  const [contaId, setContaId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [pago, setPago] = useState(true);
  const [observacao, setObservacao] = useState("");
  const [tarefaId, setTarefaId] = useState("");
  const [recorrente, setRecorrente] = useState(false);
  const [frequencia, setFrequencia] = useState<RecorrenciaFrequencia>("mensal");

  function resetForm() {
    setDescricao(""); setValor(""); setTipo("despesa"); setData(today());
    setContaId(""); setCategoriaId(""); setPago(true); setObservacao(""); setTarefaId("");
    setRecorrente(false); setFrequencia("mensal");
    setShowForm(false); setShowMore(false); setEditingId(null);
  }

  function openWithPreset(preset: Preset) {
    resetForm();
    setTipo(preset.tipo);
    setDescricao(preset.descricao);
    setPago(preset.tipo === "despesa");
    if (contas.length === 1) setContaId(contas[0].id);
    setShowForm(true);
  }

  function openNew(t: LancamentoTipo) {
    resetForm();
    setTipo(t);
    setPago(true);
    if (contas.length === 1) setContaId(contas[0].id);
    setShowForm(true);
  }

  function startEdit(l: any) {
    setEditingId(l.id); setDescricao(l.descricao); setValor(String(l.valor));
    setTipo(l.tipo); setData(l.data); setContaId(l.conta_id);
    setCategoriaId(l.categoria_id ?? ""); setPago(l.pago);
    setObservacao(l.observacao ?? ""); setTarefaId(l.tarefa_id ?? "");
    setShowForm(true); setShowMore(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao.trim() || !valor || !contaId) { toast.error("Preencha descrição, valor e conta"); return; }
    try {
      if (editingId) {
        await updateLanc.mutateAsync({
          id: editingId,
          data: { descricao: descricao.trim(), valor: Number(valor), tipo, data, conta_id: contaId, categoria_id: categoriaId || null, pago, observacao: observacao || null, tarefa_id: tarefaId || null },
        });
        toast.success("Lançamento atualizado");
      } else {
        await createLanc.mutateAsync({
          descricao: descricao.trim(), valor: Number(valor), tipo, data, conta_id: contaId, categoria_id: categoriaId || null, pago, observacao: observacao || null,
          data_pagamento: pago ? data : null, conta_destino_id: null, fatura_id: null, parcela_atual: null, parcela_total: null, compra_pai_id: null, recorrencia_id: null, tarefa_id: tarefaId || null,
        });
        if (recorrente && tipo !== "transferencia") {
          await createRec.mutateAsync({
            descricao: descricao.trim(), valor: Number(valor),
            tipo: tipo as "receita" | "despesa", frequencia,
            conta_id: contaId, categoria_id: categoriaId || undefined,
            data_inicio: data, gerar_como_pago: pago,
          });
        }
        toast.success(recorrente ? "Lançamento + recorrência criados" : "Lançamento criado");
      }
      resetForm();
    } catch { toast.error("Erro ao salvar lançamento"); }
  }

  async function handleDelete(id: string) {
    try { await deleteLanc.mutateAsync(id); toast.success("Lançamento excluído"); }
    catch { toast.error("Erro ao excluir lançamento"); }
  }

  async function togglePago(l: any) {
    try { await updateLanc.mutateAsync({ id: l.id, data: { pago: !l.pago, data_pagamento: !l.pago ? today() : null } }); }
    catch { toast.error("Erro ao atualizar"); }
  }

  const totalReceitas = lancamentos.filter((l: any) => l.tipo === "receita").reduce((s: number, l: any) => s + Number(l.valor), 0);
  const totalDespesas = lancamentos.filter((l: any) => l.tipo === "despesa").reduce((s: number, l: any) => s + Number(l.valor), 0);
  const catsFiltradas = categorias.filter((c) => tipo === "transferencia" ? true : c.tipo === tipo);
  const TipoIcon = TIPO_ICONS[tipo];

  return (
    <div style={{ padding: "24px 16px 80px", maxWidth: 800, margin: "0 auto" }}>
      <style>{`
        .mm-card { background: var(--hq-surface); border: none; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05); }
        @media (prefers-color-scheme: dark) { .mm-card { box-shadow: 0 4px 16px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.25); } }
        .mm-lanc-row { display: flex; align-items: center; gap: 10px; padding: 12px 16px; transition: background 0.15s; }
        .mm-lanc-row:hover { background: var(--hq-surface-hover); }
        .mm-lanc-row:hover .mm-actions { opacity: 1; }
        .mm-actions { opacity: 0; transition: opacity 0.15s; display: flex; gap: 2px; }
        .mm-seg-btn { padding: 6px 14px; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.15s; }
        .mm-quick-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 8px; border: none; border-radius: 14px; cursor: pointer; transition: all 0.15s; min-width: 72px; }
        .mm-quick-btn:hover { transform: translateY(-2px); }
        .mm-tipo-btn { display: flex; align-items: center; gap: 8px; padding: 14px 18px; border: none; border-radius: 14px; cursor: pointer; transition: all 0.15s; flex: 1; }
        .mm-tipo-btn:hover { transform: translateY(-1px); }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em", margin: 0 }}>Lançamentos</h1>
      </div>

      {/* Quick action buttons - main CTAs */}
      {!showForm && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button className="mm-tipo-btn" onClick={() => openNew("despesa")} style={{
              background: "#FF3B3012", color: "#FF3B30",
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "#FF3B3020", display: "grid", placeItems: "center" }}>
                <ArrowDownRight size={16} />
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Despesa</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>Gasto, conta</div>
              </div>
            </button>
            <button className="mm-tipo-btn" onClick={() => openNew("receita")} style={{
              background: "#34C75912", color: "#34C759",
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "#34C75920", display: "grid", placeItems: "center" }}>
                <ArrowUpRight size={16} />
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Receita</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>Salário, extra</div>
              </div>
            </button>
          </div>

          {/* Quick presets */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
            {PRESETS.map((p) => (
              <button key={p.label} className="mm-quick-btn" onClick={() => openWithPreset(p)} style={{
                background: TIPO_COLORS[p.tipo] + "0A",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: TIPO_COLORS[p.tipo] + "18",
                  display: "grid", placeItems: "center", fontSize: 16,
                }}>
                  {p.icon}
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, color: colors.text }}>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mm-card" style={{
          padding: 20, marginBottom: 20,
          borderLeft: `3px solid ${TIPO_COLORS[tipo]}`,
        }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Header with tipo indicator */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: TIPO_COLORS[tipo] + "20",
                  display: "grid", placeItems: "center",
                  color: TIPO_COLORS[tipo],
                }}>
                  <TipoIcon size={16} />
                </div>
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  {editingId ? "Editar" : "Nova"} {TIPO_LABELS[tipo].toLowerCase()}
                </span>
              </div>
              <button type="button" onClick={resetForm} style={iconBtn}><X size={18} /></button>
            </div>

            {/* Type selector */}
            <div style={{ display: "flex", background: "var(--hq-inlay-bg, var(--hq-bg))", borderRadius: 12, padding: 3, gap: 2 }}>
              {(Object.keys(TIPO_LABELS) as LancamentoTipo[]).map((t) => (
                <button key={t} type="button" onClick={() => setTipo(t)} className="mm-seg-btn" style={{
                  flex: 1, background: tipo === t ? TIPO_COLORS[t] : "transparent",
                  color: tipo === t ? "#fff" : colors.textSecondary, fontWeight: tipo === t ? 600 : 400,
                }}>
                  {TIPO_LABELS[t]}
                </button>
              ))}
            </div>

            {/* Main fields - description + value side by side */}
            <div style={{ display: "flex", gap: 8 }}>
              <input autoFocus required placeholder="O que foi?" value={descricao}
                onChange={(e) => setDescricao(e.target.value)} style={{ ...inputStyle, flex: 1, fontSize: 15, padding: "12px 14px" }} />
              <div style={{ position: "relative", width: 150 }}>
                <span style={{
                  position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  fontSize: 14, color: colors.textMuted, fontWeight: 500,
                }}>R$</span>
                <input type="number" step="0.01" required placeholder="0,00" value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 36, fontSize: 16, fontWeight: 600, padding: "12px 14px 12px 36px", fontVariantNumeric: "tabular-nums" }} />
              </div>
            </div>

            {/* Date + Conta */}
            <div style={{ display: "flex", gap: 8 }}>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              <select required value={contaId} onChange={(e) => setContaId(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                <option value="">Conta *</option>
                {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            {/* Categoria + Pago toggle */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                <option value="">Sem categoria</option>
                {catsFiltradas.map((c) => <option key={c.id} value={c.id}>{c.icone ?? "📂"} {c.nome}</option>)}
              </select>
              <button type="button" onClick={() => setPago(!pago)} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "10px 14px",
                borderRadius: 10, border: "none", cursor: "pointer",
                background: pago ? "#34C75918" : "var(--hq-inlay-bg, var(--hq-bg))",
                color: pago ? "#34C759" : colors.textSecondary,
                fontWeight: 600, fontSize: 13, whiteSpace: "nowrap",
                transition: "all 0.15s",
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 5,
                  background: pago ? "#34C759" : "transparent",
                  border: pago ? "none" : `1.5px solid ${colors.border}`,
                  display: "grid", placeItems: "center",
                }}>
                  {pago && <Check size={11} color="#fff" strokeWidth={3} />}
                </div>
                {pago ? "Pago" : "A pagar"}
              </button>
            </div>

            {/* Recorrência toggle */}
            {!editingId && tipo !== "transferencia" && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button type="button" onClick={() => setRecorrente(!recorrente)} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                  borderRadius: 10, border: "none", cursor: "pointer",
                  background: recorrente ? "#5856D618" : "var(--hq-inlay-bg, var(--hq-bg))",
                  color: recorrente ? "#5856D6" : colors.textSecondary,
                  fontWeight: 600, fontSize: 13, transition: "all 0.15s",
                }}>
                  <RefreshCw size={14} />
                  Recorrente
                </button>
                {recorrente && (
                  <select value={frequencia} onChange={(e) => setFrequencia(e.target.value as RecorrenciaFrequencia)} style={{
                    ...inputStyle, width: "auto", flex: 1,
                    borderColor: "#5856D640",
                  }}>
                    <option value="diaria">Diária</option>
                    <option value="semanal">Semanal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="mensal">Mensal</option>
                    <option value="bimestral">Bimestral</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>
                )}
              </div>
            )}

            {/* More fields toggle */}
            {!showMore && (
              <button type="button" onClick={() => setShowMore(true)} style={{
                background: "none", border: "none", color: "#007AFF",
                fontSize: 12, fontWeight: 500, cursor: "pointer", padding: 0,
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <Plus size={12} /> Mais opções
              </button>
            )}

            {showMore && (
              <>
                <input placeholder="Observação (opcional)" value={observacao}
                  onChange={(e) => setObservacao(e.target.value)} style={inputStyle} />
                <select value={tarefaId} onChange={(e) => setTarefaId(e.target.value)} style={inputStyle}>
                  <option value="">Vincular tarefa (opcional)</option>
                  {tarefas.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </>
            )}

            {/* Submit */}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" style={{
                ...primaryBtn,
                background: TIPO_COLORS[tipo] + "18",
                color: TIPO_COLORS[tipo],
                padding: "10px 20px", fontSize: 14,
              }}>
                {editingId ? "Salvar" : "Registrar"}
              </button>
              <button type="button" onClick={resetForm} style={ghostBtn}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 16 }}>
        <button onClick={() => setMes((m) => shiftMes(m, -1))} style={navBtn}><ChevronLeft size={16} /></button>
        <span style={{ fontSize: 15, fontWeight: 600, textTransform: "capitalize", minWidth: 170, textAlign: "center" }}>
          {formatMes(mes)}
        </span>
        <button onClick={() => setMes((m) => shiftMes(m, 1))} style={navBtn}><ChevronRight size={16} /></button>
      </div>

      {/* Summary stats */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", justifyContent: "center" }}>
        <StatDot color="#34C759" label="Receitas" value={fmt(totalReceitas)} />
        <StatDot color="#FF3B30" label="Despesas" value={fmt(totalDespesas)} />
        <span style={{ fontSize: 14, fontWeight: 600, color: colors.textMuted, margin: "0 4px" }}>=</span>
        <span style={{
          fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums",
          color: totalReceitas - totalDespesas >= 0 ? "#34C759" : "#FF3B30",
        }}>
          {fmt(totalReceitas - totalDespesas)}
        </span>
      </div>

      {/* Filters row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{
          display: "flex", background: colors.surface, borderRadius: 12, padding: 2, gap: 2,
          border: `1px solid ${colors.border}`,
        }}>
          {([["", "Todos"], ["receita", "Receitas"], ["despesa", "Despesas"]] as const).map(([val, label]) => (
            <button key={val} onClick={() => setFiltroTipo(val as string)} className="mm-seg-btn" style={{
              background: filtroTipo === val ? "#007AFF" : "transparent",
              color: filtroTipo === val ? "#fff" : colors.textSecondary,
              fontWeight: filtroTipo === val ? 600 : 400,
            }}>
              {label}
            </button>
          ))}
        </div>

        <select value={filtroConta} onChange={(e) => setFiltroConta(e.target.value)} style={selectStyle}>
          <option value="">Todas as contas</option>
          {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} style={selectStyle}>
          <option value="">Todas categorias</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.icone ?? "📂"} {c.nome}</option>)}
        </select>

        <div style={{ position: "relative", flex: 1, minWidth: 140 }}>
          <Search size={14} color={colors.textMuted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..."
            style={{ ...inputStyle, paddingLeft: 30, height: 34, fontSize: 12, borderRadius: 10, border: "none", background: colors.surface }} />
        </div>
      </div>

      {/* Transaction list grouped by date */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2].map((i) => <div key={i} className="mm-card" style={{ height: 120 }} />)}
        </div>
      ) : grouped.length === 0 ? (
        <div className="mm-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Nenhum lançamento em {formatMes(mes)}</div>
          <div style={{ fontSize: 13, color: colors.textMuted }}>Use os botões acima para registrar</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {grouped.map(([dateStr, items]) => {
            const d = new Date(dateStr + "T12:00:00");
            const dayLabel = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
            const weekday = d.toLocaleDateString("pt-BR", { weekday: "short" });
            const dayTotal = items.reduce((s: number, l: any) =>
              s + (l.tipo === "receita" ? Number(l.valor) : -Number(l.valor)), 0);

            return (
              <div key={dateStr}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{dayLabel}</span>
                    <span style={{ fontSize: 10, color: colors.textMuted, textTransform: "capitalize" }}>{weekday}</span>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums",
                    color: dayTotal >= 0 ? "#34C759" : "#FF3B30",
                  }}>
                    {dayTotal >= 0 ? "+" : ""}{fmt(dayTotal)}
                  </span>
                </div>
                <div className="mm-card" style={{ overflow: "hidden" }}>
                  {items.map((l: any, i: number) => (
                    <LancRow key={l.id} l={l} isLast={i === items.length - 1}
                      onEdit={() => startEdit(l)} onDelete={() => handleDelete(l.id)} onTogglePago={() => togglePago(l)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatDot({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ width: 8, height: 8, borderRadius: 4, background: color }} />
      <span style={{ fontSize: 12, color: colors.textMuted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", color }}>{value}</span>
    </div>
  );
}

function LancRow({ l, isLast, onEdit, onDelete, onTogglePago }: { l: any; isLast: boolean; onEdit: () => void; onDelete: () => void; onTogglePago: () => void }) {
  const isReceita = l.tipo === "receita";
  const sign = isReceita ? "+" : l.tipo === "despesa" ? "-" : "";
  const catCor = l.categoria?.cor ?? "#8E8E93";

  return (
    <div className="mm-lanc-row" style={{ borderBottom: isLast ? "none" : `1px solid ${colors.border}` }}>
      <button onClick={onTogglePago} style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
        background: l.pago ? TIPO_COLORS[l.tipo as LancamentoTipo] + "18" : "transparent",
        border: l.pago ? `1.5px solid ${TIPO_COLORS[l.tipo as LancamentoTipo]}` : `1.5px solid ${colors.border}`,
        display: "grid", placeItems: "center", cursor: "pointer",
        color: TIPO_COLORS[l.tipo as LancamentoTipo],
      }}>
        {l.pago && <Check size={12} strokeWidth={3} />}
      </button>

      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: catCor + "1A",
        display: "grid", placeItems: "center", flexShrink: 0, position: "relative",
      }}>
        <span style={{ fontSize: 16 }}>{l.categoria?.icone || "📂"}</span>
        <div style={{
          position: "absolute", bottom: 2, right: 2,
          width: 10, height: 10, borderRadius: 3, background: catCor,
        }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {l.descricao}
        </div>
        <div style={{ fontSize: 11, color: colors.textMuted, display: "flex", gap: 6, marginTop: 1 }}>
          {l.categoria && <span>{l.categoria.nome}</span>}
          {l.conta && <span>· {l.conta.nome}</span>}
        </div>
      </div>

      <div style={{
        fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums", flexShrink: 0,
        color: isReceita ? "#34C759" : colors.text,
      }}>
        {sign}{fmt(Number(l.valor))}
      </div>

      <div className="mm-actions">
        <button onClick={onEdit} style={iconBtn}><Pencil size={13} /></button>
        <button onClick={onDelete} style={{ ...iconBtn, color: "#FF3B30" }}><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--hq-inlay-bg, var(--hq-bg))", border: `1px solid ${colors.border}`, color: colors.text,
  padding: "10px 12px", borderRadius: 10, fontSize: 14, width: "100%", boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  background: colors.surface, border: `1px solid ${colors.border}`, color: colors.text,
  padding: "7px 10px", borderRadius: 10, fontSize: 12, cursor: "pointer",
};

const primaryBtn: React.CSSProperties = {
  background: "rgba(0,122,255,0.1)", color: "#007AFF", border: "none",
  padding: "8px 16px", borderRadius: 10, cursor: "pointer",
  fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6,
};

const ghostBtn: React.CSSProperties = {
  background: "transparent", color: colors.textSecondary, border: `1px solid ${colors.border}`,
  padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontSize: 13,
};

const iconBtn: React.CSSProperties = {
  background: "transparent", border: "none", color: colors.textSecondary,
  cursor: "pointer", padding: 4, borderRadius: 6, display: "flex", alignItems: "center",
};

const navBtn: React.CSSProperties = {
  background: colors.surface, border: `1px solid ${colors.border}`,
  width: 32, height: 32, borderRadius: 10, cursor: "pointer",
  display: "grid", placeItems: "center", color: colors.text,
};
