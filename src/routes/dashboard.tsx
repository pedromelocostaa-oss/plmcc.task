import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const DashboardView = lazy(() =>
  import("@/components/workspace/DashboardView").then((m) => ({ default: m.DashboardView }))
);

export const Route = createFileRoute("/dashboard")({ component: DashboardView });
