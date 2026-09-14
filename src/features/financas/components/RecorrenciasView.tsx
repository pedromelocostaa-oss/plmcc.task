import { useState } from "react";
import { Plus, Trash2, Pencil, X, RefreshCw, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import {
  useRecorrencias, useCreateRecorrencia, useUpdateRecorrencia, useDeleteRecorrencia,
  useContas, useCategorias,
} from "../lib/queries";
import type { RecorrenciaFrequencia, CategoriaTipo } from "../lib/types";
import { colors, radius } from "@/lib/tokens";

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
    setEditingId(r.id);
    setDescricao(r.descricao);
    setValor(String(r.valor));
    setTipo(r.tipo);
    setFrequencia(r.frequencia);
    setDiaMes(r.dia_do_mes ? String(r.dia_do_mes) : "");
    setContaId(r.conta_id);
    setCategoriaId(r.categoria_id ?? "");
    setDataInicio(r.data_inicio);
    setDataFim(r.data_fim ?? "");
    setGerarPago(r.gerar_como_pago);
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
    } catch {
      toast.error("Erro ao salvar recorrência");
    }
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
    <div style={{ padding: 32, maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Recorrências</h1>
          <p style={{ color: colors.textSecondary, fontSize: 13, margin: "4px 0 0" }}>
            {recorrencias.length} ativa{recorrencias.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={accentBtn}><Plus size={14} /> Nova recorrência</button>
      </div>

      {/* Resumo */}
      {recorrencias.length > 0 && (
        <div style={{
          background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md,
          padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 11, color: colors.textMuted }}>Despesas recorrentes</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#FF375F", fontVariantNumeric: "tabular-nums" }}>{fmt(totalMensal)}</div>
          </div>
          <RefreshCw size={20} color={colors.textMuted} />
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{
          background: colors.surface, border: `1px solid ${colors.accent}`, borderRadius: radius.md,
          padding: 20, marginBottom: 20, display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{editingId ? "Editar recorrência" : "Nova recorrência"}</span>
            <button type="button" onClick={resetForm} style={iconBtn}><X size={16} /></button>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            {(["despesa", "receita"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTipo(t)} style={{
                ...chipStyle,
                background: tipo === t ? (t === "receita" ? "#30D158" : "#FF375F") : colors.surface,
                color: tipo === t ? "#fff" : colors.textSecondary,
                border: tipo === t ? "none" : `1px solid ${colors.border}`,
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
              <label style={{ fontSize: 11, color: colors.textMuted }}>Início</label>
              <input type="date" required value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: colors.textMuted }}>Fim (opcional)</label>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={gerarPago} onChange={(e) => setGerarPago(e.target.checked)} />
            Gerar lançamentos já como pagos
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" style={accentBtn}>{editingId ? "Salvar" : "Criar"}</button>
            <button type="button" onClick={resetForm} style={ghostBtn}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Lista */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map((i) => <div key={i} style={{ height: 60, background: colors.surface, borderRadius: radius.md }} />)}
        </div>
      ) : recorrencias.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: colors.textMuted }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔄</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Nenhuma recorrência ativa</div>
          <div style={{ fontSize: 13 }}>Cadastre contas fixas como aluguel, salário, assinaturas</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recorrencias.map((r: any) => (
            <RecRow key={r.id} rec={r} onEdit={() => startEdit(r)} onDelete={() => handleDelete(r.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function RecRow({ rec, onEdit, onDelete }: { rec: any; onEdit: () => void; onDelete: () => void }) {
  const [hov, setHov] = useState(false);
  const isReceita = rec.tipo === "receita";

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
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: isReceita ? "#30D15818" : "#FF375F18",
        display: "grid", placeItems: "center", flexShrink: 0,
      }}>
        <RefreshCw size={14} color={isReceita ? "#30D158" : "#FF375F"} />
      </div>

      {rec.categoria && (
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: (rec.categoria.cor ?? "#8E8E93") + "18",
          display: "grid", placeItems: "center", fontSize: 12, flexShrink: 0,
        }}>
          {rec.categoria.icone || "📂"}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{rec.descricao}</div>
        <div style={{ fontSize: 11, color: colors.textMuted, display: "flex", gap: 8 }}>
          <span>{FREQ_LABELS[rec.frequencia as RecorrenciaFrequencia]}</span>
          {rec.dia_do_mes && <span>dia {rec.dia_do_mes}</span>}
          <span>{rec.conta.nome}</span>
          <span>Próx: {new Date(rec.proxima_geracao + "T12:00:00").toLocaleDateString("pt-BR")}</span>
        </div>
      </div>

      <div style={{
        fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums", flexShrink: 0,
        color: isReceita ? "#30D158" : "#FF375F",
      }}>
        {isReceita ? "+" : "-"}{fmt(Number(rec.valor))}
      </div>

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
