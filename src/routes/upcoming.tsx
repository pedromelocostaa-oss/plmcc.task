import { createFileRoute } from "@tanstack/react-router";
import { UpcomingView } from "@/components/workspace/UpcomingView";

export const Route = createFileRoute("/upcoming")({ component: UpcomingView });
