import { createFileRoute } from "@tanstack/react-router";
import { HomeView } from "@/components/workspace/HomeView";

export const Route = createFileRoute("/")({
  component: HomeView,
  validateSearch: (search: Record<string, unknown>): { date?: string } => ({
    date: typeof search.date === "string" ? search.date : undefined,
  }),
});
