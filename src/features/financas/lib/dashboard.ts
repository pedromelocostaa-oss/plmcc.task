// Cálculos do dashboard financeiro. Funções puras: sem React, sem banco, sem Date local.
// Todo valor monetário é somado em CENTAVOS (inteiros) e só vira texto na hora de exibir.

export type Tipo = "receita" | "despesa" | "transferencia";

export type LancRow = {
  id: string;
  conta_id: string;
  categoria_id: string | null;
  descricao: string;
  valor: number | string;
  tipo: Tipo;
  data: string;
  data_pagamento: string | null;
  pago: boolean | null;
  fatura_id: string | null;
  parcela_atual: number | null;
  parcela_total: number | null;
  conta_destino_id: string | null;
};

export type FaturaRow = {
  id: string;
  cartao_id: string;
  mes_referencia: string;
  data_fechamento: string;
  data_vencimento: string;
  valor_total: number | string | null;
  paga: boolean | null;
  data_pagamento: string | null;
};

export type ContaRow = {
  id: string;
  nome: string;
  tipo: string;
  saldo_inicial: number | string | null;
  ativa: boolean | null;
};

export type CategoriaRow = { id: string; nome: string; cor: string | null; icone: string | null };

export type Range = { from: string; to: string };

// ── datas (strings ISO YYYY-MM-DD; comparáveis como texto) ──────────────────

const pad = (n: number) => String(n).padStart(2, "0");

