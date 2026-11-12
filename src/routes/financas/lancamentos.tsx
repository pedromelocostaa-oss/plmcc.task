import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const LancamentosPage = lazy(() =>
  import("@/features/financas/components/LancamentosPage").then((m) => ({ default: m.LancamentosPage }))
);

export const Route = createFileRoute("/financas/lancamentos")({
  // ?modo=lote abre direto a importação em lote
  validateSearch: (search: Record<string, unknown>): { modo?: "lote" } => ({
    modo: search.modo === "lote" ? "lote" : undefined,
  }),
  component: LancamentosRoute,
  head: () => ({ meta: [{ title: "Lançamentos · Finanças · Pedro's HQ" }] }),
});

function LancamentosRoute() {
  const { modo } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <LancamentosPage
      modo={modo === "lote" ? "lote" : "manual"}
      onModo={(m) => navigate({ search: m === "lote" ? { modo: "lote" } : {}, replace: true })}
    />
  );
}
