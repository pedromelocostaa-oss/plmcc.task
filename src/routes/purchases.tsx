import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const PurchasesView = lazy(() =>
  import("@/components/workspace/PurchasesView").then((m) => ({ default: m.PurchasesView }))
);

export const Route = createFileRoute("/purchases")({ component: PurchasesView });
