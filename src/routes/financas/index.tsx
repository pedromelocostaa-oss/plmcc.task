import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy } from "react";
import type { DashboardLink } from "@/features/financas/components/FinancasDashboard";
import type { SearchParams } from "@/features/financas/lib/dashboard";

const FinancasDashboard = lazy(() =>
  import("@/features/financas/components/FinancasDashboard").then((m) => ({ default: m.FinancasDashboard }))
);

export const Route = createFileRoute("/financas/")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    mes: typeof search.mes === "string" ? search.mes : undefined,
    de: typeof search.de === "string" ? search.de : undefined,
    ate: typeof search.ate === "string" ? search.ate : undefined,
  }),
  component: FinancasPage,
  head: () => ({ meta: [{ title: "Finanças · Pedro's HQ" }] }),
});

const RouterLink: DashboardLink = ({ to, style, children }) => (
  <Link to={to as never} style={style}>{children}</Link>
);

function FinancasPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <FinancasDashboard
      search={search}
      onSearchChange={(next) => navigate({ search: next, replace: true })}
      Link={RouterLink}
    />
  );
}
