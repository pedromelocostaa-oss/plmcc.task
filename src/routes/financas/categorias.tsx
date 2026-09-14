import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const CategoriasView = lazy(() =>
  import("@/features/financas/components/CategoriasView").then((m) => ({ default: m.CategoriasView }))
);

export const Route = createFileRoute("/financas/categorias")({
  component: CategoriasView,
  head: () => ({ meta: [{ title: "Categorias · Finanças · Pedro's HQ" }] }),
});
