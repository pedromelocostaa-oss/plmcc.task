import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, X, Check, Eye, EyeOff, Landmark } from "lucide-react";
import { toast } from "sonner";
import { useContas, useCreateConta, useUpdateConta, useDeleteConta, useDashboardData } from "../lib/queries";
import { adjustedSaldoInicial, centsToReais, computeSaldoConta, parseMoneyInput, toCents } from "../lib/dashboard";
import { formatMoney } from "../lib/privacy";
import { useHideValues } from "../lib/use-hide-values";
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

export function ContasView() {
  const { data: todasContas = [], isLoading } = useContas();
  // Cartões de crédito vivem na aba Cartões; aqui ficam só as contas (bancos e caixa).
  const contas = todasContas.filter((c) => c.tipo !== "cartao_credito");
  const createConta = useCreateConta();
  const updateConta = useUpdateConta();
  const deleteConta = useDeleteConta();
  const { data: dash } = useDashboardData();
  const [hidden, toggleHidden] = useHideValues();
  const money = (cents: number) => formatMoney(cents, hidden);
  const saldos = useMemo(
    () => new Map(contas.map((c) => [c.id, computeSaldoConta(c, dash?.lancamentos ?? [])])),
    [contas, dash],
  );

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

  const saldoTotal = contas.reduce((sum, c) => sum + (saldos.get(c.id) ?? 0), 0);

  async function handleSaveSaldo(c: Conta, desejado: number): Promise<boolean> {
    const atual = saldos.get(c.id) ?? 0;
    const novoInicial = adjustedSaldoInicial(toCents(c.saldo_inicial), atual, desejado);
    try {
      await updateConta.mutateAsync({ id: c.id, data: { saldo_inicial: centsToReais(novoInicial) } });
      toast.success(`Saldo de "${c.nome}" atualizado`);
      return true;
    } catch {
      toast.error("Erro ao atualizar o saldo");
      return false;
    }
  }

  return (
    <div style={{ padding: "24px 16px 80px", maxWidth: 800, margin: "0 auto" }}>
      <style>{`
        .mm-card { background: var(--hq-surface); border: none; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05); }
        @media (prefers-color-scheme: dark) { .mm-card { box-shadow: 0 4px 16px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.25); } }
        .mm-row { display: flex; align-items: center; gap: 12px; padding: 14px 18px; transition: background 0.15s; cursor: default; }
        .mm-row:hover { background: var(--hq-surface-hover); }
        .mm-row:hover .mm-actions { opacity: 1; }
        .mm-actions { display: flex; gap: 4px; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em", margin: 0 }}>Contas</h1>
          <p style={{ color: colors.textMuted, fontSize: 12, margin: "4px 0 0" }}>
            {contas.length} conta{contas.length !== 1 ? "s" : ""} ativa{contas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button" onClick={toggleHidden} aria-pressed={hidden}
            aria-label={hidden ? "Mostrar valores" : "Ocultar valores"} title={hidden ? "Mostrar valores" : "Ocultar valores"}
            style={{ ...ghostBtn, padding: "8px 10px", display: "inline-flex", alignItems: "center" }}
          >
            {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }} style={primaryBtn}>
            <Plus size={14} /> Nova conta
          </button>
        </div>
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
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums" }}>{money(saldoTotal)}</div>
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
                {(Object.keys(TIPO_LABELS) as ContaTipo[]).filter((t) => t !== "cartao_credito").map((t) => (
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
            <ContaCard
              key={c.id} conta={c} saldoAtual={saldos.get(c.id) ?? 0} saldoInicial={toCents(c.saldo_inicial)}
              hidden={hidden} money={money}
              onEdit={() => startEdit(c)} onDelete={() => handleDelete(c.id, c.nome)}
              onSaveSaldo={(desejado) => handleSaveSaldo(c, desejado)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ContaCard({ conta, saldoAtual, saldoInicial, hidden, money, onEdit, onDelete, onSaveSaldo }: {
  conta: Conta; saldoAtual: number; saldoInicial: number; hidden: boolean; money: (c: number) => string;
  onEdit: () => void; onDelete: () => void; onSaveSaldo: (desejado: number) => Promise<boolean>;
}) {
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
          <button onClick={onEdit} aria-label={`Editar a conta ${conta.nome}`} title="Editar nome, tipo e cor" style={iconBtn}><Pencil size={14} /></button>
          <button onClick={onDelete} aria-label={`Desativar a conta ${conta.nome}`} title="Desativar conta" style={{ ...iconBtn, color: "#FF3B30" }}><Trash2 size={14} /></button>
        </div>
      </div>
      <SaldoEditavel
        nome={conta.nome} saldoAtual={saldoAtual} saldoInicial={saldoInicial}
        hidden={hidden} money={money} onSave={onSaveSaldo}
      />
    </div>
  );
}

// O valor da conta é o botão: clicou, edita. Salvar ajusta o saldo inicial para o saldo atual ficar no número digitado.
function SaldoEditavel({ nome, saldoAtual, saldoInicial, hidden, money, onSave }: {
  nome: string; saldoAtual: number; saldoInicial: number; hidden: boolean; money: (c: number) => string;
  onSave: (desejado: number) => Promise<boolean>;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function abrir() {
    // Com os valores ocultos, o campo abre vazio para não mostrar o saldo na tela.
    setTexto(hidden ? "" : (saldoAtual / 100).toFixed(2).replace(".", ","));
    setErro(null);
    setEditando(true);
  }

  async function salvar() {
    const centavos = parseMoneyInput(texto);
    if (centavos === null) {
      setErro("Digite um valor válido, por exemplo 1.234,56");
      return;
    }
    setSalvando(true);
    const ok = await onSave(centavos);
    setSalvando(false);
    if (ok) setEditando(false);
  }

  if (!editando) {
    return (
      <div>
        <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>Saldo atual</div>
        <button
          type="button" onClick={abrir}
          aria-label={`Editar o saldo de ${nome}`} title="Clique para ajustar o saldo"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer",
            background: "transparent", border: "none", padding: 0, color: "inherit", textAlign: "left",
          }}
        >
          <span style={{
            fontSize: 22, fontWeight: 700, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums",
            color: !hidden && saldoAtual < 0 ? "#FF3B30" : colors.text,
          }}>
            {money(saldoAtual)}
          </span>
          <Pencil size={14} color={colors.textMuted} />
        </button>
        {saldoInicial !== saldoAtual && (
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>Saldo inicial {money(saldoInicial)}</div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void salvar(); }}>
      <label htmlFor={`saldo-${nome}`} style={{ fontSize: 11, color: colors.textMuted, display: "block", marginBottom: 6 }}>
        Novo saldo atual
      </label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: colors.textMuted, fontSize: 14 }}>R$</span>
          <input
            id={`saldo-${nome}`} autoFocus inputMode="decimal" autoComplete="off" disabled={salvando}
            value={texto} placeholder="0,00"
            onChange={(e) => { setTexto(e.target.value); setErro(null); }}
            onKeyDown={(e) => { if (e.key === "Escape") setEditando(false); }}
            style={{ ...inputStyle, paddingLeft: 38 }}
          />
        </div>
        <button type="submit" disabled={salvando} aria-label="Salvar saldo" title="Salvar" style={{ ...primaryBtn, padding: "10px 12px" }}>
          <Check size={16} />
        </button>
        <button type="button" onClick={() => setEditando(false)} aria-label="Cancelar" title="Cancelar" style={{ ...ghostBtn, padding: "10px 12px" }}>
          <X size={16} />
        </button>
      </div>
      {erro && <div role="alert" style={{ color: "#FF3B30", fontSize: 12, marginTop: 6 }}>{erro}</div>}
    </form>
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
