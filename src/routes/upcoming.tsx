import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const UpcomingView = lazy(() =>
  import("@/components/workspace/UpcomingView").then((m) => ({ default: m.UpcomingView }))
);

export const Route = createFileRoute("/upcoming")({
  component: UpcomingView,
  head: () => ({ meta: [{ title: "Próximos 7 dias · Pedro's HQ" }] }),
});