export function isIsoDate(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isYearMonth(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

export function monthRange(ym: string): Range {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${ym}-01`, to: `${ym}-${pad(last)}` };
}

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MESES[m - 1]} de ${y}`;
}

export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function monthShort(ym: string): string {
  const [, m] = ym.split("-").map(Number);
  return MESES[m - 1].slice(0, 3);
}

export function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function formatDayMonth(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

// ── período escolhido ───────────────────────────────────────────────────────

export type SearchParams = { mes?: string; de?: string; ate?: string };

export type Period =
  | { mode: "mes"; mes: string; range: Range }
  | { mode: "periodo"; range: Range };

// Prioridade: datas "de/até" válidas > mês válido > mês atual. Datas invertidas são trocadas.
export function resolvePeriod(params: SearchParams, today: string): Period {
  if (isIsoDate(params.de) && isIsoDate(params.ate)) {
    const [a, b] = params.de <= params.ate ? [params.de, params.ate] : [params.ate, params.de];
    return { mode: "periodo", range: { from: a, to: b } };
  }
  const mes = isYearMonth(params.mes) ? params.mes : today.slice(0, 7);
  return { mode: "mes", mes, range: monthRange(mes) };
}

// Editar uma das datas nunca deixa o intervalo invertido: a outra data acompanha.
export function editRange(range: Range, field: "de" | "ate", value: string): { de: string; ate: string } {
  if (field === "de") return { de: value, ate: value > range.to ? value : range.to };
  return { de: value < range.from ? value : range.from, ate: value };
}

export type PresetKey = "ultimos7" | "ultimos30" | "este-mes" | "mes-passado" | "este-ano";

export const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "ultimos7", label: "Últimos 7 dias" },
  { key: "ultimos30", label: "Últimos 30 dias" },
  { key: "este-mes", label: "Este mês" },
  { key: "mes-passado", label: "Mês passado" },
  { key: "este-ano", label: "Este ano" },
];

export function presetRange(key: PresetKey, today: string): Range {
  const ym = today.slice(0, 7);
  switch (key) {
    case "ultimos7": return { from: addDays(today, -6), to: today };
    case "ultimos30": return { from: addDays(today, -29), to: today };
    case "este-mes": return monthRange(ym);
    case "mes-passado": return monthRange(shiftMonth(ym, -1));
    case "este-ano": return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
  }
}

// ── dinheiro ────────────────────────────────────────────────────────────────

export function toCents(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function formatCents(c: number): string {
  return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Saldo atual de uma conta: saldo inicial + movimentos já efetivados (pagos).
// Compra no cartão não entra (só sai do caixa quando a fatura é paga).
export function computeSaldoConta(conta: ContaRow, lancamentos: LancRow[]): number {
  let saldo = toCents(conta.saldo_inicial);
  for (const l of lancamentos) {
    if (!l.pago) continue;
    const v = toCents(l.valor);
    if (l.conta_id === conta.id) {
      if (l.tipo === "receita") saldo += v;
      else if (l.tipo === "despesa" && !l.fatura_id) saldo -= v;
      else if (l.tipo === "transferencia") saldo -= v;
    }
    if (l.tipo === "transferencia" && l.conta_destino_id === conta.id) saldo += v;
  }
  return saldo;
}

// Para o saldo atual ficar em `desejado`, o saldo inicial muda pela diferença.
export function adjustedSaldoInicial(saldoInicial: number, saldoAtual: number, desejado: number): number {
  return saldoInicial + (desejado - saldoAtual);
}

export function centsToReais(cents: number): number {
  return Math.round(cents) / 100;
}

// Lê o que a pessoa digitou ("1.234,56", "1234,56", "1234.56", "R$ 50", "-50"). Devolve centavos ou null.
export function parseMoneyInput(raw: string): number | null {
  let s = raw.replace(/R\$/gi, "").replace(/\s/g, "");
  if (s === "") return null;
  let negativo = false;
  if (s.startsWith("-")) { negativo = true; s = s.slice(1); }
  else if (s.startsWith("+")) s = s.slice(1);
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const cents = Math.round(Number(s) * 100);
  return negativo ? -cents : cents;
}

// ── modelo do dashboard ─────────────────────────────────────────────────────

export type FaturaStatus = "aberta" | "fechada" | "vencida";

export type FaturaResumo = {
  id: string;
  mes_referencia: string;
  fechamento: string;
  vencimento: string;
  total: number;
  itens: number;
  status: FaturaStatus;
};

export type CategoriaFatia = { id: string | null; nome: string; cor: string | null; total: number; percentual: number };

export type MesEvolucao = { mes: string; receitas: number; despesas: number };

export type Recente = {
  id: string;
  descricao: string;
  valor: number;
  tipo: Tipo;
  data: string;
  categoria: string | null;
  noCartao: boolean;
  parcela: string | null;
};

export type DashboardModel = {
  receitas: number;
  receitasRecebidas: number;
  despesas: number;
  despesasNoCartao: number;
  despesasAVista: number;
  saldoPeriodo: number;
  saidaDeCaixa: number;
  faturasPagasNoPeriodo: number;
  saldoContas: number;
  contas: { id: string; nome: string; saldo: number }[];
  faturasPagasSemConta: number;
  proximasFaturas: FaturaResumo[];
  parcelasFuturas: { total: number; quantidade: number; porMes: { mes: string; total: number; quantidade: number }[] };
  categorias: CategoriaFatia[];
  evolucao: MesEvolucao[];
  recentes: Recente[];
  totalLancamentosNoPeriodo: number;
};

export type DashboardInput = {
  lancamentos: LancRow[];
  faturas: FaturaRow[];
  contas: ContaRow[];
  categorias: CategoriaRow[];
  range: Range;
  today: string;
  mesesEvolucao?: number;
};

export function buildDashboard(input: DashboardInput): DashboardModel {
  const { lancamentos, faturas, contas, categorias, range, today } = input;
  const nMeses = input.mesesEvolucao ?? 6;
  const inRange = (d: string) => d >= range.from && d <= range.to;
  const catById = new Map(categorias.map((c) => [c.id, c]));

  let receitas = 0, receitasRecebidas = 0, despesas = 0, despesasNoCartao = 0, despesasAVista = 0;
  let saidaAVista = 0, total = 0;
  const porCategoria = new Map<string | null, number>();
  const sumByFatura = new Map<string, { cents: number; itens: number; parcelados: number }>();

  const mesFim = range.to.slice(0, 7);
  const evoMap = new Map<string, MesEvolucao>();
  for (let i = nMeses - 1; i >= 0; i--) {
    const m = shiftMonth(mesFim, -i);
    evoMap.set(m, { mes: m, receitas: 0, despesas: 0 });
  }

  const recentesRaw: LancRow[] = [];

  for (const l of lancamentos) {
    const c = toCents(l.valor);
    const ym = l.data.slice(0, 7);
    const evo = evoMap.get(ym);

    if (evo) {
      if (l.tipo === "receita") evo.receitas += c;
      else if (l.tipo === "despesa") evo.despesas += c;
    }

    if (l.fatura_id) {
      const f = sumByFatura.get(l.fatura_id) ?? { cents: 0, itens: 0, parcelados: 0 };
      f.cents += c;
      f.itens += 1;
      if (l.parcela_total != null) f.parcelados += c;
      sumByFatura.set(l.fatura_id, f);
    }

    if (inRange(l.data)) {
      total += 1;
      recentesRaw.push(l);
      if (l.tipo === "receita") {
        receitas += c;
        if (l.pago) receitasRecebidas += c;
      } else if (l.tipo === "despesa") {
        despesas += c;
        if (l.fatura_id) despesasNoCartao += c; else despesasAVista += c;
        porCategoria.set(l.categoria_id, (porCategoria.get(l.categoria_id) ?? 0) + c);
      }
    }

    // Saída de caixa à vista: despesa paga que NÃO está numa fatura de cartão.
    if (l.tipo === "despesa" && l.pago && !l.fatura_id && inRange(l.data_pagamento ?? l.data)) {
      saidaAVista += c;
    }
  }

  const faturaTotal = (f: FaturaRow) => {
    const s = sumByFatura.get(f.id);
    return s ? s.cents : toCents(f.valor_total);
  };

  // Saída de caixa do cartão = pagamento da fatura (não a compra).
  let faturasPagasNoPeriodo = 0;
  let faturasPagasSemConta = 0;
  for (const f of faturas) {
    if (f.paga) {
      faturasPagasSemConta += 1;
      if (f.data_pagamento && inRange(f.data_pagamento)) faturasPagasNoPeriodo += faturaTotal(f);
    }
  }

  // Saldo nas contas: saldo inicial + movimentos já efetivados. Cartão de crédito fica de fora.
  const contasCorrentes = contas.filter((c) => c.ativa !== false && c.tipo !== "cartao_credito");
  const contasSaldo = contasCorrentes.map((c) => ({ id: c.id, nome: c.nome, saldo: computeSaldoConta(c, lancamentos) }));

  // Faturas em aberto (ordenadas por vencimento).
  const abertas = faturas
    .filter((f) => !f.paga)
    .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento));

  const proximasFaturas: FaturaResumo[] = abertas.map((f) => ({
    id: f.id,
    mes_referencia: f.mes_referencia,
    fechamento: f.data_fechamento,
    vencimento: f.data_vencimento,
    total: faturaTotal(f),
    itens: sumByFatura.get(f.id)?.itens ?? 0,
    status: today > f.data_vencimento ? "vencida" : today >= f.data_fechamento ? "fechada" : "aberta",
  }));

  // Parcelas já comprometidas DEPOIS da próxima fatura a vencer.
  const depois = abertas.slice(1);
  const porMes = depois
    .map((f) => ({
      mes: f.mes_referencia.slice(0, 7),
      total: sumByFatura.get(f.id)?.parcelados ?? 0,
      quantidade: lancamentos.filter((l) => l.fatura_id === f.id && l.parcela_total != null).length,
    }))
    .filter((m) => m.quantidade > 0);

  const catTotal = Array.from(porCategoria.values()).reduce((a, b) => a + b, 0);
  const fatias: CategoriaFatia[] = Array.from(porCategoria.entries())
    .map(([id, cents]) => {
      const cat = id ? catById.get(id) : undefined;
      return {
        id,
        nome: cat?.nome ?? "Sem categoria",
        cor: cat?.cor ?? null,
        total: cents,
        percentual: catTotal > 0 ? Math.round((cents / catTotal) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  const recentes: Recente[] = recentesRaw
    .sort((a, b) => b.data.localeCompare(a.data) || a.id.localeCompare(b.id))
    .slice(0, 8)
    .map((l) => ({
      id: l.id,
      descricao: l.descricao,
      valor: toCents(l.valor),
      tipo: l.tipo,
      data: l.data,
      categoria: l.categoria_id ? catById.get(l.categoria_id)?.nome ?? null : null,
      noCartao: !!l.fatura_id,
      parcela: l.parcela_total != null && l.parcela_atual != null ? `${l.parcela_atual}/${l.parcela_total}` : null,
    }));

  return {
    receitas,
    receitasRecebidas,
    despesas,
    despesasNoCartao,
    despesasAVista,
    saldoPeriodo: receitas - despesas,
    saidaDeCaixa: saidaAVista + faturasPagasNoPeriodo,
    faturasPagasNoPeriodo,
    saldoContas: contasSaldo.reduce((a, c) => a + c.saldo, 0),
    contas: contasSaldo,
    faturasPagasSemConta,
    proximasFaturas,
    parcelasFuturas: {
      total: porMes.reduce((a, m) => a + m.total, 0),
      quantidade: porMes.reduce((a, m) => a + m.quantidade, 0),
      porMes,
    },
    categorias: fatias,
    evolucao: Array.from(evoMap.values()),
    recentes,
    totalLancamentosNoPeriodo: total,
  };
}
