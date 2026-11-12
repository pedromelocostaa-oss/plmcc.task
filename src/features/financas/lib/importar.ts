// Lançamentos em lote: lê um texto colado, detecta parcelas e duplicidades e monta o que será gravado.
// Funções puras (sem React, sem banco): tudo em centavos e em datas ISO (YYYY-MM-DD).
import { addDays, centsToReais, isIsoDate, parseMoneyInput } from "./dashboard";

export type TipoLote = "despesa" | "receita";

export type LinhaLote = {
  id: string;
  numero: number; // linha no texto colado
  bruto: string;
  data: string;
  semData: boolean;
  descricao: string;
  valor: number; // centavos (pode vir <= 0: aí é erro)
  parcelaAtual: number | null;
  parcelaTotal: number | null;
  avisos: string[];
};

export type LinhaIgnorada = { numero: number; texto: string; motivo: string };

export type ResultadoLote = { linhas: LinhaLote[]; ignoradas: LinhaIgnorada[] };

// ── datas ───────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");

function ultimoDia(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

// 31/01 + 1 mês = 28/02 (ou 29): nunca estoura para o mês seguinte.
export function addMonthsISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const idx = y * 12 + (m - 1) + n;
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12) + 1;
  return `${ny}-${pad(nm)}-${pad(Math.min(d, ultimoDia(ny, nm)))}`;
}

// "YYYY-MM" + n meses
export function addMonthsKey(key: string, n: number): string {
  return addMonthsISO(`${key}-01`, n).slice(0, 7);
}

// Datas sem ano ("20/10"): usa o ano atual; se cair muito no futuro, é do ano passado (lista de dezembro lida em janeiro).
export function inferirAno(dia: number, mes: number, hoje: string): number {
  const ano = Number(hoje.slice(0, 4));
  const candidata = `${ano}-${pad(mes)}-${pad(dia)}`;
  return candidata > addDays(hoje, 45) ? ano - 1 : ano;
}

// ── texto ───────────────────────────────────────────────────────────────────

export function normalizarDescricao(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function similaridade(a: string, b: string): number {
  const na = normalizarDescricao(a);
  const nb = normalizarDescricao(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na))) return 1;
  const ta = new Set(na.split(" "));
  const tb = new Set(nb.split(" "));
  let comuns = 0;
  for (const t of ta) if (tb.has(t)) comuns += 1;
  return comuns / (ta.size + tb.size - comuns);
}

const RE_RESUMO = /^(sub)?total\b|^saldo\b|^limite\b|^vencimento\b|^fatura\b|^pagamento m[ií]nimo/i;
const RE_DATA_INICIO = /^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}|\d{2}))?(?=\s|$)/;
const RE_PARCELA_PALAVRA = /(?:^|[\s,;(—–-])parcelas?\s*(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})\)?/i;
const RE_PARCELA_PARENTESES = /\(\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\)/;
const RE_VALOR = /(?:-?R\$\s*)?-?\d[\d.]*(?:,\d{1,2})?/g;

type Candidato = { texto: string; inicio: number; fim: number; centavos: number; explicito: boolean; decimais: boolean };

function candidatosDeValor(texto: string): Candidato[] {
  const saida: Candidato[] = [];
  for (const m of texto.matchAll(RE_VALOR)) {
    const centavos = parseMoneyInput(m[0]);
    if (centavos === null) continue;
    saida.push({
      texto: m[0],
      inicio: m.index ?? 0,
      fim: (m.index ?? 0) + m[0].length,
      centavos,
      explicito: /R\$/.test(m[0]),
      decimais: /[.,]\d{1,2}$/.test(m[0]),
    });
  }
  return saida;
}

// O valor é o último número "de dinheiro": com R$, ou com centavos, ou o último número solto da linha.
function escolherValor(texto: string): Candidato | null {
  const todos = candidatosDeValor(texto);
  const explicitos = todos.filter((c) => c.explicito);
  if (explicitos.length) return explicitos[explicitos.length - 1];
  const comDecimais = todos.filter((c) => c.decimais);
  if (comDecimais.length) return comDecimais[comDecimais.length - 1];
  const ultimo = todos[todos.length - 1];
  if (ultimo && texto.slice(ultimo.fim).trim() === "") return ultimo;
  return null;
}

function limparDescricao(texto: string): string {
  return texto
    .replace(/R\$/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:|\-–—•*]+|[\s,;:|\-–—•*]+$/g, "")
    .trim();
}

