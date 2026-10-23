import { describe, expect, it } from "vitest";
import { FINANCAS_TABS, isTabActive } from "./nav";

describe("abas de finanças", () => {
  it("o dashboard só fica ativo na raiz, com ou sem barra final", () => {
    expect(isTabActive("/financas", "/financas")).toBe(true);
    expect(isTabActive("/financas/", "/financas")).toBe(true);
    expect(isTabActive("/financas/contas", "/financas")).toBe(false);
  });
  it("cada aba fica ativa na sua rota e em sub-rotas, e em nenhuma outra", () => {
    expect(isTabActive("/financas/contas", "/financas/contas")).toBe(true);
    expect(isTabActive("/financas/contas/", "/financas/contas")).toBe(true);
    expect(isTabActive("/financas/contas/abc", "/financas/contas")).toBe(true);
    expect(isTabActive("/financas/contas", "/financas/cartoes")).toBe(false);
  });
  it("não confunde rotas com o mesmo prefixo", () => {
    expect(isTabActive("/financas/contasx", "/financas/contas")).toBe(false);
  });
  it("em cada página exatamente uma aba fica ativa", () => {
    for (const t of FINANCAS_TABS) {
      const ativas = FINANCAS_TABS.filter((x) => isTabActive(t.to, x.to));
      expect(ativas.map((x) => x.to)).toEqual([t.to]);
    }
  });
  it("todas as rotas existem como abas (nenhum link morto)", () => {
    expect(FINANCAS_TABS.map((t) => t.to)).toEqual([
      "/financas", "/financas/lancamentos", "/financas/contas",
      "/financas/cartoes", "/financas/categorias", "/financas/recorrencias",
    ]);
  });
});
