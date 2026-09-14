import { createFileRoute } from "@tanstack/react-router";
import { HomeView } from "@/features/tarefas/components/HomeView";

export const Route = createFileRoute("/tarefas/")({
  component: HomeView,
  head: () => ({ meta: [{ title: "Hoje · Pedro's HQ" }] }),
  validateSearch: (search: Record<string, unknown>): { date?: string } => ({
    date: typeof search.date === "string" ? search.date : undefined,
  }),
});
