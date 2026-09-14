import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const ContasView = lazy(() =>
  import("@/features/financas/components/ContasView").then((m) => ({ default: m.ContasView }))
);

export const Route = createFileRoute("/financas/contas")({
  component: ContasView,
  head: () => ({ meta: [{ title: "Contas · Finanças · Pedro's HQ" }] }),
});
