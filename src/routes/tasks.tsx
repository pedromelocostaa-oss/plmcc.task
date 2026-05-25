import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const TasksView = lazy(() =>
  import("@/components/workspace/TasksView").then((m) => ({ default: m.TasksView }))
);

export const Route = createFileRoute("/tasks")({ component: TasksView });
