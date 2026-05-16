import { createFileRoute } from "@tanstack/react-router";
import { HomeView } from "@/components/workspace/HomeView";

export const Route = createFileRoute("/")({ component: HomeView });
