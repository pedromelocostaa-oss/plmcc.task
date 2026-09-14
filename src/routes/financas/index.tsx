import { createFileRoute } from "@tanstack/react-router";
import { colors } from "@/lib/tokens";

export const Route = createFileRoute("/financas/")({
  component: FinancasPlaceholder,
  head: () => ({ meta: [{ title: "Finanças · Pedro's HQ" }] }),
});

function FinancasPlaceholder() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100%", gap: 16, padding: 32,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: "rgba(52,199,89,0.12)",
        display: "grid", placeItems: "center", fontSize: 32,
      }}>
        💰
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: colors.text, margin: 0 }}>
        Finanças
      </h1>
      <p style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center", maxWidth: 360 }}>
        Controle de contas, lançamentos, cartões e relatórios.
        Em breve nesta versão.
      </p>
    </div>
  );
}
