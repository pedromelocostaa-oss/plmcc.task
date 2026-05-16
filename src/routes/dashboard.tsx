import { createFileRoute } from "@tanstack/react-router";
import { DashboardView } from "@/components/workspace/DashboardView";

export const Route = createFileRoute("/dashboard")({ component: DashboardView });
