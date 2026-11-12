import { describe, expect, it } from "vitest";
import {
  acharDuplicidades,
  addMonthsISO,
  addMonthsKey,
  datasDaFatura,
  errosDaLinha,
  faturaDaCompra,
  inferirAno,
  montarGravacao,
  normalizarDescricao,
  parseLote,
  type CartaoConfig,
  type LinhaPronta,
} from "./importar";

const HOJE = "2026-10-23";
const CARTAO: CartaoConfig = { id: "k1", conta_id: "c-cartao", dia_fechamento: 2, dia_vencimento: 8 };

let seq = 0;
const novoId = () => `id${++seq}`;

describe("datas", () => {
  it("soma meses sem estourar o fim do mês", () => {
    expect(addMonthsISO("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsISO("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonthsISO("2026-11-10", 2)).toBe("2027-01-10");
    expect(addMonthsISO("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonthsKey("2026-11", 3)).toBe("2027-02");
    expect(addMonthsKey("2026-01", -1)).toBe("2025-12");
  });
  it("sem ano: usa o ano atual, ou o passado se cairia muito no futuro", () => {
    expect(inferirAno(20, 10, "2026-10-23")).toBe(2026);
    expect(inferirAno(3, 3, "2026-10-23")).toBe(2026);
    expect(inferirAno(28, 12, "2027-01-05")).toBe(2026);
    expect(inferirAno(2, 1, "2027-01-05")).toBe(2027);
    expect(inferirAno(10, 11, "2026-10-23")).toBe(2026);
  });
});

describe("ler o texto colado", () => {
  it("formato com tabulação, como numa fatura", () => {
    const r = parseLote("20/10\tMercado Central — Cidade A\tR$ 69,90\n18/10\tAssinatura App\tR$ 28,00", HOJE);
    expect(r.linhas).toHaveLength(2);
    expect(r.linhas[0]).toMatchObject({ data: "2026-10-20", descricao: "Mercado Central — Cidade A", valor: 6990 });
    expect(r.linhas[1]).toMatchObject({ data: "2026-10-18", descricao: "Assinatura App", valor: 2800 });
  });
  it("formato livre, com e sem R$", () => {
    const r = parseLote("20/10 Uber R$ 25,90\n19/10 Padaria 12,50\n18/10 Mercado 1.234,56\n17/10 Posto 50", HOJE);
    expect(r.linhas.map((l) => l.valor)).toEqual([2590, 1250, 123456, 5000]);
    expect(r.linhas.map((l) => l.descricao)).toEqual(["Uber", "Padaria", "Mercado", "Posto"]);
  });
  it("detecta parcelas em várias escritas e tira do nome", () => {
    const r = parseLote(
      [
        "10/10\tLoja Alfa — parcela 1/3\tR$ 146,00",
        "09/09\tLoja Beta — Cidade B, parcela 2/2\tR$ 27,00",
        "22/08 Oficina parcela 3 de 4 R$ 62,00",
        "11/08 Geladeira (2/10) R$ 300,00",
      ].join("\n"),
      HOJE,
    );
    expect(r.linhas.map((l) => [l.descricao, l.parcelaAtual, l.parcelaTotal])).toEqual([
      ["Loja Alfa", 1, 3],
      ["Loja Beta — Cidade B", 2, 2],
      ["Oficina", 3, 4],
      ["Geladeira", 2, 10],
    ]);
    expect(r.linhas.map((l) => l.valor)).toEqual([14600, 2700, 6200, 30000]);
  });
  it("ignora títulos, cabeçalhos, totais e linhas sem valor, mas lista o que ignorou", () => {
    const r = parseLote(
      ["Data\tDescrição\tValor", "Gastos de setembro", "30/09\tUber\tR$ 1,10", "Total R$ 1,10", "Fatura de novembro: R$ 1.234,56", "obrigado!", ""].join("\n"),
      HOJE,
    );
    expect(r.linhas).toHaveLength(1);
    expect(r.ignoradas.map((i) => i.numero)).toEqual([1, 2, 4, 5, 6]);
    expect(r.ignoradas.find((i) => i.numero === 4)?.motivo).toMatch(/total/);
    expect(r.ignoradas.find((i) => i.numero === 2)?.motivo).toMatch(/sem valor/);
  });
  it("sem data: usa a data padrão e avisa", () => {
    const r = parseLote("Uber R$ 25,90", HOJE);
    expect(r.linhas[0].data).toBe(HOJE);
    expect(r.linhas[0].semData).toBe(true);
    expect(r.linhas[0].avisos.join(" ")).toMatch(/sem data/);
  });
  it("data com ano de 2 e 4 dígitos", () => {
    const r = parseLote("05/03/25 A R$ 10,00\n05/03/2024 B R$ 20,00", HOJE);
    expect(r.linhas.map((l) => l.data)).toEqual(["2025-03-05", "2024-03-05"]);
  });
  it("data impossível vira aviso, não some", () => {
    const r = parseLote("31/02 Compra R$ 10,00", HOJE);
    expect(r.linhas).toHaveLength(1);
    expect(r.linhas[0].avisos.join(" ")).toMatch(/data inválida/);
  });
  it("número dentro do nome não vira valor quando há valor explícito", () => {
    const r = parseLote("10/10 Loja 2 Irmãos R$ 30,00\n11/10 Mercado 24 horas 45,90", HOJE);
    expect(r.linhas.map((l) => [l.descricao, l.valor])).toEqual([["Loja 2 Irmãos", 3000], ["Mercado 24 horas", 4590]]);
  });
  it("marcadores no começo da linha", () => {
    const r = parseLote("- 10/10 Cafe R$ 8,00\n• 11/10 Pao R$ 4,50", HOJE);
    expect(r.linhas.map((l) => l.descricao)).toEqual(["Cafe", "Pao"]);
  });
  it("aceita quebra de linha do Windows", () => {
    expect(parseLote("10/10 A R$ 1,00\r\n11/10 B R$ 2,00\r\n", HOJE).linhas).toHaveLength(2);
  });
  it("linhas idênticas são só avisadas, nunca descartadas", () => {
    const r = parseLote("09/10\tPadaria Alfa\tR$ 3,00\n09/10\tPadaria Alfa\tR$ 3,00", HOJE);
    expect(r.linhas).toHaveLength(2);
    expect(r.linhas.every((l) => l.avisos.join(" ").includes("2 vezes"))).toBe(true);
  });
  it("valor negativo é lido, mas a validação bloqueia", () => {
    const l = parseLote("10/10 Estorno -R$ 50,00", HOJE).linhas[0];
    expect(l.valor).toBe(-5000);
    expect(errosDaLinha(l)).toContain("o valor precisa ser maior que zero");
  });
  it("hífen usado só como separador não vira sinal negativo", () => {
    const r = parseLote("10/10 Loja - R$ 30,00\n11/10 Padaria - 12,50\n12/10 Posto – R$ 60,00", HOJE);
    expect(r.linhas.map((l) => [l.descricao, l.valor])).toEqual([["Loja", 3000], ["Padaria", 1250], ["Posto", 6000]]);
  });
  it("sinal negativo colado no número, antes ou depois do R$", () => {
    expect(parseLote("10/10 A -R$ 50,00", HOJE).linhas[0].valor).toBe(-5000);
    expect(parseLote("10/10 A R$ -50,00", HOJE).linhas[0].valor).toBe(-5000);
    expect(parseLote("10/10 A -50,00", HOJE).linhas[0].valor).toBe(-5000);
  });
  it("texto vazio não devolve nada", () => {
    expect(parseLote("", HOJE)).toEqual({ linhas: [], ignoradas: [] });
    expect(parseLote("   \n\n  ", HOJE).linhas).toHaveLength(0);
  });
});

describe("validação da linha", () => {
  const ok = { data: "2026-10-10", descricao: "x", valor: 100, parcelaAtual: null, parcelaTotal: null };
  it("linha correta não tem erro", () => {
    expect(errosDaLinha(ok)).toEqual([]);
    expect(errosDaLinha({ ...ok, parcelaAtual: 2, parcelaTotal: 3 })).toEqual([]);
  });
  it("pega os erros comuns", () => {
    expect(errosDaLinha({ ...ok, data: "2026-02-30" })).toContain("data inválida");
    expect(errosDaLinha({ ...ok, descricao: "  " })).toContain("falta a descrição");
    expect(errosDaLinha({ ...ok, valor: 0 })).toContain("o valor precisa ser maior que zero");
    expect(errosDaLinha({ ...ok, parcelaAtual: 4, parcelaTotal: 3 })).toContain("parcela inválida");
    expect(errosDaLinha({ ...ok, parcelaAtual: 1, parcelaTotal: null })[0]).toMatch(/atual e o total/);
  });
});

describe("duplicidade com o que já existe", () => {
  const linha = parseLote("10/10 Uber R$ 27,50", HOJE).linhas;
  it("mesmo valor, nome parecido e data próxima", () => {
    const d = acharDuplicidades(linha, [{ descricao: "UBER *TRIP", valor: "27.50", data: "2026-10-11", parcela_atual: null, parcela_total: null }]);
    expect(d.size).toBe(1);
  });
  it("valor diferente, data longe ou nome diferente não conta", () => {
    expect(acharDuplicidades(linha, [{ descricao: "Uber", valor: "27.51", data: "2026-10-10", parcela_atual: null, parcela_total: null }]).size).toBe(0);
    expect(acharDuplicidades(linha, [{ descricao: "Uber", valor: "27.50", data: "2026-09-10", parcela_atual: null, parcela_total: null }]).size).toBe(0);
    expect(acharDuplicidades(linha, [{ descricao: "Padaria", valor: "27.50", data: "2026-10-10", parcela_atual: null, parcela_total: null }]).size).toBe(0);
  });
  it("parcela: mesma parcela da mesma compra é duplicada em qualquer data; outra parcela não", () => {
    const p = parseLote("09/09 Loja Gama — parcela 2/4 R$ 36,00", HOJE).linhas;
    const existente = (atual: number) => ({ descricao: "Loja Gama", valor: "36.00", data: "2026-12-09", parcela_atual: atual, parcela_total: 4 });
    expect(acharDuplicidades(p, [existente(2)]).size).toBe(1);
    expect(acharDuplicidades(p, [existente(3)]).size).toBe(0);
    expect(acharDuplicidades(p, [existente(2)]).get(p[0].id)?.motivo).toMatch(/parcela 2\/4/);
  });
  it("acentos e pontuação não atrapalham", () => {
    expect(normalizarDescricao("Café — São João!")).toBe("cafe sao joao");
  });
});

describe("fatura do cartão (fecha dia 2, vence dia 8)", () => {
  it("compra depois do fechamento cai na fatura do mês seguinte", () => {
    expect(faturaDaCompra("2026-10-10", CARTAO)).toEqual({ mes: "2026-11", fechamento: "2026-11-02", vencimento: "2026-11-08" });
    expect(faturaDaCompra("2026-10-03", CARTAO).mes).toBe("2026-11");
  });
  it("compra antes do fechamento cai na fatura que vence no mesmo mês", () => {
    expect(faturaDaCompra("2026-10-01", CARTAO)).toEqual({ mes: "2026-10", fechamento: "2026-10-02", vencimento: "2026-10-08" });
  });
  it("no dia do fechamento: entra na seguinte (regra inferida dos seus dados)", () => {
    expect(faturaDaCompra("2026-10-02", CARTAO).mes).toBe("2026-11");
  });
  it("vira o ano", () => {
    expect(faturaDaCompra("2026-12-20", CARTAO)).toEqual({ mes: "2027-01", fechamento: "2027-01-02", vencimento: "2027-01-08" });
  });
  it("cartão que vence ANTES do fechamento (ex.: fecha dia 20, vence dia 5)", () => {
    const k = { dia_fechamento: 20, dia_vencimento: 5 };
    expect(datasDaFatura("2026-11", k)).toEqual({ mes: "2026-11", fechamento: "2026-10-20", vencimento: "2026-11-05" });
    expect(faturaDaCompra("2026-10-10", k).mes).toBe("2026-11");
    expect(faturaDaCompra("2026-10-25", k).mes).toBe("2026-12");
  });
  it("dia 31 em mês curto", () => {
    expect(datasDaFatura("2026-02", { dia_fechamento: 25, dia_vencimento: 31 }).vencimento).toBe("2026-02-28");
  });
});

describe("montar o que gravar", () => {
  const texto = [
    "10/10 Loja A — parcela 1/3 R$ 100,00",
    "09/09 Loja B — parcela 2/4 R$ 50,00",
    "03/03 Loja C — parcela 8/8 R$ 600,00",
    "20/10 Mercado R$ 70,00",
  ].join("\n");
  const prontas = (): LinhaPronta[] => parseLote(texto, HOJE).linhas.map((l) => ({ ...l, tipo: "despesa" as const }));

  it("cartão com fatura fixa: tudo na fatura escolhida e parcelas nas seguintes", () => {
    seq = 0;
    const p = montarGravacao(prontas(), { tipo: "cartao", cartao: CARTAO, faturaFixa: "2026-11" }, novoId);
    expect(p.quantidadeLinhas).toBe(4);
    expect(p.parcelasFuturas).toBe(2 + 2 + 0 + 0);
    expect(p.lancamentos).toHaveLength(4 + 4);
    expect(p.faturas.map((f) => f.mes)).toEqual(["2026-11", "2026-12", "2027-01"]);
    expect(p.porFatura).toEqual([
      { mes: "2026-11", quantidade: 4, total: 10000 + 5000 + 60000 + 7000 },
      { mes: "2026-12", quantidade: 2, total: 10000 + 5000 },
      { mes: "2027-01", quantidade: 2, total: 10000 + 5000 },
    ]);
    expect(p.totalLinhas).toBe(10000 + 5000 + 60000 + 7000);
  });
  it("parcelas futuras: mesmo valor, data mês a mês, ligadas à compra de origem", () => {
    seq = 0;
    const p = montarGravacao(prontas(), { tipo: "cartao", cartao: CARTAO, faturaFixa: "2026-11" }, novoId);
    const origem = p.lancamentos.find((l) => l.descricao === "Loja A" && l.parcela_atual === 1)!;
    const futuras = p.lancamentos.filter((l) => l.compra_pai_id === origem.id);
    expect(futuras.map((f) => [f.parcela_atual, f.parcela_total, f.data, f.fatura_mes, f.valor])).toEqual([
      [2, 3, "2026-11-10", "2026-12", 100],
      [3, 3, "2026-12-10", "2027-01", 100],
    ]);
    expect(origem.compra_pai_id).toBeNull();
    expect(p.lancamentos.every((l) => !l.pago && l.data_pagamento === null)).toBe(true);
  });
  it("última parcela (8/8) não gera nada além dela mesma", () => {
    seq = 0;
    const p = montarGravacao(prontas(), { tipo: "cartao", cartao: CARTAO, faturaFixa: "2026-11" }, novoId);
    expect(p.lancamentos.filter((l) => l.descricao === "Loja C")).toHaveLength(1);
  });
  it("cartão automático: cada compra vai para a fatura da sua data", () => {
    seq = 0;
    const linhas = parseLote("01/10 Antes R$ 10,00\n10/10 Depois R$ 20,00", HOJE).linhas.map((l) => ({ ...l, tipo: "despesa" as const }));
    const p = montarGravacao(linhas, { tipo: "cartao", cartao: CARTAO, faturaFixa: null }, novoId);
    expect(p.lancamentos.map((l) => l.fatura_mes)).toEqual(["2026-10", "2026-11"]);
  });
  it("fatura escolhida numa linha vale mais que a do lote", () => {
    seq = 0;
    const linhas: LinhaPronta[] = parseLote("10/10 A R$ 10,00\n10/10 B R$ 20,00", HOJE).linhas.map((l, i) => ({ ...l, tipo: "despesa" as const, faturaMes: i === 1 ? "2026-12" : null }));
    const p = montarGravacao(linhas, { tipo: "cartao", cartao: CARTAO, faturaFixa: "2026-11" }, novoId);
    expect(p.lancamentos.map((l) => l.fatura_mes)).toEqual(["2026-11", "2026-12"]);
  });
  it("conta à vista: sem fatura; pago grava a data do pagamento; parcelas futuras ficam pendentes", () => {
    seq = 0;
    const p = montarGravacao(prontas(), { tipo: "conta", conta_id: "c-pj", pago: true }, novoId);
    expect(p.faturas).toEqual([]);
    expect(p.lancamentos.every((l) => l.fatura_mes === null && l.conta_id === "c-pj")).toBe(true);
    const base = p.lancamentos.filter((l) => l.compra_pai_id === null);
    expect(base.every((l) => l.pago && l.data_pagamento === l.data)).toBe(true);
    expect(p.lancamentos.filter((l) => l.compra_pai_id !== null).every((l) => !l.pago)).toBe(true);
  });
  it("receita só existe fora do cartão", () => {
    seq = 0;
    const linhas: LinhaPronta[] = parseLote("05/10 Salário R$ 5.000,00", HOJE).linhas.map((l) => ({ ...l, tipo: "receita" as const }));
    expect(montarGravacao(linhas, { tipo: "conta", conta_id: "c1", pago: false }, novoId).lancamentos[0].tipo).toBe("receita");
    expect(montarGravacao(linhas, { tipo: "cartao", cartao: CARTAO, faturaFixa: "2026-11" }, novoId).lancamentos[0].tipo).toBe("despesa");
  });
  it("não mexe nos valores: soma em centavos fecha exato", () => {
    seq = 0;
    const linhas = parseLote("10/10 A R$ 0,10\n10/10 B R$ 0,20\n10/10 C R$ 0,30", HOJE).linhas.map((l) => ({ ...l, tipo: "despesa" as const }));
    expect(montarGravacao(linhas, { tipo: "conta", conta_id: "c", pago: false }, novoId).totalLinhas).toBe(60);
  });
});
