import { createFileRoute } from "@tanstack/react-router";
import { ProjectView } from "@/features/tarefas/components/ProjectView";

export const Route = createFileRoute("/tarefas/projetos/$id")({
  component: function ProjectPage() {
    const { id } = Route.useParams();
    return <ProjectView projectId={id} />;
  },
  head: () => ({ meta: [{ title: "Projeto · Pedro's HQ" }] }),
});
