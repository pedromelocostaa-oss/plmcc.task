import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { AlertTriangle, ArrowLeft, Check, ChevronDown, ChevronUp, ClipboardPaste, CreditCard, Landmark, X } from "lucide-react";
import { toast } from "sonner";
import { useCartoes, useContas, useDashboardData, useImportarLote, type ResultadoImportacao } from "../lib/queries";
import { capitalizeFirst, formatCents, formatDateBR, isIsoDate, monthLabel, parseMoneyInput } from "../lib/dashboard";
import {
  CRITERIO_DUPLICIDADE, acharDuplicidades, datasDaFatura, errosDaLinha, faturaDaCompra, montarGravacao, parseLote,
  addMonthsKey, type CartaoConfig, type DestinoLote, type LinhaIgnorada, type LinhaLote, type LinhaPronta, type TipoLote,
} from "../lib/importar";
import { colors } from "@/lib/tokens";

const RED = "#FF3B30";
const ORANGE = "#FF9500";
const BLUE = "#007AFF";
const GREEN = "#34C759";

type Editavel = LinhaLote & { tipo: TipoLote; incluir: boolean; valorTexto: string; faturaMes: string };

const hojeBrasilia = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const centavosParaTexto = (c: number) => (c / 100).toFixed(2).replace(".", ",");

function opcoesDeFatura(hoje: string, cartao: CartaoConfig): { mes: string; rotulo: string }[] {
  const base = faturaDaCompra(hoje, cartao).mes;
  return [-1, 0, 1, 2, 3, 4].map((d) => {
    const mes = addMonthsKey(base, d);
    const venc = datasDaFatura(mes, cartao).vencimento;
    return { mes, rotulo: `${capitalizeFirst(monthLabel(mes))} · vence ${venc.slice(8, 10)}/${venc.slice(5, 7)}` };
  });
}

