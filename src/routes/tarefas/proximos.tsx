import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const UpcomingView = lazy(() =>
  import("@/features/tarefas/components/UpcomingView").then((m) => ({ default: m.UpcomingView }))
);

export const Route = createFileRoute("/tarefas/proximos")({
  component: UpcomingView,
  head: () => ({ meta: [{ title: "Próximos 7 dias · Pedro's HQ" }] }),
});
