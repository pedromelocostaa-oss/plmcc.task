import { useState } from "react";
import { Plus, Trash2, Pencil, X, CreditCard, ChevronDown, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";
import { useCartoes, useCreateCartao, useUpdateCartao, useDeleteCartao, useContas, useFaturas, useUpdateFatura } from "../lib/queries";
import type { Cartao, Conta, Fatura } from "../lib/types";
import { colors } from "@/lib/tokens";

const BANDEIRAS = ["Visa", "Mastercard", "Elo", "Amex", "Hipercard", "Outra"];

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export function CartoesView() {
  const { data: cartoes = [], isLoading } = useCartoes();
  const { data: contas = [] } = useContas();
  const createCartao = useCreateCartao();
  const updateCartao = useUpdateCartao();
  const deleteCartao = useDeleteCartao();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [contaId, setContaId] = useState("");
  const [limite, setLimite] = useState("");
  const [diaFech, setDiaFech] = useState("25");
  const [diaVenc, setDiaVenc] = useState("5");
  const [bandeira, setBandeira] = useState("Visa");
  const [digitos, setDigitos] = useState("");

  function resetForm() {
    setContaId(""); setLimite(""); setDiaFech("25"); setDiaVenc("5");
    setBandeira("Visa"); setDigitos(""); setShowForm(false); setEditingId(null);
  }

  function startEdit(c: Cartao & { conta: Conta }) {
    setEditingId(c.id); setContaId(c.conta_id);
    setLimite(c.limite ? String(c.limite) : "");
    setDiaFech(String(c.dia_fechamento)); setDiaVenc(String(c.dia_vencimento));
    setBandeira(c.bandeira ?? "Visa"); setDigitos(c.ultimos_digitos ?? "");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contaId) { toast.error("Selecione uma conta"); return; }
    try {
      if (editingId) {
        await updateCartao.mutateAsync({
          id: editingId,
          data: { limite: Number(limite) || undefined, dia_fechamento: Number(diaFech), dia_vencimento: Number(diaVenc), bandeira, ultimos_digitos: digitos || undefined },
        });
        toast.success("Cartão atualizado");
      } else {
        await createCartao.mutateAsync({
          conta_id: contaId, limite: Number(limite) || undefined,
          dia_fechamento: Number(diaFech), dia_vencimento: Number(diaVenc),
          bandeira, ultimos_digitos: digitos || undefined,
        });
        toast.success("Cartão criado");
      }
      resetForm();
    } catch { toast.error("Erro ao salvar cartão"); }
  }

  async function handleDelete(id: string) {
    try { await deleteCartao.mutateAsync(id); toast.success("Cartão excluído"); }
    catch { toast.error("Erro ao excluir"); }
  }

  return (
    <div style={{ padding: "24px 16px 80px", maxWidth: 800, margin: "0 auto" }}>
      <style>{`
        .mm-card { background: var(--hq-surface); border: none; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05); }
        @media (prefers-color-scheme: dark) { .mm-card { box-shadow: 0 4px 16px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.25); } }
        .mm-card:hover .mm-actions { opacity: 1; }
        .mm-actions { opacity: 0; transition: opacity 0.15s; display: flex; gap: 4px; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em", margin: 0 }}>Cartões</h1>
          <p style={{ color: colors.textMuted, fontSize: 12, margin: "4px 0 0" }}>{cartoes.length} cartão(ões)</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={primaryBtn}><Plus size={14} /> Novo</button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mm-card" style={{ padding: 20, marginBottom: 20, border: `1px solid #AF52DE40` }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{editingId ? "Editar cartão" : "Novo cartão"}</span>
              <button type="button" onClick={resetForm} style={iconBtn}><X size={16} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 8 }}>
              <select required value={contaId} onChange={(e) => setContaId(e.target.value)} style={inputStyle}>
                <option value="">Conta vinculada *</option>
                {(contas.filter((c) => c.tipo === "cartao_credito").length > 0
                  ? contas.filter((c) => c.tipo === "cartao_credito")
                  : contas
                ).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <select value={bandeira} onChange={(e) => setBandeira(e.target.value)} style={inputStyle}>
                {BANDEIRAS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 8 }}>
              <input type="number" step="0.01" placeholder="Limite" value={limite}
                onChange={(e) => setLimite(e.target.value)} style={inputStyle} />
              <input placeholder="4 últimos" maxLength={4} value={digitos}
                onChange={(e) => setDigitos(e.target.value.replace(/\D/g, ""))} style={inputStyle} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, color: colors.textMuted, display: "block", marginBottom: 4 }}>Dia fechamento</label>
                <input type="number" min={1} max={31} value={diaFech}
                  onChange={(e) => setDiaFech(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: colors.textMuted, display: "block", marginBottom: 4 }}>Dia vencimento</label>
                <input type="number" min={1} max={31} value={diaVenc}
                  onChange={(e) => setDiaVenc(e.target.value)} style={inputStyle} />
              </div>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {[1, 2].map((i) => <div key={i} className="mm-card" style={{ height: 140 }} />)}
        </div>
      ) : cartoes.length === 0 ? (
        <div className="mm-card" style={{ textAlign: "center", padding: "48px 24px", borderStyle: "dashed", border: `2px dashed ${colors.border}` }}>
          <CreditCard size={30} color={colors.textMuted} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Nenhum cartão cadastrado</div>
          <div style={{ fontSize: 13, color: colors.textMuted }}>Adicione seus cartões para controlar faturas</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {cartoes.map((c) => (
            <CartaoCard key={c.id} cartao={c} onEdit={() => startEdit(c)} onDelete={() => handleDelete(c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function CartaoCard({ cartao, onEdit, onDelete }: { cartao: Cartao & { conta: Conta }; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const { data: faturas = [] } = useFaturas(expanded ? cartao.id : undefined);
  const updateFatura = useUpdateFatura();

  async function toggleFaturaPaga(f: Fatura) {
    try {
      await updateFatura.mutateAsync({
        id: f.id,
        data: { paga: !f.paga, data_pagamento: !f.paga ? new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }) : null },
      });
    } catch { toast.error("Erro ao atualizar fatura"); }
  }

  return (
    <div className="mm-card" style={{ overflow: "hidden" }}>
      <div style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            background: "linear-gradient(135deg, #5856D6, #AF52DE)",
            display: "grid", placeItems: "center", flexShrink: 0,
          }}>
            <CreditCard size={18} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {cartao.bandeira ?? "Cartão"} {cartao.ultimos_digitos ? `•••• ${cartao.ultimos_digitos}` : ""}
            </div>
            <div style={{ fontSize: 11, color: colors.textMuted }}>{cartao.conta.nome}</div>
          </div>
          <div className="mm-actions">
            <button onClick={onEdit} style={iconBtn}><Pencil size={13} /></button>
            <button onClick={onDelete} style={{ ...iconBtn, color: "#FF3B30" }}><Trash2 size={13} /></button>
          </div>
        </div>

        {/* Details */}
        <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
          {cartao.limite && (
            <div>
              <div style={{ color: colors.textMuted, fontSize: 11, marginBottom: 2 }}>Limite</div>
              <div style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt(Number(cartao.limite))}</div>
            </div>
          )}
          <div>
            <div style={{ color: colors.textMuted, fontSize: 11, marginBottom: 2 }}>Fechamento</div>
            <div style={{ fontWeight: 600 }}>Dia {cartao.dia_fechamento}</div>
          </div>
          <div>
            <div style={{ color: colors.textMuted, fontSize: 11, marginBottom: 2 }}>Vencimento</div>
            <div style={{ fontWeight: 600 }}>Dia {cartao.dia_vencimento}</div>
          </div>
        </div>
      </div>

      {/* Faturas toggle */}
      <button onClick={() => setExpanded(!expanded)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 20px", background: "rgba(0,0,0,0.03)", border: "none",
        borderTop: `1px solid ${colors.border}`, cursor: "pointer", color: colors.textSecondary, fontSize: 12, fontWeight: 500,
      }}>
        Faturas ({faturas.length})
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {expanded && faturas.length > 0 && (
        <div style={{ padding: "8px 16px 14px" }}>
          {faturas.map((f) => (
            <div key={f.id} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 4px",
              borderBottom: `1px solid ${colors.border}`, fontSize: 13,
            }}>
              <button onClick={() => toggleFaturaPaga(f)} style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0, cursor: "pointer",
                background: f.paga ? "#34C75918" : "transparent",
                border: f.paga ? "1.5px solid #34C759" : `1.5px solid ${colors.border}`,
                display: "grid", placeItems: "center", color: "#34C759",
              }}>
                {f.paga && <Check size={11} strokeWidth={3} />}
              </button>
              <span style={{ flex: 1 }}>{f.mes_referencia}</span>
              <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt(Number(f.valor_total))}</span>
              <span style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 600,
                background: f.paga ? "#34C75918" : "#FF3B3018",
                color: f.paga ? "#34C759" : "#FF3B30",
              }}>
                {f.paga ? "Paga" : "Aberta"}
              </span>
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
