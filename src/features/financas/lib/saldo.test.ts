import { describe, expect, it } from "vitest";
import {
  adjustedSaldoInicial,
  buildDashboard,
  centsToReais,
  computeSaldoConta,
  parseMoneyInput,
  type ContaRow,
  type LancRow,
} from "./dashboard";

describe("digitar um valor", () => {
  it.each([
    ["1.234,56", 123456],
    ["1234,56", 123456],
    ["1234.56", 123456],
    ["1.234", 123400],
    ["1.234.567", 123456700],
    ["50", 5000],
    ["50,5", 5050],
    ["50.5", 5050],
    ["10.50", 1050],
    ["0,99", 99],
    ["0", 0],
    ["R$ 1.234,56", 123456],
    ["  R$50  ", 5000],
    ["-50", -5000],
    ["-R$ 1.000,00", -100000],
    ["+25", 2500],
  ])("aceita %s", (texto, centavos) => {
    expect(parseMoneyInput(texto)).toBe(centavos);
  });

  it.each([[""], ["   "], ["abc"], ["12,345"], ["1,2,3"], ["12.345.67"], ["--5"], ["R$"], ["1e5"], ["0,001"]])(
    "recusa %s",
    (texto) => {
      expect(parseMoneyInput(texto)).toBeNull();
    },
  );

  it("não perde centavo por ponto flutuante", () => {
    expect(parseMoneyInput("1.15")).toBe(115);
    expect(parseMoneyInput("0,29")).toBe(29);
    expect(parseMoneyInput("4.35")).toBe(435);
  });
});

describe("saldo da conta", () => {
  const conta: ContaRow = { id: "c1", nome: "Inter PF", tipo: "conta_corrente", saldo_inicial: "1000.00", ativa: true };
  let n = 0;
  const l = (p: Partial<LancRow> & Pick<LancRow, "tipo" | "valor" | "data">): LancRow => ({
    id: `x${++n}`, conta_id: "c1", categoria_id: null, descricao: "x", data_pagamento: null, pago: true,
    fatura_id: null, parcela_atual: null, parcela_total: null, conta_destino_id: null, ...p,
  });

  it("sem lançamentos é o saldo inicial", () => {
    expect(computeSaldoConta(conta, [])).toBe(100000);
  });
  it("soma receitas pagas e subtrai despesas pagas", () => {
    const lancs = [l({ tipo: "receita", valor: "500.00", data: "2026-10-05" }), l({ tipo: "despesa", valor: "120.50", data: "2026-10-06" })];
    expect(computeSaldoConta(conta, lancs)).toBe(100000 + 50000 - 12050);
  });
  it("ignora o que ainda não foi pago e compras no cartão", () => {
    const lancs = [
      l({ tipo: "despesa", valor: "300.00", data: "2026-10-06", pago: false }),
      l({ tipo: "despesa", valor: "80.00", data: "2026-10-07", fatura_id: "f1" }),
    ];
    expect(computeSaldoConta(conta, lancs)).toBe(100000);
  });
  it("lançamentos de outras contas não contam", () => {
    expect(computeSaldoConta(conta, [l({ tipo: "receita", valor: "999.00", data: "2026-10-05", conta_id: "outra" })])).toBe(100000);
  });
  it("transferência sai de uma conta e entra na outra", () => {
    const t = l({ tipo: "transferencia", valor: "200.00", data: "2026-10-05", conta_destino_id: "c2" });
    const destino: ContaRow = { ...conta, id: "c2", saldo_inicial: 0 };
    expect(computeSaldoConta(conta, [t])).toBe(100000 - 20000);
    expect(computeSaldoConta(destino, [t])).toBe(20000);
  });
  it("é o mesmo número que o dashboard mostra", () => {
    const lancs = [l({ tipo: "receita", valor: "500.00", data: "2026-10-05" }), l({ tipo: "despesa", valor: "120.50", data: "2026-10-06" })];
    const m = buildDashboard({
      lancamentos: lancs, faturas: [], contas: [conta], categorias: [],
      range: { from: "2026-10-01", to: "2026-10-31" }, today: "2026-10-23",
    });
    expect(m.contas[0].saldo).toBe(computeSaldoConta(conta, lancs));
    expect(m.saldoContas).toBe(computeSaldoConta(conta, lancs));
  });
});

describe("ajustar o saldo", () => {
  it("o saldo atual passa a ser exatamente o valor digitado", () => {
    const conta: ContaRow = { id: "c1", nome: "x", tipo: "conta_corrente", saldo_inicial: "1000.00", ativa: true };
    const lancs: LancRow[] = [
      { id: "a", conta_id: "c1", categoria_id: null, descricao: "x", valor: "250.00", tipo: "receita", data: "2026-10-05", data_pagamento: null, pago: true, fatura_id: null, parcela_atual: null, parcela_total: null, conta_destino_id: null },
      { id: "b", conta_id: "c1", categoria_id: null, descricao: "x", valor: "75.30", tipo: "despesa", data: "2026-10-06", data_pagamento: null, pago: true, fatura_id: null, parcela_atual: null, parcela_total: null, conta_destino_id: null },
    ];
    const atual = computeSaldoConta(conta, lancs);
    const desejado = 2345_67;
    const novoInicial = adjustedSaldoInicial(100000, atual, desejado);
    const depois = computeSaldoConta({ ...conta, saldo_inicial: centsToReais(novoInicial) }, lancs);
    expect(depois).toBe(desejado);
  });
  it("funciona para saldo negativo e para zerar", () => {
    expect(adjustedSaldoInicial(0, 5000, -1000)).toBe(-6000);
    expect(adjustedSaldoInicial(100000, 100000, 0)).toBe(0);
  });
  it("sem movimentos, o saldo inicial vira o valor digitado", () => {
    expect(adjustedSaldoInicial(100000, 100000, 54321)).toBe(54321);
  });
  it("converte centavos em reais sem sujeira decimal", () => {
    expect(centsToReais(123456)).toBe(1234.56);
    expect(centsToReais(-5)).toBe(-0.05);
    expect(centsToReais(10)).toBe(0.1);
  });
});
