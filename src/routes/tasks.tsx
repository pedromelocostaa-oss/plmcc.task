import { createFileRoute } from "@tanstack/react-router";
import { TasksView } from "@/components/workspace/TasksView";

export const Route = createFileRoute("/tasks")({ component: TasksView });
