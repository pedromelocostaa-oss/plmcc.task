import { useState } from "react";
import { Plus, Trash2, Pencil, X, CreditCard, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useCartoes, useCreateCartao, useUpdateCartao, useDeleteCartao, useContas, useFaturas, useUpdateFatura } from "../lib/queries";
import type { Cartao, Conta, Fatura } from "../lib/types";
import { colors, radius } from "@/lib/tokens";

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
    setBandeira("Visa"); setDigitos("");
    setShowForm(false); setEditingId(null);
  }

  function startEdit(c: Cartao & { conta: Conta }) {
    setEditingId(c.id);
    setContaId(c.conta_id);
    setLimite(c.limite ? String(c.limite) : "");
    setDiaFech(String(c.dia_fechamento));
    setDiaVenc(String(c.dia_vencimento));
    setBandeira(c.bandeira ?? "Visa");
    setDigitos(c.ultimos_digitos ?? "");
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
    } catch {
      toast.error("Erro ao salvar cartão");
    }
  }

  async function handleDelete(id: string) {
    try { await deleteCartao.mutateAsync(id); toast.success("Cartão excluído"); }
    catch { toast.error("Erro ao excluir"); }
  }

  return (
    <div style={{ padding: 32, maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Cartões de crédito</h1>
          <p style={{ color: colors.textSecondary, fontSize: 13, margin: "4px 0 0" }}>{cartoes.length} cartão(ões)</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={accentBtn}><Plus size={14} /> Novo cartão</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{
          background: colors.surface, border: `1px solid ${colors.accent}`, borderRadius: radius.md,
          padding: 20, marginBottom: 20, display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{editingId ? "Editar cartão" : "Novo cartão"}</span>
            <button type="button" onClick={resetForm} style={iconBtn}><X size={16} /></button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <select required value={contaId} onChange={(e) => setContaId(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="">Conta vinculada *</option>
              {contas.filter((c) => c.tipo === "cartao_credito").length > 0
                ? contas.filter((c) => c.tipo === "cartao_credito").map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)
                : contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)
              }
            </select>
            <select value={bandeira} onChange={(e) => setBandeira(e.target.value)} style={{ ...inputStyle, width: 140 }}>
              {BANDEIRAS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="number" step="0.01" placeholder="Limite" value={limite}
              onChange={(e) => setLimite(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            <input placeholder="4 últimos dígitos" maxLength={4} value={digitos}
              onChange={(e) => setDigitos(e.target.value.replace(/\D/g, ""))} style={{ ...inputStyle, width: 140 }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: colors.textMuted }}>Dia fechamento</label>
              <input type="number" min={1} max={31} value={diaFech}
                onChange={(e) => setDiaFech(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: colors.textMuted }}>Dia vencimento</label>
              <input type="number" min={1} max={31} value={diaVenc}
                onChange={(e) => setDiaVenc(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" style={accentBtn}>{editingId ? "Salvar" : "Criar"}</button>
            <button type="button" onClick={resetForm} style={ghostBtn}>Cancelar</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2].map((i) => <div key={i} style={{ height: 100, background: colors.surface, borderRadius: radius.md }} />)}
        </div>
      ) : cartoes.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: colors.textMuted }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Nenhum cartão cadastrado</div>
          <div style={{ fontSize: 13 }}>Adicione seus cartões de crédito para controlar faturas</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
  const [hov, setHov] = useState(false);

  async function toggleFaturaPaga(f: Fatura) {
    try {
      await updateFatura.mutateAsync({
        id: f.id,
        data: { paga: !f.paga, data_pagamento: !f.paga ? new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }) : null },
      });
    } catch { toast.error("Erro ao atualizar fatura"); }
  }

  return (
    <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, overflow: "hidden" }}>
      <div
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}
      >
        <div style={{
          width: 48, height: 32, borderRadius: 6,
          background: "linear-gradient(135deg, #5856D6, #BF5AF2)",
          display: "grid", placeItems: "center", flexShrink: 0,
        }}>
          <CreditCard size={18} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {cartao.bandeira ?? "Cartão"} {cartao.ultimos_digitos ? `•••• ${cartao.ultimos_digitos}` : ""}
          </div>
          <div style={{ fontSize: 12, color: colors.textSecondary }}>
            {cartao.conta.nome} · Fecha dia {cartao.dia_fechamento} · Vence dia {cartao.dia_vencimento}
          </div>
        </div>
        {cartao.limite && (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: colors.textMuted }}>Limite</div>
            <div style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt(Number(cartao.limite))}</div>
          </div>
        )}
        {hov && (
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={onEdit} style={iconBtn}><Pencil size={14} /></button>
            <button onClick={onDelete} style={{ ...iconBtn, color: colors.danger }}><Trash2 size={14} /></button>
          </div>
        )}
        <button onClick={() => setExpanded(!expanded)} style={iconBtn}>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${colors.border}`, padding: "12px 18px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 8 }}>
            Faturas ({faturas.length})
          </div>
          {faturas.length === 0 ? (
            <div style={{ fontSize: 12, color: colors.textMuted, padding: "8px 0" }}>Nenhuma fatura registrada</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {faturas.map((f) => (
                <div key={f.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                  background: colors.bg, borderRadius: radius.sm, fontSize: 13,
                }}>
                  <button onClick={() => toggleFaturaPaga(f)} style={{
                    width: 20, height: 20, borderRadius: 4, flexShrink: 0, cursor: "pointer",
                    background: f.paga ? "#30D15818" : "transparent",
                    border: f.paga ? "1.5px solid #30D158" : `1.5px solid ${colors.border}`,
                    display: "grid", placeItems: "center", color: "#30D158",
                  }}>
                    {f.paga && "✓"}
                  </button>
                  <span style={{ flex: 1 }}>{f.mes_referencia}</span>
                  <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt(Number(f.valor_total))}</span>
                  <span style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 99,
                    background: f.paga ? "#30D15818" : "#FF375F18",
                    color: f.paga ? "#30D158" : "#FF375F",
                    fontWeight: 600,
                  }}>
                    {f.paga ? "Paga" : "Aberta"}
                  </span>
                </div>
              ))}
            </div>
          )}
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
