import { createFileRoute } from "@tanstack/react-router";
import { PurchasesView } from "@/components/workspace/PurchasesView";

export const Route = createFileRoute("/purchases")({ component: PurchasesView });
