export type FinancasTab = { to: string; label: string };

export const FINANCAS_TABS: FinancasTab[] = [
  { to: "/financas", label: "Dashboard" },
  { to: "/financas/lancamentos", label: "Lançamentos" },
  { to: "/financas/contas", label: "Contas" },
  { to: "/financas/cartoes", label: "Cartões" },
  { to: "/financas/categorias", label: "Categorias" },
  { to: "/financas/recorrencias", label: "Recorrências" },
];

// "/financas" só vale para o dashboard; as demais valem também para sub-rotas ("/financas/contas/x").
export function isTabActive(pathname: string, to: string): boolean {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return to === "/financas" ? p === "/financas" : p === to || p.startsWith(`${to}/`);
}
