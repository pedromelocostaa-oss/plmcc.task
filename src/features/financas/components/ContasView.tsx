import { useState } from "react";
import { Plus, Trash2, Pencil, X, Check } from "lucide-react";
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

const TIPO_ICONS: Record<ContaTipo, string> = {
  conta_corrente: "🏦",
  poupanca: "🐷",
  dinheiro: "💵",
  investimento: "📈",
  cartao_credito: "💳",
};

const CONTA_COLORS = ["#0A84FF", "#30D158", "#FF9500", "#FF375F", "#BF5AF2", "#5856D6", "#FF6B35", "#64D2FF"];

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
    setEditingId(c.id);
    setNome(c.nome);
    setTipo(c.tipo);
    setSaldoInicial(String(c.saldo_inicial));
    setCor(c.cor ?? CONTA_COLORS[0]);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    try {
      if (editingId) {
        await updateConta.mutateAsync({
          id: editingId,
          data: { nome: nome.trim(), tipo, saldo_inicial: Number(saldoInicial) || 0, cor },
        });
        toast.success("Conta atualizada");
      } else {
        await createConta.mutateAsync({
          nome: nome.trim(), tipo, saldo_inicial: Number(saldoInicial) || 0, cor,
        });
        toast.success("Conta criada");
      }
      resetForm();
    } catch {
      toast.error("Erro ao salvar conta");
    }
  }

  async function handleDelete(id: string, nome: string) {
    try {
      await deleteConta.mutateAsync(id);
      toast.success(`"${nome}" desativada`);
    } catch {
      toast.error("Erro ao desativar conta");
    }
  }

  const saldoTotal = contas.reduce((sum, c) => sum + Number(c.saldo_inicial), 0);

  return (
    <div style={{ padding: 32, maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Contas</h1>
          <p style={{ color: colors.textSecondary, fontSize: 13, margin: "4px 0 0" }}>
            {contas.length} conta{contas.length !== 1 ? "s" : ""} ativa{contas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={accentBtn}>
          <Plus size={14} /> Nova conta
        </button>
      </div>

      {/* Saldo total */}
      <div style={{
        background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg,
        padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Saldo inicial total</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {formatCurrency(saldoTotal)}
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{
          background: colors.surface, border: `1px solid ${colors.accent}`, borderRadius: radius.md,
          padding: 20, marginBottom: 20, display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{editingId ? "Editar conta" : "Nova conta"}</span>
            <button type="button" onClick={resetForm} style={iconBtn}><X size={16} /></button>
          </div>
          <input
            autoFocus required placeholder="Nome da conta" value={nome}
            onChange={(e) => setNome(e.target.value)} style={inputStyle}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as ContaTipo)} style={{ ...inputStyle, flex: 1 }}>
              {(Object.keys(TIPO_LABELS) as ContaTipo[]).map((t) => (
                <option key={t} value={t}>{TIPO_ICONS[t]} {TIPO_LABELS[t]}</option>
              ))}
            </select>
            <input
              type="number" step="0.01" placeholder="Saldo inicial" value={saldoInicial}
              onChange={(e) => setSaldoInicial(e.target.value)} style={{ ...inputStyle, width: 150 }}
            />
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: colors.textMuted }}>Cor:</span>
            {CONTA_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setCor(c)} style={{
                width: 22, height: 22, borderRadius: 11, background: c, cursor: "pointer",
                border: cor === c ? "2px solid var(--hq-text)" : "2px solid transparent",
              }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" style={accentBtn}>{editingId ? "Salvar" : "Criar"}</button>
            <button type="button" onClick={resetForm} style={ghostBtn}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Lista */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 64, background: colors.surface, borderRadius: radius.md }} />
          ))}
        </div>
      ) : contas.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: colors.textMuted }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏦</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Nenhuma conta cadastrada</div>
          <div style={{ fontSize: 13 }}>Crie sua primeira conta para começar a controlar suas finanças</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {contas.map((c) => (
            <ContaCard key={c.id} conta={c} onEdit={() => startEdit(c)} onDelete={() => handleDelete(c.id, c.nome)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ContaCard({ conta, onEdit, onDelete }: { conta: Conta; onEdit: () => void; onDelete: () => void }) {
  const [hov, setHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? colors.surfaceHover : colors.surface,
        border: `1px solid ${colors.border}`, borderRadius: radius.md,
        padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
        transition: "background 0.15s",
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: (conta.cor ?? "#0A84FF") + "18",
        display: "grid", placeItems: "center", fontSize: 20, flexShrink: 0,
      }}>
        {TIPO_ICONS[conta.tipo]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{conta.nome}</div>
        <div style={{ fontSize: 12, color: colors.textSecondary }}>{TIPO_LABELS[conta.tipo]}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {formatCurrency(Number(conta.saldo_inicial))}
        </div>
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

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
