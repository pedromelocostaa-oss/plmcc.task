import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const BookmarksView = lazy(() =>
  import("@/components/workspace/BookmarksView").then((m) => ({ default: m.BookmarksView }))
);

export const Route = createFileRoute("/bookmarks")({ component: BookmarksView });
