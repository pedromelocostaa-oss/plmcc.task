import { createFileRoute } from "@tanstack/react-router";
import { NotesView } from "@/components/workspace/NotesView";

export const Route = createFileRoute("/notes")({ component: NotesView });
