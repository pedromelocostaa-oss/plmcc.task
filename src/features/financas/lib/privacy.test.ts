import { describe, expect, it } from "vitest";
import { HIDE_VALUES_KEY, MASK, formatMoney, readHidden, writeHidden } from "./privacy";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => { data[k] = v; },
  };
}

describe("ocultar valores", () => {
  it("mostra o valor formatado quando não está oculto", () => {
    expect(formatMoney(341673, false).replace(/\s/g, " ")).toBe("R$ 3.416,73");
  });
  it("oculto: devolve sempre a mesma máscara, sem vazar nada do valor", () => {
    for (const c of [0, 1, 99, 341673, 123456789, -5000]) {
      const t = formatMoney(c, true);
      expect(t).toBe(MASK);
      expect(t).not.toMatch(/\d/);
    }
  });
  it("a máscara tem largura fixa (não revela o tamanho do valor)", () => {
    expect(formatMoney(1, true).length).toBe(formatMoney(999999999, true).length);
  });
  it("lembra a escolha", () => {
    const s = fakeStorage();
    expect(readHidden(s)).toBe(false);
    writeHidden(s, true);
    expect(s.data[HIDE_VALUES_KEY]).toBe("1");
    expect(readHidden(s)).toBe(true);
    writeHidden(s, false);
    expect(readHidden(s)).toBe(false);
  });
  it("valor desconhecido no armazenamento conta como visível", () => {
    expect(readHidden(fakeStorage({ [HIDE_VALUES_KEY]: "talvez" }))).toBe(false);
  });
  it("armazenamento indisponível ou que dá erro não quebra a tela", () => {
    expect(readHidden(undefined)).toBe(false);
    const quebrado = {
      getItem: () => { throw new Error("bloqueado"); },
      setItem: () => { throw new Error("bloqueado"); },
    };
    expect(readHidden(quebrado)).toBe(false);
    expect(() => writeHidden(quebrado, true)).not.toThrow();
    expect(() => writeHidden(undefined, true)).not.toThrow();
  });
});
