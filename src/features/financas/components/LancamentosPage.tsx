import { lazy, type ComponentType } from "react";
import { ClipboardList, PencilLine } from "lucide-react";
import { colors } from "@/lib/tokens";

const LancamentosView = lazy(() =>
  import("./LancamentosView").then((m) => ({ default: m.LancamentosView as ComponentType }))
);
const ImportarLote = lazy(() =>
  import("./ImportarLote").then((m) => ({ default: m.ImportarLote as ComponentType }))
);

export type ModoLancamento = "manual" | "lote";

// Uma página só para cadastrar: um por um (manual) ou colando uma lista (em lote).
export function LancamentosPage({ modo, onModo }: { modo: ModoLancamento; onModo: (m: ModoLancamento) => void }) {
  const seg = (ativo: boolean) => ({
    display: "inline-flex", alignItems: "center", gap: 6, border: "none", borderRadius: 8, padding: "7px 16px", cursor: "pointer",
    fontSize: 13, fontWeight: ativo ? 600 : 500,
    background: ativo ? "var(--hq-surface)" : "transparent",
    color: ativo ? colors.text : colors.textSecondary,
    boxShadow: ativo ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
  }) as const;

  return (
    <>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "16px 16px 0" }}>
        <div role="tablist" aria-label="Forma de cadastro" style={{ display: "inline-flex", gap: 2, padding: 3, borderRadius: 11, background: "var(--hq-surface)" }}>
          <button role="tab" aria-selected={modo === "manual"} style={seg(modo === "manual")} onClick={() => onModo("manual")}>
            <PencilLine size={14} /> Manual
          </button>
          <button role="tab" aria-selected={modo === "lote"} style={seg(modo === "lote")} onClick={() => onModo("lote")}>
            <ClipboardList size={14} /> Em lote
          </button>
        </div>
      </div>
      {modo === "lote" ? <ImportarLote /> : <LancamentosView />}
    </>
  );
}
