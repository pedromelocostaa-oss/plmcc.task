import { createFileRoute } from "@tanstack/react-router";
import { BookmarksView } from "@/components/workspace/BookmarksView";

export const Route = createFileRoute("/bookmarks")({ component: BookmarksView });
