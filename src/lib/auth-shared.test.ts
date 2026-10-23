import { describe, expect, it } from "vitest";
import { safeRedirect } from "./auth-shared";

const BACKSLASH = String.fromCharCode(92);

describe("safeRedirect", () => {
  it("aceita caminhos internos com query e hash", () => {
    expect(safeRedirect("/financas/contas?mes=2026-10#x")).toBe("/financas/contas?mes=2026-10#x");
  });
  it("usa o fallback para valores vazios ou que nao sao string", () => {
    expect(safeRedirect(undefined)).toBe("/");
    expect(safeRedirect("")).toBe("/");
    expect(safeRedirect(42)).toBe("/");
  });
  it("bloqueia URLs externas e esquemas", () => {
    expect(safeRedirect("https://evil.com")).toBe("/");
    expect(safeRedirect("//evil.com")).toBe("/");
    expect(safeRedirect("/" + BACKSLASH + "evil.com")).toBe("/");
    expect(safeRedirect("javascript:alert(1)")).toBe("/");
  });
  it("bloqueia quebra de linha (header injection)", () => {
    expect(safeRedirect("/ok\r\nSet-Cookie: x=1")).toBe("/");
  });
  it("nao redireciona de volta para o login", () => {
    expect(safeRedirect("/login")).toBe("/");
    expect(safeRedirect("/login?redirect=/x")).toBe("/");
  });
  it("respeita o fallback informado", () => {
    expect(safeRedirect("https://evil.com", "/tarefas")).toBe("/tarefas");
  });
});
