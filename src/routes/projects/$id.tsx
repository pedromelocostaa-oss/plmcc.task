import { createFileRoute } from "@tanstack/react-router";
import { ProjectView } from "@/components/workspace/ProjectView";

export const Route = createFileRoute("/projects/$id")({
  component: function ProjectPage() {
    const { id } = Route.useParams();
    return <ProjectView projectId={id} />;
  },
});
