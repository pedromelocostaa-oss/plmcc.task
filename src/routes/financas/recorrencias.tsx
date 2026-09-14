import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const RecorrenciasView = lazy(() =>
  import("@/features/financas/components/RecorrenciasView").then((m) => ({ default: m.RecorrenciasView }))
);

export const Route = createFileRoute("/financas/recorrencias")({
  component: RecorrenciasView,
  head: () => ({ meta: [{ title: "Recorrências · Finanças · Pedro's HQ" }] }),
});
