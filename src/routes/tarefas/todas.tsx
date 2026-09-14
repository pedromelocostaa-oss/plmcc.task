import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const TasksView = lazy(() =>
  import("@/features/tarefas/components/TasksView").then((m) => ({ default: m.TasksView }))
);

export const Route = createFileRoute("/tarefas/todas")({
  component: TasksView,
  head: () => ({ meta: [{ title: "Todas as tarefas · Pedro's HQ" }] }),
});