export function parseLote(texto: string, hoje: string): ResultadoLote {
  const linhas: LinhaLote[] = [];
  const ignoradas: LinhaIgnorada[] = [];

  texto.split(/\r?\n/).forEach((bruta, i) => {
    const numero = i + 1;
    let resto = bruta.replace(/\t+/g, " ").replace(/^\s*[-•*]\s+/, "").trim();
    if (resto === "") return;
    const ignorar = (motivo: string) => ignoradas.push({ numero, texto: bruta.trim(), motivo });

    if (RE_RESUMO.test(resto)) return ignorar("parece um total ou resumo");

    // data no começo
    let data: string | null = null;
    let semData = false;
    let dataInvalida = false;
    const md = resto.match(RE_DATA_INICIO);
    if (md) {
      const dia = Number(md[1]);
      const mes = Number(md[2]);
      let ano: number;
      if (md[3]) ano = md[3].length === 2 ? 2000 + Number(md[3]) : Number(md[3]);
      else ano = inferirAno(dia, mes, hoje);
      const iso = `${ano}-${pad(mes)}-${pad(dia)}`;
      if (isIsoDate(iso)) data = iso;
      else dataInvalida = true;
      resto = resto.slice(md[0].length).trim();
    }

    // parcela
    let parcelaAtual: number | null = null;
    let parcelaTotal: number | null = null;
    const mp = resto.match(RE_PARCELA_PALAVRA) ?? resto.match(RE_PARCELA_PARENTESES);
    if (mp && mp.index !== undefined) {
      parcelaAtual = Number(mp[1]);
      parcelaTotal = Number(mp[2]);
      resto = (resto.slice(0, mp.index) + " " + resto.slice(mp.index + mp[0].length)).trim();
    }

    // valor
    const valorEscolhido = escolherValor(resto);
    if (!valorEscolhido) return ignorar("sem valor em reais");
    resto = resto.slice(0, valorEscolhido.inicio) + " " + resto.slice(valorEscolhido.fim);

    const avisos: string[] = [];
    if (dataInvalida) avisos.push("data inválida: corrija");
    if (data === null) {
      data = hoje;
      semData = true;
      if (!dataInvalida) avisos.push(`sem data: usei ${hoje.split("-").reverse().join("/")}`);
    }
    if (parcelaAtual !== null && parcelaTotal !== null && (parcelaTotal < 1 || parcelaAtual < 1 || parcelaAtual > parcelaTotal)) {
      avisos.push(`parcela ${parcelaAtual}/${parcelaTotal} não faz sentido: corrija`);
    }
    let descricao = limparDescricao(resto);
    if (descricao === "") {
      descricao = "Sem descrição";
      avisos.push("sem descrição");
    }

    linhas.push({
      id: `l${numero}`, numero, bruto: bruta.trim(), data, semData, descricao,
      valor: valorEscolhido.centavos, parcelaAtual, parcelaTotal, avisos,
    });
  });

  // linhas idênticas dentro da própria lista: pode ser legítimo (duas compras iguais), então só avisa
  const contagem = new Map<string, number>();
  const chave = (l: LinhaLote) => `${l.data}|${normalizarDescricao(l.descricao)}|${l.valor}`;
  for (const l of linhas) contagem.set(chave(l), (contagem.get(chave(l)) ?? 0) + 1);
  for (const l of linhas) {
    const n = contagem.get(chave(l)) ?? 1;
    if (n > 1) l.avisos.push(`aparece ${n} vezes na lista (confira se são compras diferentes)`);
  }

  return { linhas, ignoradas };
}

// ── validação de uma linha (depois que a pessoa pode ter editado) ───────────

export function errosDaLinha(l: Pick<LinhaLote, "data" | "descricao" | "valor" | "parcelaAtual" | "parcelaTotal">): string[] {
  const erros: string[] = [];
  if (!isIsoDate(l.data)) erros.push("data inválida");
  if (l.descricao.trim() === "") erros.push("falta a descrição");
  if (!(l.valor > 0)) erros.push("o valor precisa ser maior que zero");
  const temAtual = l.parcelaAtual !== null;
  const temTotal = l.parcelaTotal !== null;
  if (temAtual !== temTotal) erros.push("informe a parcela atual e o total (ex.: 1 de 3)");
  if (temAtual && temTotal && (l.parcelaTotal! < 1 || l.parcelaAtual! < 1 || l.parcelaAtual! > l.parcelaTotal! || l.parcelaTotal! > 60)) {
    erros.push("parcela inválida");
  }
  return erros;
}

