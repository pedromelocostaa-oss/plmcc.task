import { useState } from "react";
import { Plus, Trash2, Pencil, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  useRecorrencias, useCreateRecorrencia, useUpdateRecorrencia, useDeleteRecorrencia,
  useContas, useCategorias,
} from "../lib/queries";
import type { RecorrenciaFrequencia, CategoriaTipo } from "../lib/types";
import { colors } from "@/lib/tokens";

const FREQ_LABELS: Record<RecorrenciaFrequencia, string> = {
  diaria: "Diária", semanal: "Semanal", quinzenal: "Quinzenal", mensal: "Mensal",
  bimestral: "Bimestral", trimestral: "Trimestral", semestral: "Semestral", anual: "Anual",
};

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

function today() { return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); }

export function RecorrenciasView() {
  const { data: recorrencias = [], isLoading } = useRecorrencias();
  const { data: contas = [] } = useContas();
  const { data: categorias = [] } = useCategorias();
  const createRec = useCreateRecorrencia();
  const updateRec = useUpdateRecorrencia();
  const deleteRec = useDeleteRecorrencia();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState<"receita" | "despesa">("despesa");
  const [frequencia, setFrequencia] = useState<RecorrenciaFrequencia>("mensal");
  const [diaMes, setDiaMes] = useState("");
  const [contaId, setContaId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [dataInicio, setDataInicio] = useState(today());
  const [dataFim, setDataFim] = useState("");
  const [gerarPago, setGerarPago] = useState(false);

  function resetForm() {
    setDescricao(""); setValor(""); setTipo("despesa"); setFrequencia("mensal");
    setDiaMes(""); setContaId(""); setCategoriaId(""); setDataInicio(today());
    setDataFim(""); setGerarPago(false);
    setShowForm(false); setEditingId(null);
  }

  function startEdit(r: any) {
    setEditingId(r.id); setDescricao(r.descricao); setValor(String(r.valor));
    setTipo(r.tipo); setFrequencia(r.frequencia);
    setDiaMes(r.dia_do_mes ? String(r.dia_do_mes) : "");
    setContaId(r.conta_id); setCategoriaId(r.categoria_id ?? "");
    setDataInicio(r.data_inicio); setDataFim(r.data_fim ?? "");
    setGerarPago(r.gerar_como_pago); setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao.trim() || !valor || !contaId) {
      toast.error("Preencha descrição, valor e conta");
      return;
    }
    try {
      if (editingId) {
        await updateRec.mutateAsync({
          id: editingId,
          data: {
            descricao: descricao.trim(), valor: Number(valor), tipo, frequencia,
            dia_do_mes: diaMes ? Number(diaMes) : null,
            conta_id: contaId, categoria_id: categoriaId || null,
            data_inicio: dataInicio, data_fim: dataFim || null,
            gerar_como_pago: gerarPago,
          },
        });
        toast.success("Recorrência atualizada");
      } else {
        await createRec.mutateAsync({
          descricao: descricao.trim(), valor: Number(valor), tipo, frequencia,
          dia_do_mes: diaMes ? Number(diaMes) : undefined,
          conta_id: contaId, categoria_id: categoriaId || undefined,
          data_inicio: dataInicio, data_fim: dataFim || undefined,
          gerar_como_pago: gerarPago,
        });
        toast.success("Recorrência criada");
      }
      resetForm();
    } catch { toast.error("Erro ao salvar recorrência"); }
  }

  async function handleDelete(id: string) {
    try { await deleteRec.mutateAsync(id); toast.success("Recorrência desativada"); }
    catch { toast.error("Erro ao desativar"); }
  }

  const totalMensal = recorrencias
    .filter((r: any) => r.tipo === "despesa")
    .reduce((s: number, r: any) => s + Number(r.valor), 0);

  const catsFiltradas = categorias.filter((c) => c.tipo === tipo);

  return (
    <div style={{ padding: "24px 16px 80px", maxWidth: 800, margin: "0 auto" }}>
      <style>{`
        .mm-card { background: var(--hq-surface); border: none; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05); }
        @media (prefers-color-scheme: dark) { .mm-card { box-shadow: 0 4px 16px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.25); } }
        .mm-rec-row { display: flex; align-items: center; gap: 12px; padding: 14px 18px; transition: background 0.15s; }
        .mm-rec-row:hover { background: var(--hq-surface-hover); }
        .mm-rec-row:hover .mm-actions { opacity: 1; }
        .mm-actions { opacity: 0; transition: opacity 0.15s; display: flex; gap: 4px; }
        .mm-seg-btn { padding: 6px 14px; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.15s; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em", margin: 0 }}>Recorrências</h1>
          <p style={{ color: colors.textMuted, fontSize: 12, margin: "4px 0 0" }}>
            {recorrencias.length} ativa{recorrencias.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={primaryBtn}><Plus size={14} /> Nova</button>
      </div>

      {/* Summary card */}
      {recorrencias.length > 0 && (
        <div className="mm-card" style={{ padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 14,
            background: "rgba(88,86,214,0.1)",
            display: "grid", placeItems: "center",
          }}>
            <RefreshCw size={20} color="#5856D6" />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.textMuted }}>
              Despesas recorrentes
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums", color: "#FF3B30" }}>
              {fmt(totalMensal)}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mm-card" style={{ padding: 20, marginBottom: 20, border: `1px solid #5856D640` }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{editingId ? "Editar recorrência" : "Nova recorrência"}</span>
              <button type="button" onClick={resetForm} style={iconBtn}><X size={16} /></button>
            </div>

            {/* Tipo toggle */}
            <div style={{ display: "flex", background: colors.bg, borderRadius: 12, padding: 3, gap: 2 }}>
              {(["despesa", "receita"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTipo(t)} className="mm-seg-btn" style={{
                  flex: 1,
                  background: tipo === t ? (t === "despesa" ? "#FF3B30" : "#34C759") : "transparent",
                  color: tipo === t ? "#fff" : colors.textSecondary,
                  fontWeight: tipo === t ? 600 : 400,
                }}>
                  {t === "receita" ? "Receita" : "Despesa"}
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
              <select value={frequencia} onChange={(e) => setFrequencia(e.target.value as RecorrenciaFrequencia)} style={{ ...inputStyle, flex: 1 }}>
                {(Object.keys(FREQ_LABELS) as RecorrenciaFrequencia[]).map((f) => (
                  <option key={f} value={f}>{FREQ_LABELS[f]}</option>
                ))}
              </select>
              <input type="number" min={1} max={31} placeholder="Dia do mês" value={diaMes}
                onChange={(e) => setDiaMes(e.target.value)} style={{ ...inputStyle, width: 120 }} />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <select required value={contaId} onChange={(e) => setContaId(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                <option value="">Conta *</option>
                {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                <option value="">Categoria</option>
                {catsFiltradas.map((c) => <option key={c.id} value={c.id}>{c.icone ?? "📂"} {c.nome}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: colors.textMuted, display: "block", marginBottom: 4 }}>Início</label>
                <input type="date" required value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: colors.textMuted, display: "block", marginBottom: 4 }}>Fim (opcional)</label>
                <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={gerarPago} onChange={(e) => setGerarPago(e.target.checked)} />
              Gerar lançamentos já como pagos
            </label>

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" style={primaryBtn}>{editingId ? "Salvar" : "Criar"}</button>
              <button type="button" onClick={resetForm} style={ghostBtn}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map((i) => <div key={i} className="mm-card" style={{ height: 60 }} />)}
        </div>
      ) : recorrencias.length === 0 ? (
        <div className="mm-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(88,86,214,0.1)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
            <RefreshCw size={26} color="#5856D6" style={{ opacity: 0.3 }} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Nenhuma recorrência ativa</div>
          <div style={{ fontSize: 13, color: colors.textMuted }}>Cadastre contas fixas como aluguel, salário, assinaturas</div>
        </div>
      ) : (
        <div className="mm-card" style={{ overflow: "hidden" }}>
          {recorrencias.map((r: any, i: number) => (
            <div key={r.id} className="mm-rec-row" style={{
              borderBottom: i < recorrencias.length - 1 ? `1px solid ${colors.border}` : "none",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: r.tipo === "receita" ? "#34C75918" : "#FF3B3018",
                display: "grid", placeItems: "center", flexShrink: 0,
              }}>
                <RefreshCw size={16} color={r.tipo === "receita" ? "#34C759" : "#FF3B30"} />
              </div>

              {r.categoria && (
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: (r.categoria.cor ?? "#8E8E93") + "1A",
                  display: "grid", placeItems: "center", fontSize: 13, flexShrink: 0,
                }}>
                  {r.categoria.icone || "📂"}
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{r.descricao}</div>
                <div style={{ fontSize: 11, color: colors.textMuted, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span>{FREQ_LABELS[r.frequencia as RecorrenciaFrequencia]}</span>
                  {r.dia_do_mes && <span>dia {r.dia_do_mes}</span>}
                  <span>{r.conta.nome}</span>
                  <span>Próx: {new Date(r.proxima_geracao + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                </div>
              </div>

              <div style={{
                fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums", flexShrink: 0,
                color: r.tipo === "receita" ? "#34C759" : "#FF3B30",
              }}>
                {r.tipo === "receita" ? "+" : "-"}{fmt(Number(r.valor))}
              </div>

              <div className="mm-actions">
                <button onClick={() => startEdit(r)} style={iconBtn}><Pencil size={14} /></button>
                <button onClick={() => handleDelete(r.id)} style={{ ...iconBtn, color: "#FF3B30" }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--hq-inlay-bg, var(--hq-bg))", border: `1px solid ${colors.border}`, color: colors.text,
  padding: "10px 12px", borderRadius: 10, fontSize: 14, width: "100%", boxSizing: "border-box",
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
  cursor: "pointer", padding: 6, borderRadius: 8, display: "flex", alignItems: "center",
};
