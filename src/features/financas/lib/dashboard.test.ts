import { describe, expect, it } from "vitest";
import {
  addDays,
  buildDashboard,
  editRange,
  formatCents,
  isIsoDate,
  monthLabel,
  monthRange,
  presetRange,
  resolvePeriod,
  shiftMonth,
  toCents,
  type CategoriaRow,
  type ContaRow,
  type FaturaRow,
  type LancRow,
} from "./dashboard";

describe("dinheiro", () => {
  it("converte para centavos sem erro de ponto flutuante", () => {
    expect(toCents("146.34")).toBe(14634);
    expect(toCents(1.15)).toBe(115);
    expect(toCents(0.29)).toBe(29);
    expect(toCents(null)).toBe(0);
    expect(toCents("abc")).toBe(0);
  });
  it("soma de centavos fecha exatamente", () => {
    const valores = ["69.96", "28.68", "1.00", "84.48", "60.00"];
    expect(valores.reduce((a, v) => a + toCents(v), 0)).toBe(24412);
  });
  it("formata em reais", () => {
    expect(formatCents(341673).replace(/\s/g, " ")).toBe("R$ 3.416,73");
  });
});

describe("datas", () => {
  it("fim do mes, inclusive bissexto", () => {
    expect(monthRange("2026-10")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(monthRange("2026-02").to).toBe("2026-02-28");
    expect(monthRange("2028-02").to).toBe("2028-02-29");
    expect(monthRange("2026-11").to).toBe("2026-11-30");
  });
  it("navega entre meses virando o ano", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-11", 2)).toBe("2027-01");
    expect(shiftMonth("2026-10", 0)).toBe("2026-10");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
  it("soma dias atravessando o mes", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("valida datas reais", () => {
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("2026-10-23")).toBe(true);
    expect(isIsoDate(undefined)).toBe(false);
  });
  it("rotulo do mes em portugues", () => {
    expect(monthLabel("2026-03")).toBe("março de 2026");
  });
});

describe("edicao do intervalo", () => {
  const r = { from: "2026-10-01", to: "2026-10-31" };
  it("mudar so a data inicial dentro do intervalo mantem a final", () => {
    expect(editRange(r, "de", "2026-10-05")).toEqual({ de: "2026-10-05", ate: "2026-10-31" });
  });
  it("data inicial depois da final arrasta a final", () => {
    expect(editRange(r, "de", "2026-11-10")).toEqual({ de: "2026-11-10", ate: "2026-11-10" });
  });
  it("data final antes da inicial arrasta a inicial", () => {
    expect(editRange(r, "ate", "2026-09-20")).toEqual({ de: "2026-09-20", ate: "2026-09-20" });
  });
  it("mudar so a data final dentro do intervalo mantem a inicial", () => {
    expect(editRange(r, "ate", "2026-10-10")).toEqual({ de: "2026-10-01", ate: "2026-10-10" });
  });
  it("editar em sequencia chega no intervalo desejado (de setembro para 5-10 de outubro)", () => {
    const set = { from: "2026-09-01", to: "2026-09-30" };
    const a = editRange(set, "de", "2026-10-05");
    const b = editRange({ from: a.de, to: a.ate }, "ate", "2026-10-10");
    expect(b).toEqual({ de: "2026-10-05", ate: "2026-10-10" });
  });
});

describe("periodo escolhido", () => {
  const today = "2026-10-23";
  it("sem parametros usa o mes atual", () => {
    const p = resolvePeriod({}, today);
    expect(p).toEqual({ mode: "mes", mes: "2026-10", range: { from: "2026-10-01", to: "2026-10-31" } });
  });
  it("usa o mes informado", () => {
    expect(resolvePeriod({ mes: "2026-03" }, today).range).toEqual({ from: "2026-03-01", to: "2026-03-31" });
  });
  it("mes invalido cai no mes atual", () => {
    expect(resolvePeriod({ mes: "2026-13" }, today).range.from).toBe("2026-10-01");
    expect(resolvePeriod({ mes: "lixo" }, today).range.from).toBe("2026-10-01");
  });
  it("datas especificas valem mais que o mes", () => {
    const p = resolvePeriod({ mes: "2026-03", de: "2026-10-05", ate: "2026-10-15" }, today);
    expect(p).toEqual({ mode: "periodo", range: { from: "2026-10-05", to: "2026-10-15" } });
  });
  it("datas invertidas sao trocadas", () => {
    expect(resolvePeriod({ de: "2026-10-20", ate: "2026-10-01" }, today).range).toEqual({ from: "2026-10-01", to: "2026-10-20" });
  });
  it("so uma data, ou data invalida, e ignorada", () => {
    expect(resolvePeriod({ de: "2026-10-05" }, today).mode).toBe("mes");
    expect(resolvePeriod({ de: "2026-02-30", ate: "2026-03-05" }, today).mode).toBe("mes");
  });
  it("atalhos", () => {
    expect(presetRange("ultimos7", today)).toEqual({ from: "2026-10-17", to: "2026-10-23" });
    expect(presetRange("ultimos30", today)).toEqual({ from: "2026-09-24", to: "2026-10-23" });
    expect(presetRange("mes-passado", today)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(presetRange("mes-passado", "2026-01-15")).toEqual({ from: "2025-12-01", to: "2025-12-31" });
    expect(presetRange("este-ano", today)).toEqual({ from: "2026-01-01", to: "2026-12-31" });
  });
});

// ── cenário: salário, aluguel, cartão parcelado, fatura antiga paga ─────────

const contas: ContaRow[] = [
  { id: "c1", nome: "Conta PJ", tipo: "conta_corrente", saldo_inicial: "1000.00", ativa: true },
  { id: "c2", nome: "Poupança", tipo: "poupanca", saldo_inicial: 500, ativa: true },
  { id: "cc", nome: "Cartão", tipo: "cartao_credito", saldo_inicial: 0, ativa: true },
  { id: "cx", nome: "Conta velha", tipo: "conta_corrente", saldo_inicial: 999, ativa: false },
];

const categorias: CategoriaRow[] = [
  { id: "cat-mercado", nome: "Mercado", cor: "#34C759", icone: null },
  { id: "cat-lazer", nome: "Lazer", cor: null, icone: null },
];

const faturas: FaturaRow[] = [
  { id: "f-set", cartao_id: "k", mes_referencia: "2026-10-01", data_fechamento: "2026-10-02", data_vencimento: "2026-10-08", valor_total: 0, paga: true, data_pagamento: "2026-10-08" },
  { id: "f-nov", cartao_id: "k", mes_referencia: "2026-11-01", data_fechamento: "2026-11-02", data_vencimento: "2026-11-08", valor_total: 0, paga: false, data_pagamento: null },
  { id: "f-dez", cartao_id: "k", mes_referencia: "2026-12-01", data_fechamento: "2026-12-02", data_vencimento: "2026-12-08", valor_total: 0, paga: false, data_pagamento: null },
  { id: "f-jan", cartao_id: "k", mes_referencia: "2027-01-01", data_fechamento: "2027-01-02", data_vencimento: "2027-01-08", valor_total: 0, paga: false, data_pagamento: null },
];

let seq = 0;
function l(p: Partial<LancRow> & Pick<LancRow, "tipo" | "valor" | "data">): LancRow {
  seq += 1;
  return {
    id: `l${String(seq).padStart(3, "0")}`,
    conta_id: "c1",
    categoria_id: null,
    descricao: "x",
    data_pagamento: null,
    pago: false,
    fatura_id: null,
    parcela_atual: null,
    parcela_total: null,
    conta_destino_id: null,
    ...p,
  };
}

const lancamentos: LancRow[] = [
  l({ tipo: "receita", valor: "5000.00", data: "2026-10-05", pago: true, data_pagamento: "2026-10-05", descricao: "Salário" }),
  l({ tipo: "despesa", valor: "1500.00", data: "2026-10-10", pago: true, data_pagamento: "2026-10-10", descricao: "Aluguel", categoria_id: "cat-lazer" }),
  l({ tipo: "despesa", valor: "200.00", data: "2026-10-20", pago: false, descricao: "Conta a pagar", categoria_id: "cat-mercado" }),
  // cartão, compras de outubro na fatura de novembro
  l({ tipo: "despesa", conta_id: "cc", valor: "100.10", data: "2026-10-12", fatura_id: "f-nov", categoria_id: "cat-mercado" }),
  l({ tipo: "despesa", conta_id: "cc", valor: "50.05", data: "2026-10-10", fatura_id: "f-nov", parcela_atual: 1, parcela_total: 3, descricao: "Loja" }),
  // parcelas futuras da "Loja"
  l({ tipo: "despesa", conta_id: "cc", valor: "50.05", data: "2026-11-10", fatura_id: "f-dez", parcela_atual: 2, parcela_total: 3, descricao: "Loja" }),
  l({ tipo: "despesa", conta_id: "cc", valor: "50.05", data: "2026-12-10", fatura_id: "f-jan", parcela_atual: 3, parcela_total: 3, descricao: "Loja" }),
  // compra de setembro numa fatura que já foi paga em 08/10
  l({ tipo: "despesa", conta_id: "cc", valor: "300.00", data: "2026-09-15", fatura_id: "f-set", pago: true }),
  // despesa de cartão marcada paga NÃO pode contar como saída de caixa à vista
  l({ tipo: "despesa", conta_id: "cc", valor: "10.00", data: "2026-10-15", fatura_id: "f-nov", pago: true, data_pagamento: "2026-10-15" }),
];

const base = { lancamentos, faturas, contas, categorias, today: "2026-10-23" };
const outubro = { from: "2026-10-01", to: "2026-10-31" };

describe("dashboard: mês de outubro", () => {
  const m = buildDashboard({ ...base, range: outubro });

  it("receitas do período", () => {
    expect(m.receitas).toBe(500000);
    expect(m.receitasRecebidas).toBe(500000);
  });

  it("despesas por competência incluem cartão e contas a pagar", () => {
    // 1500 + 200 + 100,10 + 50,05 + 10,00
    expect(m.despesas).toBe(150000 + 20000 + 10010 + 5005 + 1000);
    expect(m.despesasNoCartao).toBe(10010 + 5005 + 1000);
    expect(m.despesasAVista).toBe(170000);
    expect(m.despesasNoCartao + m.despesasAVista).toBe(m.despesas);
  });

  it("saldo do período = receitas - despesas", () => {
    expect(m.saldoPeriodo).toBe(m.receitas - m.despesas);
  });

  it("saída de caixa = à vista pago + fatura paga (compra no cartão não sai do caixa)", () => {
    // aluguel 1500 + fatura de setembro paga em 08/10 (300,00). O cartão marcado pago e a conta a pagar não entram.
    expect(m.faturasPagasNoPeriodo).toBe(30000);
    expect(m.saidaDeCaixa).toBe(150000 + 30000);
  });

  it("saldo nas contas: só contas ativas, sem cartão, só o que foi efetivado", () => {
    // PJ: 1000 + 5000 - 1500 = 4500; poupança 500; conta velha (inativa) e cartão ficam de fora
    expect(m.contas.map((c) => [c.nome, c.saldo])).toEqual([["Conta PJ", 450000], ["Poupança", 50000]]);
    expect(m.saldoContas).toBe(500000);
  });

  it("próximas faturas em aberto, em ordem, com status e total", () => {
    expect(m.proximasFaturas.map((f) => f.id)).toEqual(["f-nov", "f-dez", "f-jan"]);
    const nov = m.proximasFaturas[0];
    expect(nov.total).toBe(10010 + 5005 + 1000);
    expect(nov.itens).toBe(3);
    expect(nov.status).toBe("aberta");
    expect(m.proximasFaturas[1].total).toBe(5005);
  });

  it("parcelas futuras = parcelados depois da próxima fatura", () => {
    expect(m.parcelasFuturas.total).toBe(5005 + 5005);
    expect(m.parcelasFuturas.quantidade).toBe(2);
    expect(m.parcelasFuturas.porMes.map((x) => x.mes)).toEqual(["2026-12", "2027-01"]);
  });

  it("categorias somam o total de despesas, com Sem categoria", () => {
    const soma = m.categorias.reduce((a, c) => a + c.total, 0);
    expect(soma).toBe(m.despesas);
    expect(m.categorias[0].total).toBeGreaterThanOrEqual(m.categorias[1].total);
    expect(m.categorias.find((c) => c.id === null)?.nome).toBe("Sem categoria");
    expect(m.categorias.find((c) => c.id === "cat-mercado")?.total).toBe(20000 + 10010);
    const pct = m.categorias.reduce((a, c) => a + c.percentual, 0);
    expect(Math.abs(pct - 100)).toBeLessThan(0.5);
  });

  it("evolução: 6 meses terminando no mês do período, na ordem certa", () => {
    expect(m.evolucao.map((e) => e.mes)).toEqual(["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(m.evolucao[5].despesas).toBe(m.despesas);
    expect(m.evolucao[4].despesas).toBe(30000);
    expect(m.evolucao[5].receitas).toBe(500000);
  });

  it("lançamentos recentes: mais novos primeiro, no máximo 8", () => {
    expect(m.recentes.length).toBeLessThanOrEqual(8);
    expect(m.recentes[0].data >= m.recentes[m.recentes.length - 1].data).toBe(true);
    expect(m.recentes.find((r) => r.descricao === "Loja")?.parcela).toBe("1/3");
    expect(m.totalLancamentosNoPeriodo).toBe(6);
  });
});

describe("dashboard: datas específicas", () => {
  it("o período é inclusivo nos dois extremos", () => {
    const m = buildDashboard({ ...base, range: { from: "2026-10-05", to: "2026-10-10" } });
    expect(m.receitas).toBe(500000); // 05/10 entra
    expect(m.despesas).toBe(150000 + 5005); // aluguel e parcela de 10/10 entram; 12/10 não
  });
  it("período sem nada devolve zeros e estruturas vazias", () => {
    const m = buildDashboard({ ...base, range: { from: "2025-01-01", to: "2025-01-31" } });
    expect(m.receitas).toBe(0);
    expect(m.despesas).toBe(0);
    expect(m.saldoPeriodo).toBe(0);
    expect(m.categorias).toEqual([]);
    expect(m.recentes).toEqual([]);
    expect(m.evolucao).toHaveLength(6);
  });
  it("a evolução atravessa a virada do ano", () => {
    const m = buildDashboard({ ...base, range: { from: "2027-01-01", to: "2027-01-31" } });
    expect(m.evolucao.map((e) => e.mes)).toEqual(["2026-08", "2026-09", "2026-10", "2026-11", "2026-12", "2027-01"]);
  });
  it("período que cruza meses soma tudo", () => {
    const m = buildDashboard({ ...base, range: { from: "2026-09-01", to: "2026-10-31" } });
    expect(m.despesas).toBe(150000 + 20000 + 10010 + 5005 + 1000 + 30000);
  });
});

describe("dashboard: transferência e fatura vencida", () => {
  it("transferência move saldo entre contas mas não é receita nem despesa", () => {
    const t = l({ tipo: "transferencia", conta_id: "c1", conta_destino_id: "c2", valor: "200.00", data: "2026-10-11", pago: true });
    const m = buildDashboard({ ...base, lancamentos: [...lancamentos, t], range: outubro });
    expect(m.contas.find((c) => c.id === "c1")?.saldo).toBe(450000 - 20000);
    expect(m.contas.find((c) => c.id === "c2")?.saldo).toBe(50000 + 20000);
    expect(m.saldoContas).toBe(500000);
    expect(m.receitas).toBe(500000);
    expect(m.despesas).toBe(150000 + 20000 + 10010 + 5005 + 1000);
  });
  it("fatura passou do vencimento sem pagar fica vencida; fechada entre fechamento e vencimento", () => {
    const m = buildDashboard({ ...base, today: "2026-11-05", range: outubro });
    expect(m.proximasFaturas[0].status).toBe("fechada");
    const v = buildDashboard({ ...base, today: "2026-11-09", range: outubro });
    expect(v.proximasFaturas[0].status).toBe("vencida");
  });
  it("fatura sem lançamentos usa o valor_total gravado", () => {
    const f: FaturaRow = { ...faturas[1], id: "f-x", valor_total: "321.45" };
    const m = buildDashboard({ ...base, faturas: [f], range: outubro });
    expect(m.proximasFaturas[0].total).toBe(32145);
  });
});