// ── duplicidade com o que já existe ─────────────────────────────────────────

export type LancamentoExistente = {
  descricao: string;
  valor: number | string;
  data: string;
  parcela_atual: number | null;
  parcela_total: number | null;
};

export type Duplicidade = { motivo: string; existente: { descricao: string; data: string } };

function diasEntre(a: string, b: string): number {
  return Math.abs((Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10)) - Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10))) / 86400000);
}

const brDia = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

// Critério: mesmo valor + descrição parecida (>= 60% das palavras em comum) + compra a até 3 dias.
// Parcelada: mesmo valor + descrição parecida + mesmo total e mesmo número de parcela (em qualquer data).
export const CRITERIO_DUPLICIDADE =
  "mesmo valor, descrição parecida e data a até 3 dias; nas parcelas, mesmo número de parcela da mesma compra";

export function acharDuplicidades(linhas: LinhaLote[], existentes: LancamentoExistente[]): Map<string, Duplicidade> {
  const saida = new Map<string, Duplicidade>();
  const prontos = existentes.map((e) => ({ e, centavos: Math.round(Number(e.valor) * 100) }));
  for (const l of linhas) {
    for (const { e, centavos } of prontos) {
      if (centavos !== l.valor) continue;
      if (similaridade(l.descricao, e.descricao) < 0.6) continue;
      const mesmaParcela =
        l.parcelaTotal !== null && e.parcela_total === l.parcelaTotal && e.parcela_atual === l.parcelaAtual;
      if (mesmaParcela) {
        saida.set(l.id, {
          motivo: `Já existe a parcela ${l.parcelaAtual}/${l.parcelaTotal} desta compra ("${e.descricao}")`,
          existente: { descricao: e.descricao, data: e.data },
        });
        break;
      }
      if (diasEntre(l.data, e.data) <= 3) {
        saida.set(l.id, {
          motivo: `Parece já cadastrada: "${e.descricao}" em ${brDia(e.data)}, mesmo valor`,
          existente: { descricao: e.descricao, data: e.data },
        });
        break;
      }
    }
  }
  return saida;
}

// ── fatura do cartão ────────────────────────────────────────────────────────

// Compra feita NO DIA do fechamento entra na fatura seguinte (é o que os seus dados mostram: compras de 02/10
// estão na fatura que fecha em 02/11). Troque para "mesma" se o banco fizer ao contrário.
export const COMPRA_NO_DIA_DO_FECHAMENTO: "proxima" | "mesma" = "proxima";

export type CartaoConfig = { id: string; conta_id: string; dia_fechamento: number; dia_vencimento: number };

export type DatasFatura = { mes: string; fechamento: string; vencimento: string };

const dataNoMes = (mesKey: string, dia: number) => {
  const [y, m] = mesKey.split("-").map(Number);
  return `${mesKey}-${pad(Math.min(dia, ultimoDia(y, m)))}`;
};

// `mes` = "YYYY-MM" do VENCIMENTO. O fechamento cai no mesmo mês se vence depois dele, senão no mês anterior.
export function datasDaFatura(mes: string, cartao: Pick<CartaoConfig, "dia_fechamento" | "dia_vencimento">): DatasFatura {
  const vencimento = dataNoMes(mes, cartao.dia_vencimento);
  const mesFechamento = cartao.dia_vencimento > cartao.dia_fechamento ? mes : addMonthsKey(mes, -1);
  return { mes, fechamento: dataNoMes(mesFechamento, cartao.dia_fechamento), vencimento };
}

export function faturaDaCompra(dataCompra: string, cartao: Pick<CartaoConfig, "dia_fechamento" | "dia_vencimento">): DatasFatura {
  const dia = Number(dataCompra.slice(8, 10));
  const passouDoFechamento = COMPRA_NO_DIA_DO_FECHAMENTO === "proxima" ? dia >= cartao.dia_fechamento : dia > cartao.dia_fechamento;
  const mesFechamento = passouDoFechamento ? addMonthsKey(dataCompra.slice(0, 7), 1) : dataCompra.slice(0, 7);
  const mesVencimento = cartao.dia_vencimento > cartao.dia_fechamento ? mesFechamento : addMonthsKey(mesFechamento, 1);
  return datasDaFatura(mesVencimento, cartao);
}