export function ImportarLote() {
  const { data: contas = [] } = useContas();
  const { data: cartoes = [] } = useCartoes();
  const { data: dash } = useDashboardData();
  const importar = useImportarLote();
  const hoje = useMemo(hojeBrasilia, []);

  const contasComuns = contas.filter((c) => c.tipo !== "cartao_credito");
  const [modoEscolhido, setModoEscolhido] = useState<"cartao" | "conta" | null>(null);
  const modo = modoEscolhido ?? (cartoes.length > 0 ? "cartao" : "conta");
  const [cartaoId, setCartaoId] = useState("");
  const [contaId, setContaId] = useState("");
  const [faturaLote, setFaturaLote] = useState("");
  const [pago, setPago] = useState(true);
  const [texto, setTexto] = useState("");
  const [etapa, setEtapa] = useState<"colar" | "previa">("colar");
  const [linhas, setLinhas] = useState<Editavel[]>([]);
  const [ignoradas, setIgnoradas] = useState<LinhaIgnorada[]>([]);
  const [verIgnoradas, setVerIgnoradas] = useState(false);
  const [sucesso, setSucesso] = useState<ResultadoImportacao | null>(null);

  const cartaoSel = cartoes.find((c) => c.id === cartaoId) ?? cartoes[0];
  const contaSel = contasComuns.find((c) => c.id === contaId) ?? contasComuns[0];
  const cartaoCfg: CartaoConfig | null = cartaoSel
    ? { id: cartaoSel.id, conta_id: cartaoSel.conta_id, dia_fechamento: cartaoSel.dia_fechamento, dia_vencimento: cartaoSel.dia_vencimento }
    : null;
  const opcoes = cartaoCfg ? opcoesDeFatura(hoje, cartaoCfg) : [];
  const faturaEfetiva = faturaLote || (cartaoCfg ? faturaDaCompra(hoje, cartaoCfg).mes : "auto");

  const destino: DestinoLote | null =
    modo === "cartao" && cartaoCfg
      ? { tipo: "cartao", cartao: cartaoCfg, faturaFixa: faturaEfetiva === "auto" ? null : faturaEfetiva }
      : modo === "conta" && contaSel
        ? { tipo: "conta", conta_id: contaSel.id, pago }
        : null;

  const existentes = useMemo(() => dash?.lancamentos ?? [], [dash]);

  function analisar() {
    const r = parseLote(texto, hoje);
    const dups = acharDuplicidades(r.linhas, existentes);
    setLinhas(r.linhas.map((l) => ({ ...l, tipo: "despesa", incluir: !dups.has(l.id), valorTexto: centavosParaTexto(l.valor), faturaMes: "" })));
    setIgnoradas(r.ignoradas);
    setVerIgnoradas(false);
    setSucesso(null);
    setEtapa("previa");
  }

  const atualizar = (id: string, patch: Partial<Editavel>) =>
    setLinhas((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const remover = (id: string) => setLinhas((ls) => ls.filter((l) => l.id !== id));

  // linhas com o valor já lido do campo de texto (o que a pessoa digitou manda)
  const atuais = useMemo(() => linhas.map((l) => ({ ...l, valor: parseMoneyInput(l.valorTexto) ?? 0 })), [linhas]);
  const duplicadas = useMemo(() => acharDuplicidades(atuais, existentes), [atuais, existentes]);
  const incluidas = atuais.filter((l) => l.incluir);
  const comErro = incluidas.filter((l) => errosDaLinha(l).length > 0);

  const prontas: LinhaPronta[] = incluidas.map((l) => ({ ...l, faturaMes: l.faturaMes || null }));
  const plano = useMemo(() => {
    if (!destino) return null;
    let n = 0;
    return montarGravacao(prontas, destino, () => `previa${++n}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incluidas.length, JSON.stringify(prontas.map((p) => [p.id, p.data, p.valor, p.parcelaAtual, p.parcelaTotal, p.tipo, p.faturaMes])), faturaEfetiva, modo, cartaoSel?.id, contaSel?.id, pago]);

  const podeGravar = !!plano && incluidas.length > 0 && comErro.length === 0 && !importar.isPending;

  async function gravar() {
    if (!destino) return;
    const real = montarGravacao(prontas, destino, () => crypto.randomUUID());
    try {
      const r = await importar.mutateAsync({ plano: real, cartaoId: destino.tipo === "cartao" ? destino.cartao.id : null });
      setSucesso(r);
      toast.success(`${r.lancamentos} lançamentos gravados`);
      setLinhas([]);
      setIgnoradas([]);
      setTexto("");
      setEtapa("colar");
    } catch {
      toast.error("Não foi possível gravar. Nada foi salvo; confira os dados e tente de novo.");
    }
  }

  return (
    <div style={{ padding: "24px 16px 80px", maxWidth: 1000, margin: "0 auto" }}>
      <style>{`
        .il-card { background: var(--hq-surface); border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05); }
        @media (prefers-color-scheme: dark) { .il-card { box-shadow: 0 4px 16px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.25); } }
        .il-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 10px 12px; border-radius: 12px; }
        .il-in { background: var(--hq-inlay-bg, var(--hq-bg)); border: 1px solid var(--hq-border); color: var(--hq-text); border-radius: 10px; padding: 8px 10px; font-size: 13px; box-sizing: border-box; }
      `}</style>

      <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em", margin: "0 0 4px" }}>Lançamentos em lote</h1>
      <p style={{ color: colors.textMuted, fontSize: 13, margin: "0 0 16px" }}>
        Cole uma lista de gastos, confira na prévia e grave tudo de uma vez.
      </p>

      {sucesso && (
        <div className="il-card" role="status" style={{ padding: 16, marginBottom: 16, borderLeft: `4px solid ${GREEN}` }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Gravado com sucesso</div>
          <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
            {sucesso.lancamentos} lançamentos, sendo {sucesso.parcelasFuturas} parcelas dos próximos meses
            {sucesso.faturas > 0 ? `, em ${sucesso.faturas} ${sucesso.faturas === 1 ? "fatura" : "faturas"}` : ""}.
          </div>
        </div>
      )}

      {/* Para onde vão */}
      <section className="il-card" style={{ padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
          Para onde vão
        </div>
        <div role="tablist" aria-label="Destino" style={{ display: "inline-flex", gap: 2, padding: 3, borderRadius: 11, background: colors.bg, marginBottom: 12 }}>
          <Seg ativo={modo === "cartao"} onClick={() => setModoEscolhido("cartao")} icone={<CreditCard size={14} />}>Cartão de crédito</Seg>
          <Seg ativo={modo === "conta"} onClick={() => setModoEscolhido("conta")} icone={<Landmark size={14} />}>Conta (à vista)</Seg>
        </div>

        {modo === "cartao" ? (
          cartoes.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: ORANGE }}>Nenhum cartão cadastrado. Crie um na aba Cartões ou escolha &quot;Conta (à vista)&quot;.</p>
          ) : (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Campo rotulo="Cartão">
                <select className="il-in" value={cartaoSel?.id ?? ""} onChange={(e) => { setCartaoId(e.target.value); setFaturaLote(""); }}>
                  {cartoes.map((c) => <option key={c.id} value={c.id}>{c.conta?.nome ?? "Cartão"}{c.ultimos_digitos ? ` ••${c.ultimos_digitos}` : ""}</option>)}
                </select>
              </Campo>
              <Campo rotulo="Fatura">
                <select className="il-in" value={faturaEfetiva} onChange={(e) => setFaturaLote(e.target.value)} aria-label="Fatura de destino">
                  {opcoes.map((o) => <option key={o.mes} value={o.mes}>{o.rotulo}</option>)}
                  <option value="auto">Automática (pela data de cada compra)</option>
                </select>
              </Campo>
            </div>
          )
        ) : contasComuns.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: ORANGE }}>Nenhuma conta cadastrada.</p>
        ) : (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <Campo rotulo="Conta">
              <select className="il-in" value={contaSel?.id ?? ""} onChange={(e) => setContaId(e.target.value)}>
                {contasComuns.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Campo>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, paddingBottom: 8 }}>
              <input type="checkbox" checked={pago} onChange={(e) => setPago(e.target.checked)} />
              Já foram pagas
            </label>
          </div>
        )}
        {modo === "cartao" && faturaEfetiva !== "auto" && (
          <p style={{ margin: "10px 0 0", fontSize: 11, color: colors.textMuted }}>
            Todas as compras entram nesta fatura (como numa fatura copiada do banco). As parcelas que faltam vão para as faturas seguintes.
          </p>
        )}
      </section>

      {etapa === "colar" && (
        <section className="il-card" style={{ padding: 16 }}>
          <label htmlFor="texto-lote" style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Cole a lista aqui
          </label>
          <textarea
            id="texto-lote" className="il-in" value={texto} onChange={(e) => setTexto(e.target.value)} rows={12}
            placeholder={"20/10  Uber  R$ 25,90\n18/10  Loja Alfa — parcela 1/3  R$ 120,00\n17/10  Posto  60,00"}
            style={{ width: "100%", marginTop: 8, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13, resize: "vertical" }}
          />
          <p style={{ fontSize: 12, color: colors.textMuted, margin: "8px 0 12px", lineHeight: 1.5 }}>
            Uma compra por linha: <b>data</b>, <b>descrição</b> e <b>valor</b>. Pode colar direto da tabela da fatura. Parcelas escritas como
            &quot;parcela 1/3&quot; ou &quot;(1/3)&quot; criam as parcelas dos meses seguintes. Linhas sem valor (títulos, totais) são ignoradas e
            listadas na prévia. Nada é gravado antes de você confirmar.
          </p>
          <button
            type="button" onClick={analisar} disabled={texto.trim() === "" || !destino}
            style={{ ...botaoPrimario, opacity: texto.trim() === "" || !destino ? 0.5 : 1, cursor: texto.trim() === "" || !destino ? "not-allowed" : "pointer" }}
          >
            <ClipboardPaste size={15} /> Analisar texto
          </button>
        </section>
      )}

      {etapa === "previa" && (
        <>
          {linhas.length === 0 ? (
            <section className="il-card" style={{ padding: 20, textAlign: "center" }}>
              <p style={{ margin: "0 0 12px", fontSize: 14 }}>Não encontrei nenhuma compra nesse texto.</p>
              {ignoradas.length > 0 && <ListaIgnoradas ignoradas={ignoradas} />}
              <button type="button" onClick={() => setEtapa("colar")} style={botaoSecundario}><ArrowLeft size={14} /> Voltar ao texto</button>
            </section>
          ) : (
            <>
              <Resumo
                total={incluidas.reduce((s, l) => s + l.valor, 0)} qtd={incluidas.length} totalLinhas={linhas.length}
                futuras={plano?.parcelasFuturas ?? 0} porFatura={plano?.porFatura ?? []} cartao={cartaoCfg} emCartao={modo === "cartao"}
                erros={comErro.length} duplicadas={atuais.filter((l) => l.incluir && duplicadas.has(l.id)).length}
              />

              <div className="il-card" style={{ padding: 8, marginBottom: 12 }}>
                {atuais.map((l) => {
                  const erros = errosDaLinha(l);
                  const dup = duplicadas.get(l.id);
                  const bg = erros.length ? "rgba(255,59,48,0.08)" : dup ? "rgba(255,149,0,0.10)" : "transparent";
                  const mesAuto = cartaoCfg ? faturaDaCompra(l.data, cartaoCfg).mes : "";
                  return (
                    <div key={l.id} className="il-row" style={{ background: bg, opacity: l.incluir ? 1 : 0.55 }}>
                      <input type="checkbox" checked={l.incluir} onChange={(e) => atualizar(l.id, { incluir: e.target.checked })} aria-label={`Incluir linha ${l.numero}`} />
                      <input
                        className="il-in" type="date" value={l.data} aria-label={`Data da linha ${l.numero}`} style={{ width: 138 }}
                        onChange={(e) => isIsoDate(e.target.value) && atualizar(l.id, { data: e.target.value, semData: false })}
                      />
                      <input
                        className="il-in" value={l.descricao} aria-label={`Descrição da linha ${l.numero}`} style={{ flex: "1 1 180px", minWidth: 140 }}
                        onChange={(e) => atualizar(l.id, { descricao: e.target.value })}
                      />
                      <div style={{ position: "relative", width: 112 }}>
                        <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: colors.textMuted }}>R$</span>
                        <input
                          className="il-in" inputMode="decimal" value={l.valorTexto} aria-label={`Valor da linha ${l.numero}`}
                          style={{ width: "100%", paddingLeft: 28, textAlign: "right" }}
                          onChange={(e) => atualizar(l.id, { valorTexto: e.target.value })}
                        />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: colors.textMuted }} title="Parcela atual e total">
                        <input
                          className="il-in" type="number" min={1} max={60} placeholder="—" value={l.parcelaAtual ?? ""} aria-label={`Parcela atual da linha ${l.numero}`} style={{ width: 52 }}
                          onChange={(e) => atualizar(l.id, { parcelaAtual: e.target.value === "" ? null : Number(e.target.value) })}
                        />
                        de
                        <input
                          className="il-in" type="number" min={1} max={60} placeholder="—" value={l.parcelaTotal ?? ""} aria-label={`Total de parcelas da linha ${l.numero}`} style={{ width: 52 }}
                          onChange={(e) => atualizar(l.id, { parcelaTotal: e.target.value === "" ? null : Number(e.target.value) })}
                        />
                      </div>
                      {modo === "conta" ? (
                        <select className="il-in" value={l.tipo} aria-label={`Tipo da linha ${l.numero}`} onChange={(e) => atualizar(l.id, { tipo: e.target.value as TipoLote })}>
                          <option value="despesa">Despesa</option>
                          <option value="receita">Receita</option>
                        </select>
                      ) : (
                        <select
                          className="il-in" value={l.faturaMes} aria-label={`Fatura da linha ${l.numero}`} style={{ maxWidth: 170 }}
                          onChange={(e) => atualizar(l.id, { faturaMes: e.target.value })}
                        >
                          <option value="">{faturaEfetiva === "auto" ? `Auto: ${monthLabel(mesAuto).split(" de ")[0]}` : "Fatura do lote"}</option>
                          {opcoes.map((o) => <option key={o.mes} value={o.mes}>{o.rotulo.split(" · ")[0]}</option>)}
                        </select>
                      )}
                      <button type="button" onClick={() => remover(l.id)} aria-label={`Remover linha ${l.numero}`} title="Remover esta linha" style={botaoIcone}>
                        <X size={15} />
                      </button>
                      {(erros.length > 0 || dup || l.avisos.length > 0) && (
                        <div style={{ flexBasis: "100%", display: "flex", gap: 6, flexWrap: "wrap", paddingLeft: 26 }}>
                          {erros.map((e) => <Chip key={e} cor={RED}>{e}</Chip>)}
                          {dup && <Chip cor={ORANGE}>{dup.motivo}{l.incluir ? "" : " — desmarcada"}</Chip>}
                          {l.avisos.map((a) => <Chip key={a} cor={colors.textMuted}>{a}</Chip>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {ignoradas.length > 0 && (
                <div className="il-card" style={{ padding: 12, marginBottom: 12 }}>
                  <button type="button" onClick={() => setVerIgnoradas((v) => !v)} style={{ ...botaoSecundario, border: "none", padding: 0, background: "transparent" }} aria-expanded={verIgnoradas}>
                    {verIgnoradas ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {ignoradas.length} {ignoradas.length === 1 ? "linha ignorada" : "linhas ignoradas"}
                  </button>
                  {verIgnoradas && <ListaIgnoradas ignoradas={ignoradas} />}
                </div>
              )}

              <p style={{ fontSize: 11, color: colors.textMuted, margin: "0 0 12px" }}>
                Como detecto duplicidade: {CRITERIO_DUPLICIDADE}. Linhas marcadas em laranja já vêm desmarcadas.
              </p>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button type="button" onClick={() => setEtapa("colar")} style={botaoSecundario}><ArrowLeft size={14} /> Voltar ao texto</button>
                <button
                  type="button" onClick={gravar} disabled={!podeGravar}
                  style={{ ...botaoPrimario, opacity: podeGravar ? 1 : 0.5, cursor: podeGravar ? "pointer" : "not-allowed" }}
                >
                  <Check size={15} />
                  {importar.isPending ? "Gravando…" : `Gravar ${incluidas.length} ${incluidas.length === 1 ? "lançamento" : "lançamentos"}${plano && plano.parcelasFuturas > 0 ? ` + ${plano.parcelasFuturas} parcelas futuras` : ""}`}
                </button>
                {comErro.length > 0 && (
                  <span role="alert" style={{ fontSize: 12, color: RED, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <AlertTriangle size={14} /> Corrija ou remova {comErro.length} {comErro.length === 1 ? "linha com erro" : "linhas com erro"} para gravar.
                  </span>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── pedaços ─────────────────────────────────────────────────────────────────

function Resumo({ total, qtd, totalLinhas, futuras, porFatura, cartao, emCartao, erros, duplicadas }: {
  total: number; qtd: number; totalLinhas: number; futuras: number;
  porFatura: { mes: string; quantidade: number; total: number }[]; cartao: CartaoConfig | null; emCartao: boolean;
  erros: number; duplicadas: number;
}) {
  return (
    <section className="il-card" style={{ padding: 16, marginBottom: 12 }} aria-label="Resumo da importação">
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "baseline" }}>
        <div>
          <div style={{ fontSize: 11, color: colors.textMuted }}>Total das {qtd} linhas incluídas</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatCents(total)}</div>
        </div>
        <div style={{ fontSize: 12, color: colors.textSecondary }}>
          {qtd} de {totalLinhas} {totalLinhas === 1 ? "linha" : "linhas"}
          {futuras > 0 ? ` · ${futuras} ${futuras === 1 ? "parcela futura será criada" : "parcelas futuras serão criadas"}` : ""}
          {duplicadas > 0 ? ` · ${duplicadas} ${duplicadas === 1 ? "possivelmente duplicada" : "possivelmente duplicadas"}` : ""}
          {erros > 0 ? ` · ${erros} com erro` : ""}
        </div>
      </div>
      {emCartao && cartao && porFatura.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {porFatura.map((f) => {
            const venc = datasDaFatura(f.mes, cartao).vencimento;
            return (
              <div key={f.mes} style={{ background: colors.bg, borderRadius: 12, padding: "8px 12px", fontSize: 12 }}>
                <div style={{ color: colors.textMuted }}>Vence {venc.slice(8, 10)}/{venc.slice(5, 7)}/{venc.slice(0, 4)} · {f.quantidade} {f.quantidade === 1 ? "item" : "itens"}</div>
                <div style={{ fontWeight: 700, fontSize: 15, fontVariantNumeric: "tabular-nums" }}>{formatCents(f.total)}</div>
              </div>
            );
          })}
          <div style={{ alignSelf: "center", fontSize: 11, color: colors.textMuted }}>Compare com o valor da fatura no app do banco.</div>
        </div>
      )}
    </section>
  );
}

function ListaIgnoradas({ ignoradas }: { ignoradas: LinhaIgnorada[] }) {
  return (
    <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 4, textAlign: "left" }}>
      {ignoradas.map((i) => (
        <li key={i.numero} style={{ fontSize: 12, color: colors.textSecondary }}>
          <span style={{ color: colors.textMuted }}>Linha {i.numero}:</span> {i.texto} <span style={{ color: colors.textMuted }}>({i.motivo})</span>
        </li>
      ))}
    </ul>
  );
}

function Seg({ ativo, onClick, icone, children }: { ativo: boolean; onClick: () => void; icone: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button" role="tab" aria-selected={ativo} onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13,
        fontWeight: ativo ? 600 : 500, background: ativo ? "var(--hq-surface)" : "transparent",
        color: ativo ? colors.text : colors.textSecondary, boxShadow: ativo ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
      }}
    >
      {icone}{children}
    </button>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: colors.textMuted }}>
      {rotulo}
      {children}
    </label>
  );
}

function Chip({ cor, children }: { cor: string; children: ReactNode }) {
  return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: `${cor}1A`, color: cor }}>{children}</span>;
}

const botaoPrimario: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, background: BLUE, color: "#fff", border: "none",
  padding: "10px 16px", borderRadius: 12, fontSize: 14, fontWeight: 600,
};
const botaoSecundario: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", color: colors.textSecondary,
  border: `1px solid ${colors.border}`, padding: "9px 14px", borderRadius: 12, fontSize: 13, cursor: "pointer",
};
const botaoIcone: CSSProperties = {
  background: "transparent", border: "none", color: colors.textMuted, cursor: "pointer", padding: 6, borderRadius: 8, display: "flex",
};
