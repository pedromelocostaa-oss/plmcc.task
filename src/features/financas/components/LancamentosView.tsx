import { useState, useMemo } from "react";
import { Plus, Trash2, Pencil, X, ChevronLeft, ChevronRight, Check, Search } from "lucide-react";
import { toast } from "sonner";
import {
  useLancamentos, useCreateLancamento, useUpdateLancamento, useDeleteLancamento,
  useContas, useCategorias,
} from "../lib/queries";
import type { LancamentoTipo } from "../lib/types";
import { colors, radius } from "@/lib/tokens";
import { useAllTasks } from "@/lib/queries";

const TIPO_LABELS: Record<LancamentoTipo, string> = { receita: "Receita", despesa: "Despesa", transferencia: "Transferência" };
const TIPO_COLORS: Record<LancamentoTipo, string> = { receita: "#34C759", despesa: "#FF3B30", transferencia: "#007AFF" };

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

  // Group by date
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

  function resetForm() {
    setDescricao(""); setValor(""); setTipo("despesa"); setData(today());
    setContaId(""); setCategoriaId(""); setPago(true); setObservacao(""); setTarefaId("");
    setShowForm(false); setEditingId(null);
  }

  function startEdit(l: any) {
    setEditingId(l.id); setDescricao(l.descricao); setValor(String(l.valor));
    setTipo(l.tipo); setData(l.data); setContaId(l.conta_id);
    setCategoriaId(l.categoria_id ?? ""); setPago(l.pago);
    setObservacao(l.observacao ?? ""); setTarefaId(l.tarefa_id ?? "");
    setShowForm(true);
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
        toast.success("Lançamento criado");
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
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em", margin: 0 }}>Lançamentos</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={primaryBtn}>
          <Plus size={14} /> Novo
        </button>
      </div>

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
        {/* Type segmented control */}
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

        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 140 }}>
          <Search size={14} color={colors.textMuted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..."
            style={{ ...inputStyle, paddingLeft: 30, height: 34, fontSize: 12, borderRadius: 10, border: "none", background: colors.surface }} />
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mm-card" style={{ padding: 20, marginBottom: 20, border: `1px solid #007AFF40` }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{editingId ? "Editar lançamento" : "Novo lançamento"}</span>
              <button type="button" onClick={resetForm} style={iconBtn}><X size={16} /></button>
            </div>

            {/* Type segmented */}
            <div style={{ display: "flex", background: colors.bg, borderRadius: 12, padding: 3, gap: 2 }}>
              {(Object.keys(TIPO_LABELS) as LancamentoTipo[]).map((t) => (
                <button key={t} type="button" onClick={() => setTipo(t)} className="mm-seg-btn" style={{
                  flex: 1, background: tipo === t ? TIPO_COLORS[t] : "transparent",
                  color: tipo === t ? "#fff" : colors.textSecondary, fontWeight: tipo === t ? 600 : 400,
                }}>
                  {TIPO_LABELS[t]}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 8 }}>
              <input autoFocus required placeholder="Descrição" value={descricao}
                onChange={(e) => setDescricao(e.target.value)} style={inputStyle} />
              <input type="number" step="0.01" required placeholder="Valor" value={valor}
                onChange={(e) => setValor(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={inputStyle} />
              <select required value={contaId} onChange={(e) => setContaId(e.target.value)} style={inputStyle}>
                <option value="">Conta *</option>
                {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
              <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} style={inputStyle}>
                <option value="">Sem categoria</option>
                {catsFiltradas.map((c) => <option key={c.id} value={c.id}>{c.icone ?? "📂"} {c.nome}</option>)}
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", padding: "0 8px" }}>
                <input type="checkbox" checked={pago} onChange={(e) => setPago(e.target.checked)} /> Pago
              </label>
            </div>

            <input placeholder="Observação (opcional)" value={observacao}
              onChange={(e) => setObservacao(e.target.value)} style={inputStyle} />

            <select value={tarefaId} onChange={(e) => setTarefaId(e.target.value)} style={inputStyle}>
              <option value="">Vincular tarefa (opcional)</option>
              {tarefas.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" style={primaryBtn}>{editingId ? "Salvar" : "Criar"}</button>
              <button type="button" onClick={resetForm} style={ghostBtn}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Transaction list grouped by date */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2].map((i) => <div key={i} className="mm-card" style={{ height: 120 }} />)}
        </div>
      ) : grouped.length === 0 ? (
        <div className="mm-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Nenhum lançamento em {formatMes(mes)}</div>
          <div style={{ fontSize: 13, color: colors.textMuted }}>Crie seu primeiro lançamento para começar</div>
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
      {/* Pago toggle */}
      <button onClick={onTogglePago} style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
        background: l.pago ? TIPO_COLORS[l.tipo as LancamentoTipo] + "18" : "transparent",
        border: l.pago ? `1.5px solid ${TIPO_COLORS[l.tipo as LancamentoTipo]}` : `1.5px solid ${colors.border}`,
        display: "grid", placeItems: "center", cursor: "pointer",
        color: TIPO_COLORS[l.tipo as LancamentoTipo],
      }}>
        {l.pago && <Check size={12} strokeWidth={3} />}
      </button>

      {/* Category icon box */}
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

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {l.descricao}
        </div>
        <div style={{ fontSize: 11, color: colors.textMuted, display: "flex", gap: 6, marginTop: 1 }}>
          {l.categoria && <span>{l.categoria.nome}</span>}
          {l.conta && <span>· {l.conta.nome}</span>}
        </div>
      </div>

      {/* Value */}
      <div style={{
        fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums", flexShrink: 0,
        color: isReceita ? "#34C759" : colors.text,
      }}>
        {sign}{fmt(Number(l.valor))}
      </div>

      {/* Actions */}
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
