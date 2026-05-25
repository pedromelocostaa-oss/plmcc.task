import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const NotesView = lazy(() =>
  import("@/components/workspace/NotesView").then((m) => ({ default: m.NotesView }))
);

export const Route = createFileRoute("/notes")({ component: NotesView });