// ── o que gravar ────────────────────────────────────────────────────────────

export type LinhaPronta = LinhaLote & {
  tipo: TipoLote;
  faturaMes?: string | null; // "YYYY-MM" do vencimento, só no cartão (se vazio, vale a escolha do lote)
};

export type DestinoLote =
  | { tipo: "cartao"; cartao: CartaoConfig; faturaFixa: string | null }
  | { tipo: "conta"; conta_id: string; pago: boolean };

export type NovoLancamento = {
  id: string;
  conta_id: string;
  descricao: string;
  valor: number; // reais, como a coluna do banco
  tipo: TipoLote;
  data: string;
  pago: boolean;
  data_pagamento: string | null;
  fatura_mes: string | null; // "YYYY-MM" do vencimento; o gravador troca por fatura_id
  parcela_atual: number | null;
  parcela_total: number | null;
  compra_pai_id: string | null;
  observacao: string | null;
};

export type PlanoGravacao = {
  faturas: DatasFatura[];
  lancamentos: NovoLancamento[];
  quantidadeLinhas: number;
  parcelasFuturas: number;
  totalLinhas: number; // centavos, só as linhas do texto
  porFatura: { mes: string; quantidade: number; total: number }[];
};

export function montarGravacao(linhas: LinhaPronta[], destino: DestinoLote, novoId: () => string): PlanoGravacao {
  const lancamentos: NovoLancamento[] = [];
  const faturas = new Map<string, DatasFatura>();
  const porFatura = new Map<string, { quantidade: number; total: number }>();
  let futuras = 0;
  let totalLinhas = 0;

  const registrarFatura = (mes: string, centavos: number) => {
    if (destino.tipo !== "cartao") return;
    if (!faturas.has(mes)) faturas.set(mes, datasDaFatura(mes, destino.cartao));
    const f = porFatura.get(mes) ?? { quantidade: 0, total: 0 };
    f.quantidade += 1;
    f.total += centavos;
    porFatura.set(mes, f);
  };

  for (const l of linhas) {
    const id = novoId();
    const emCartao = destino.tipo === "cartao";
    const mesBase = emCartao
      ? l.faturaMes || destino.faturaFixa || faturaDaCompra(l.data, destino.cartao).mes
      : null;
    const pago = destino.tipo === "conta" ? destino.pago : false;
    const conta_id = destino.tipo === "cartao" ? destino.cartao.conta_id : destino.conta_id;
    const tipo: TipoLote = emCartao ? "despesa" : l.tipo;

    lancamentos.push({
      id, conta_id, descricao: l.descricao.trim(), valor: centsToReais(l.valor), tipo, data: l.data,
      pago, data_pagamento: pago ? l.data : null, fatura_mes: mesBase,
      parcela_atual: l.parcelaAtual, parcela_total: l.parcelaTotal, compra_pai_id: null, observacao: null,
    });
    totalLinhas += l.valor;
    if (mesBase) registrarFatura(mesBase, l.valor);

    // parcelas que ainda faltam: mesmo valor, mês a mês, cada uma ligada à compra de origem
    if (l.parcelaAtual !== null && l.parcelaTotal !== null) {
      for (let k = 1; k <= l.parcelaTotal - l.parcelaAtual; k++) {
        const mesK = mesBase ? addMonthsKey(mesBase, k) : null;
        lancamentos.push({
          id: novoId(), conta_id, descricao: l.descricao.trim(), valor: centsToReais(l.valor), tipo,
          data: addMonthsISO(l.data, k), pago: false, data_pagamento: null, fatura_mes: mesK,
          parcela_atual: l.parcelaAtual + k, parcela_total: l.parcelaTotal, compra_pai_id: id, observacao: null,
        });
        futuras += 1;
        if (mesK) registrarFatura(mesK, l.valor);
      }
    }
  }

  return {
    faturas: Array.from(faturas.values()).sort((a, b) => a.mes.localeCompare(b.mes)),
    lancamentos,
    quantidadeLinhas: linhas.length,
    parcelasFuturas: futuras,
    totalLinhas,
    porFatura: Array.from(porFatura.entries())
      .map(([mes, v]) => ({ mes, ...v }))
      .sort((a, b) => a.mes.localeCompare(b.mes)),
  };
}
