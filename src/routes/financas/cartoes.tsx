import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const CartoesView = lazy(() =>
  import("@/features/financas/components/CartoesView").then((m) => ({ default: m.CartoesView }))
);

export const Route = createFileRoute("/financas/cartoes")({
  component: CartoesView,
  head: () => ({ meta: [{ title: "Cartões · Finanças · Pedro's HQ" }] }),
});
