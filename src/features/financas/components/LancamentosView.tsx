import { useState } from "react";
import { Plus, Trash2, Pencil, X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";
import {
  useLancamentos, useCreateLancamento, useUpdateLancamento, useDeleteLancamento,
  useContas, useCategorias,
} from "../lib/queries";
import type { LancamentoTipo } from "../lib/types";
import { colors, radius } from "@/lib/tokens";

const TIPO_LABELS: Record<LancamentoTipo, string> = {
  receita: "Receita",
  despesa: "Despesa",
  transferencia: "Transferência",
};

const TIPO_COLORS: Record<LancamentoTipo, string> = {
  receita: "#30D158",
  despesa: "#FF375F",
  transferencia: "#0A84FF",
};

function getMesAtual() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 7);
}

function formatMes(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function shiftMes(mes: string, delta: number) {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmt(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function today() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function LancamentosView() {
  const { data: contas = [] } = useContas();
  const { data: categorias = [] } = useCategorias();
  const createLanc = useCreateLancamento();
  const updateLanc = useUpdateLancamento();
  const deleteLanc = useDeleteLancamento();

  const [mes, setMes] = useState(getMesAtual);
  const [filtroConta, setFiltroConta] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  const filters: Record<string, unknown> = { mes };
  if (filtroConta) filters.conta_id = filtroConta;
  if (filtroCategoria) filters.categoria_id = filtroCategoria;
  if (filtroTipo) filters.tipo = filtroTipo;

  const { data: lancamentos = [], isLoading } = useLancamentos(filters as any);

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

  function resetForm() {
    setDescricao(""); setValor(""); setTipo("despesa"); setData(today());
    setContaId(""); setCategoriaId(""); setPago(true); setObservacao("");
    setShowForm(false); setEditingId(null);
  }

  function startEdit(l: any) {
    setEditingId(l.id);
    setDescricao(l.descricao);
    setValor(String(l.valor));
    setTipo(l.tipo);
    setData(l.data);
    setContaId(l.conta_id);
    setCategoriaId(l.categoria_id ?? "");
    setPago(l.pago);
    setObservacao(l.observacao ?? "");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao.trim() || !valor || !contaId) {
      toast.error("Preencha descrição, valor e conta");
      return;
    }
    try {
      if (editingId) {
        await updateLanc.mutateAsync({
          id: editingId,
          data: {
            descricao: descricao.trim(), valor: Number(valor), tipo, data,
            conta_id: contaId, categoria_id: categoriaId || null, pago, observacao: observacao || null,
          },
        });
        toast.success("Lançamento atualizado");
      } else {
        await createLanc.mutateAsync({
          descricao: descricao.trim(), valor: Number(valor), tipo, data,
          conta_id: contaId, categoria_id: categoriaId || null, pago, observacao: observacao || null,
          data_pagamento: pago ? data : null, conta_destino_id: null, fatura_id: null,
          parcela_atual: null, parcela_total: null, compra_pai_id: null, recorrencia_id: null, tarefa_id: null,
        });
        toast.success("Lançamento criado");
      }
      resetForm();
    } catch {
      toast.error("Erro ao salvar lançamento");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteLanc.mutateAsync(id);
      toast.success("Lançamento excluído");
    } catch {
      toast.error("Erro ao excluir lançamento");
    }
  }

  async function togglePago(l: any) {
    try {
      await updateLanc.mutateAsync({
        id: l.id,
        data: { pago: !l.pago, data_pagamento: !l.pago ? today() : null },
      });
    } catch {
      toast.error("Erro ao atualizar");
    }
  }

  const totalReceitas = lancamentos.filter((l: any) => l.tipo === "receita").reduce((s: number, l: any) => s + Number(l.valor), 0);
  const totalDespesas = lancamentos.filter((l: any) => l.tipo === "despesa").reduce((s: number, l: any) => s + Number(l.valor), 0);

  const catsFiltradas = categorias.filter((c) => tipo === "transferencia" ? true : c.tipo === tipo);

  return (
    <div style={{ padding: 32, maxWidth: 800, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Lançamentos</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={accentBtn}>
          <Plus size={14} /> Novo lançamento
        </button>
      </div>

      {/* Seletor de mês */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 16,
      }}>
        <button onClick={() => setMes((m) => shiftMes(m, -1))} style={iconBtn}><ChevronLeft size={18} /></button>
        <span style={{ fontSize: 15, fontWeight: 600, textTransform: "capitalize", minWidth: 160, textAlign: "center" }}>
          {formatMes(mes)}
        </span>
        <button onClick={() => setMes((m) => shiftMes(m, 1))} style={iconBtn}><ChevronRight size={18} /></button>
      </div>

      {/* Resumo do mês */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <MiniStat label="Receitas" value={fmt(totalReceitas)} color="#30D158" />
        <MiniStat label="Despesas" value={fmt(totalDespesas)} color="#FF375F" />
        <MiniStat label="Saldo" value={fmt(totalReceitas - totalDespesas)} color={totalReceitas - totalDespesas >= 0 ? "#30D158" : "#FF375F"} />
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={{ ...selectStyle, minWidth: 120 }}>
          <option value="">Todos os tipos</option>
          <option value="receita">Receitas</option>
          <option value="despesa">Despesas</option>
          <option value="transferencia">Transferências</option>
        </select>
        <select value={filtroConta} onChange={(e) => setFiltroConta(e.target.value)} style={{ ...selectStyle, minWidth: 140 }}>
          <option value="">Todas as contas</option>
          {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} style={{ ...selectStyle, minWidth: 140 }}>
          <option value="">Todas as categorias</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.icone ?? "📂"} {c.nome}</option>)}
        </select>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{
          background: colors.surface, border: `1px solid ${colors.accent}`, borderRadius: radius.md,
          padding: 20, marginBottom: 20, display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{editingId ? "Editar lançamento" : "Novo lançamento"}</span>
            <button type="button" onClick={resetForm} style={iconBtn}><X size={16} /></button>
          </div>

          {/* Tipo chips */}
          <div style={{ display: "flex", gap: 6 }}>
            {(Object.keys(TIPO_LABELS) as LancamentoTipo[]).map((t) => (
              <button key={t} type="button" onClick={() => setTipo(t)} style={{
                ...chipStyle,
                background: tipo === t ? TIPO_COLORS[t] : colors.surface,
                color: tipo === t ? "#fff" : colors.textSecondary,
                border: tipo === t ? "none" : `1px solid ${colors.border}`,
              }}>
                {TIPO_LABELS[t]}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input autoFocus required placeholder="Descrição" value={descricao}
              onChange={(e) => setDescricao(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            <input type="number" step="0.01" required placeholder="Valor" value={valor}
              onChange={(e) => setValor(e.target.value)} style={{ ...inputStyle, width: 130 }} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            <select required value={contaId} onChange={(e) => setContaId(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="">Conta *</option>
              {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="">Sem categoria</option>
              {catsFiltradas.map((c) => <option key={c.id} value={c.id}>{c.icone ?? "📂"} {c.nome}</option>)}
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
              <input type="checkbox" checked={pago} onChange={(e) => setPago(e.target.checked)} />
              Pago
            </label>
          </div>

          <input placeholder="Observação (opcional)" value={observacao}
            onChange={(e) => setObservacao(e.target.value)} style={inputStyle} />

          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" style={accentBtn}>{editingId ? "Salvar" : "Criar"}</button>
            <button type="button" onClick={resetForm} style={ghostBtn}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Lista */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 56, background: colors.surface, borderRadius: radius.md }} />
          ))}
        </div>
      ) : lancamentos.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: colors.textMuted }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Nenhum lançamento em {formatMes(mes)}</div>
          <div style={{ fontSize: 13 }}>Crie seu primeiro lançamento para começar o controle</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {lancamentos.map((l: any) => (
            <LancRow key={l.id} l={l} onEdit={() => startEdit(l)} onDelete={() => handleDelete(l.id)} onTogglePago={() => togglePago(l)} />
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      flex: 1, minWidth: 120, background: colors.surface, border: `1px solid ${colors.border}`,
      borderRadius: radius.sm, padding: "10px 14px",
    }}>
      <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function LancRow({ l, onEdit, onDelete, onTogglePago }: { l: any; onEdit: () => void; onDelete: () => void; onTogglePago: () => void }) {
  const [hov, setHov] = useState(false);
  const isReceita = l.tipo === "receita";
  const sign = isReceita ? "+" : l.tipo === "despesa" ? "-" : "";

  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? colors.surfaceHover : colors.surface,
        border: `1px solid ${colors.border}`, borderRadius: radius.sm,
        padding: "12px 14px", display: "flex", alignItems: "center", gap: 10,
        transition: "background 0.15s",
      }}
    >
      {/* Pago toggle */}
      <button onClick={onTogglePago} style={{
        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
        background: l.pago ? TIPO_COLORS[l.tipo as LancamentoTipo] + "18" : "transparent",
        border: l.pago ? `1.5px solid ${TIPO_COLORS[l.tipo as LancamentoTipo]}` : `1.5px solid ${colors.border}`,
        display: "grid", placeItems: "center", cursor: "pointer",
        color: TIPO_COLORS[l.tipo as LancamentoTipo],
      }}>
        {l.pago && <Check size={13} strokeWidth={3} />}
      </button>

      {/* Categoria icon */}
      {l.categoria && (
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: (l.categoria.cor ?? "#8E8E93") + "18",
          display: "grid", placeItems: "center", fontSize: 14, flexShrink: 0,
        }}>
          {l.categoria.icone || "📂"}
        </div>
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {l.descricao}
        </div>
        <div style={{ fontSize: 11, color: colors.textMuted, display: "flex", gap: 8 }}>
          <span>{new Date(l.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
          {l.conta && <span>{l.conta.nome}</span>}
          {l.categoria && <span>{l.categoria.nome}</span>}
        </div>
      </div>

      {/* Valor */}
      <div style={{
        fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums", flexShrink: 0,
        color: TIPO_COLORS[l.tipo as LancamentoTipo],
      }}>
        {sign}{fmt(Number(l.valor))}
      </div>

      {/* Actions */}
      {hov && (
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={onEdit} style={iconBtn}><Pencil size={14} /></button>
          <button onClick={onDelete} style={{ ...iconBtn, color: colors.danger }}><Trash2 size={14} /></button>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text,
  padding: "9px 12px", borderRadius: radius.sm, fontSize: 13, width: "100%", boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  background: colors.surface, border: `1px solid ${colors.border}`, color: colors.text,
  padding: "7px 10px", borderRadius: radius.sm, fontSize: 12, cursor: "pointer",
};

const accentBtn: React.CSSProperties = {
  background: colors.accent, color: "#fff", border: "none",
  padding: "8px 14px", borderRadius: radius.sm, cursor: "pointer",
  fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6,
};

const ghostBtn: React.CSSProperties = {
  background: "transparent", color: colors.textSecondary, border: `1px solid ${colors.border}`,
  padding: "7px 14px", borderRadius: radius.sm, cursor: "pointer", fontSize: 13,
};

const iconBtn: React.CSSProperties = {
  background: "transparent", border: "none", color: colors.textSecondary,
  cursor: "pointer", padding: 4, borderRadius: 6, display: "flex", alignItems: "center",
};

const chipStyle: React.CSSProperties = {
  padding: "6px 14px", borderRadius: 99, cursor: "pointer",
  fontSize: 12, fontWeight: 600, transition: "all 0.15s",
};
