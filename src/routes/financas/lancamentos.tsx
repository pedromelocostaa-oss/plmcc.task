import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const LancamentosView = lazy(() =>
  import("@/features/financas/components/LancamentosView").then((m) => ({ default: m.LancamentosView }))
);

export const Route = createFileRoute("/financas/lancamentos")({
  component: LancamentosView,
  head: () => ({ meta: [{ title: "Lançamentos · Finanças · Pedro's HQ" }] }),
});
