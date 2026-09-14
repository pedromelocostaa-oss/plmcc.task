import { useState } from "react";
import { Plus, Trash2, Pencil, X, Landmark, User, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { useContas, useCreateConta, useUpdateConta, useDeleteConta } from "../lib/queries";
import type { Conta, ContaTipo } from "../lib/types";
import { colors, radius } from "@/lib/tokens";

const TIPO_LABELS: Record<ContaTipo, string> = {
  conta_corrente: "Conta corrente",
  poupanca: "Poupança",
  dinheiro: "Dinheiro",
  investimento: "Investimento",
  cartao_credito: "Cartão de crédito",
};

const CONTA_COLORS = ["#007AFF", "#34C759", "#FF9500", "#FF3B30", "#AF52DE", "#5856D6", "#FF6B35", "#5AC8FA"];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ContasView() {
  const { data: contas = [], isLoading } = useContas();
  const createConta = useCreateConta();
  const updateConta = useUpdateConta();
  const deleteConta = useDeleteConta();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<ContaTipo>("conta_corrente");
  const [saldoInicial, setSaldoInicial] = useState("");
  const [cor, setCor] = useState(CONTA_COLORS[0]);

  function resetForm() {
    setNome(""); setTipo("conta_corrente"); setSaldoInicial(""); setCor(CONTA_COLORS[0]);
    setShowForm(false); setEditingId(null);
  }

  function startEdit(c: Conta) {
    setEditingId(c.id); setNome(c.nome); setTipo(c.tipo);
    setSaldoInicial(String(c.saldo_inicial)); setCor(c.cor ?? CONTA_COLORS[0]);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    try {
      if (editingId) {
        await updateConta.mutateAsync({ id: editingId, data: { nome: nome.trim(), tipo, saldo_inicial: Number(saldoInicial) || 0, cor } });
        toast.success("Conta atualizada");
      } else {
        await createConta.mutateAsync({ nome: nome.trim(), tipo, saldo_inicial: Number(saldoInicial) || 0, cor });
        toast.success("Conta criada");
      }
      resetForm();
    } catch { toast.error("Erro ao salvar conta"); }
  }

  async function handleDelete(id: string, nome: string) {
    try { await deleteConta.mutateAsync(id); toast.success(`"${nome}" desativada`); }
    catch { toast.error("Erro ao desativar conta"); }
  }

  const saldoTotal = contas.reduce((sum, c) => sum + Number(c.saldo_inicial), 0);

  return (
    <div style={{ padding: "24px 16px 80px", maxWidth: 800, margin: "0 auto" }}>
      <style>{`
        .mm-card { background: var(--hq-surface); border: none; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05); }
        @media (prefers-color-scheme: dark) { .mm-card { box-shadow: 0 4px 16px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.25); } }
        .mm-row { display: flex; align-items: center; gap: 12px; padding: 14px 18px; transition: background 0.15s; cursor: default; }
        .mm-row:hover { background: var(--hq-surface-hover); }
        .mm-row:hover .mm-actions { opacity: 1; }
        .mm-actions { opacity: 0; transition: opacity 0.15s; display: flex; gap: 4px; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em", margin: 0 }}>Contas</h1>
          <p style={{ color: colors.textMuted, fontSize: 12, margin: "4px 0 0" }}>
            {contas.length} conta{contas.length !== 1 ? "s" : ""} ativa{contas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={primaryBtn}>
          <Plus size={14} /> Nova conta
        </button>
      </div>

      {/* Patrimônio total */}
      <div className="mm-card" style={{ padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 14,
          background: "rgba(0,122,255,0.1)",
          display: "grid", placeItems: "center",
        }}>
          <Landmark size={20} color="#007AFF" />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.textMuted }}>Patrimônio total</div>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums" }}>{fmt(saldoTotal)}</div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mm-card" style={{ padding: 20, marginBottom: 20, border: `1px solid #007AFF40` }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{editingId ? "Editar conta" : "Nova conta"}</span>
              <button type="button" onClick={resetForm} style={iconBtn}><X size={16} /></button>
            </div>
            <input autoFocus required placeholder="Nome da conta" value={nome}
              onChange={(e) => setNome(e.target.value)} style={inputStyle} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as ContaTipo)} style={{ ...inputStyle, flex: 1 }}>
                {(Object.keys(TIPO_LABELS) as ContaTipo[]).map((t) => (
                  <option key={t} value={t}>{TIPO_LABELS[t]}</option>
                ))}
              </select>
              <input type="number" step="0.01" placeholder="Saldo inicial" value={saldoInicial}
                onChange={(e) => setSaldoInicial(e.target.value)} style={{ ...inputStyle, width: 160 }} />
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: colors.textMuted }}>Cor:</span>
              {CONTA_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setCor(c)} style={{
                  width: 24, height: 24, borderRadius: 12, background: c, cursor: "pointer",
                  border: cor === c ? "2.5px solid var(--hq-text)" : "2.5px solid transparent",
                  transition: "border-color 0.15s",
                }} />
              ))}
            </div>
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
          {[1, 2, 3].map((i) => (
            <div key={i} className="mm-card" style={{ height: 72 }} />
          ))}
        </div>
      ) : contas.length === 0 ? (
        <div className="mm-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(0,122,255,0.1)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
            <Landmark size={26} color="#007AFF" style={{ opacity: 0.3 }} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Nenhuma conta cadastrada</div>
          <div style={{ fontSize: 13, color: colors.textMuted }}>Crie sua primeira conta para começar</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {contas.map((c) => (
            <ContaCard key={c.id} conta={c} onEdit={() => startEdit(c)} onDelete={() => handleDelete(c.id, c.nome)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ContaCard({ conta, onEdit, onDelete }: { conta: Conta; onEdit: () => void; onDelete: () => void }) {
  const contaCor = conta.cor ?? "#007AFF";
  return (
    <div className="mm-card" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 14,
            background: contaCor + "20",
            display: "grid", placeItems: "center",
          }}>
            <Landmark size={20} color={contaCor} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{conta.nome}</div>
            <div style={{ fontSize: 11, color: colors.textMuted }}>{TIPO_LABELS[conta.tipo]}</div>
          </div>
        </div>
        <div className="mm-actions">
          <button onClick={onEdit} style={iconBtn}><Pencil size={14} /></button>
          <button onClick={onDelete} style={{ ...iconBtn, color: "#FF3B30" }}><Trash2 size={14} /></button>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>Saldo atual</div>
        <div style={{
          fontSize: 22, fontWeight: 700, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums",
          color: Number(conta.saldo_inicial) < 0 ? "#FF3B30" : colors.text,
        }}>
          {fmt(Number(conta.saldo_inicial))}
        </div>
      </div>
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
