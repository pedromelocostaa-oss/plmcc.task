import { createFileRoute, Outlet } from "@tanstack/react-router";
import { FinancasSubNav } from "@/features/financas/components/FinancasSubNav";

export const Route = createFileRoute("/financas")({
  component: FinancasLayout,
});

function FinancasLayout() {
  return (
    <>
      <FinancasSubNav />
      <Outlet />
    </>
  );
}
