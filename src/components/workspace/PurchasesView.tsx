import { useState } from "react";
import { ShoppingCart, Trash2, ExternalLink } from "lucide-react";
import { usePurchases, useTogglePurchaseBought, useDeletePurchase } from "@/lib/queries";
import { colors, spring, radius } from "@/lib/tokens";
import { EmptyState } from "@/components/workspace/EmptyState";
import { useQuickAdd } from "@/routes/__root";

const CATEGORIES: Record<string, { label: string; emoji: string }> = {
  pessoal:  { label: "Pessoal",  emoji: "🏠" },
  casa:     { label: "Casa",     emoji: "🛋️" },
  trabalho: { label: "Trabalho", emoji: "💼" },
  presente: { label: "Presente", emoji: "🎁" },
  viagem:   { label: "Viagem",   emoji: "✈️" },
  tech:     { label: "Tech",     emoji: "💻" },
};

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function PurchasesView() {
  const { data: purchases = [], isLoading } = usePurchases();
  const toggleBought = useTogglePurchaseBought();
  const deletePurchase = useDeletePurchase();
  const { openQuickAdd } = useQuickAdd();

  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = filterCategory
    ? purchases.filter((p) => p.category === filterCategory)
    : purchases;

  const pending = purchases.filter((p) => !p.bought);
  const bought = purchases.filter((p) => p.bought);

  const pendingTotal = pending.reduce((sum, p) => sum + (p.price_cents || 0) * (p.qty || 1), 0);
  const boughtTotal = bought.reduce((sum, p) => sum + (p.price_cents || 0) * (p.qty || 1), 0);
  const mostExpensivePending = pending.length > 0
    ? pending.reduce((max, p) => (p.price_cents || 0) > (max.price_cents || 0) ? p : max, pending[0])
    : null;

  const categoriesInUse = Array.from(new Set(purchases.map((p) => p.category))).filter(Boolean);

  return (
    <div style={{
      padding: "28px",
      minHeight: "100dvh",
      background: "var(--hq-bg)",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{
          fontSize: "clamp(22px, 5vw, 32px)",
          fontWeight: 700,
          letterSpacing: "-0.025em",
          margin: 0,
          color: colors.text,
        }}>
          Compras
        </h1>
        {purchases.length > 0 && (
          <p style={{ margin: "4px 0 0", fontSize: 13, color: colors.textSecondary }}>
            {pending.length} pendente{pending.length !== 1 ? "s" : ""} · {bought.length} comprado{bought.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Category filter pills */}
      {categoriesInUse.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          <button
            onClick={() => setFilterCategory(null)}
            style={filterPillStyle(filterCategory === null)}
          >
            Todos
          </button>
          {categoriesInUse.map((cat) => {
            const info = CATEGORIES[cat];
            if (!info) return null;
            return (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat === filterCategory ? null : cat)}
                style={filterPillStyle(filterCategory === cat)}
              >
                {info.emoji} {info.label}
              </button>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div style={{ color: colors.textMuted, fontSize: 13 }}>Carregando...</div>
      ) : purchases.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart size={24} />}
          iconColor="#FF6B35"
          title="Nenhuma compra na lista"
          description="Adicione produtos que você quer comprar, com preço estimado e categoria."
          actionLabel="Adicionar produto"
          onAction={openQuickAdd}
          kbd="⌘N"
        />
      ) : (
        <>
          {/* KPI strip */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10,
            marginBottom: 20,
          }}>
            <KpiCard
              label="Pendente"
              value={formatPrice(pendingTotal)}
              color="var(--hq-accent)"
            />
            <KpiCard
              label="Comprado"
              value={formatPrice(boughtTotal)}
              color="var(--hq-success)"
            />
            <KpiCard
              label="Mais caro pendente"
              value={mostExpensivePending
                ? `${mostExpensivePending.name.slice(0, 14)}… ${formatPrice(mostExpensivePending.price_cents || 0)}`
                : "—"
              }
              color={colors.textSecondary}
            />
          </div>

          {/* List */}
          <div style={{
            background: "var(--hq-card-bg)",
            border: `1px solid var(--hq-card-border)`,
            borderRadius: 14,
            overflow: "hidden",
            backdropFilter: "blur(8px)",
          }}>
            {filtered.map((item, idx) => {
              const catInfo = CATEGORIES[item.category] ?? { emoji: "📦", label: item.category };
              const isHovered = hoveredId === item.id;

              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderBottom: idx < filtered.length - 1 ? `1px solid var(--hq-divider)` : "none",
                    background: isHovered ? "var(--hq-surface-hover)" : "transparent",
                    transition: `background 0.1s ${spring.gentle}`,
                  }}
                >
                  {/* Circular checkbox */}
                  <button
                    onClick={() => toggleBought.mutate({ id: item.id, bought: item.bought })}
                    style={{
                      width: 20, height: 20, borderRadius: "50%",
                      border: item.bought ? "none" : `1.5px solid var(--hq-border)`,
                      background: item.bought ? "var(--hq-success)" : "transparent",
                      cursor: "pointer", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 11,
                      transition: `all 0.15s ${spring.bounce}`,
                    }}
                  >
                    {item.bought && "✓"}
                  </button>

                  {/* Category emoji badge */}
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: "var(--hq-inlay-bg)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, flexShrink: 0,
                  }}>
                    {catInfo.emoji}
                  </div>

                  {/* Name + URL */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13.5, fontWeight: 500,
                      color: item.bought ? colors.textMuted : colors.text,
                      textDecoration: item.bought ? "line-through" : "none",
                      opacity: item.bought ? 0.55 : 1,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {item.name}
                    </div>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontSize: 10.5, color: colors.textMuted,
                          fontFamily: '"SF Mono", ui-monospace, monospace',
                          textDecoration: "none",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          maxWidth: 200,
                        }}
                      >
                        <ExternalLink size={9} />
                        {new URL(item.url).hostname}
                      </a>
                    )}
                  </div>

                  {/* Qty pill */}
                  {item.qty > 1 && (
                    <span style={{
                      padding: "2px 8px",
                      background: "var(--hq-inlay-bg)",
                      borderRadius: radius.full,
                      fontSize: 11,
                      color: colors.textMuted,
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      ×{item.qty}
                    </span>
                  )}

                  {/* Date */}
                  <span style={{
                    fontSize: 10.5,
                    color: colors.textMuted,
                    fontFamily: '"SF Mono", ui-monospace, monospace',
                    fontVariantNumeric: "tabular-nums",
                    flexShrink: 0,
                  }}>
                    {formatDate(item.created_at)}
                  </span>

                  {/* Price */}
                  {item.price_cents > 0 && (
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      fontFamily: '"SF Mono", ui-monospace, monospace',
                      fontVariantNumeric: "tabular-nums",
                      color: item.bought ? colors.textMuted : colors.text,
                      flexShrink: 0,
                    }}>
                      {formatPrice(item.price_cents)}
                    </span>
                  )}

                  {/* Delete on hover */}
                  {isHovered && (
                    <button
                      onClick={() => deletePurchase.mutate(item.id)}
                      style={{
                        background: "none", border: "none",
                        color: "var(--hq-danger)", cursor: "pointer",
                        padding: 4, borderRadius: 6,
                        display: "flex", alignItems: "center",
                        opacity: 0.7,
                        flexShrink: 0,
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Add item row */}
            <div style={{
              padding: "10px 16px",
              borderTop: `1px solid var(--hq-divider)`,
            }}>
              <button
                onClick={openQuickAdd}
                style={{
                  background: "none", border: "none",
                  color: colors.textMuted, cursor: "pointer",
                  fontSize: 12, display: "flex", alignItems: "center", gap: 6,
                  padding: 0,
                }}
              >
                + Adicionar produto
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── KpiCard ───────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: "var(--hq-card-bg)",
      border: `1px solid var(--hq-card-border)`,
      borderRadius: 10,
      padding: "12px 14px",
      backdropFilter: "blur(8px)",
    }}>
      <div style={{ fontSize: 10, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
        {label}
      </div>
      <div style={{
        fontSize: 16, fontWeight: 700, color,
        fontVariantNumeric: "tabular-nums",
        marginTop: 4, letterSpacing: "-0.015em",
      }}>
        {value}
      </div>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

const filterPillStyle = (active: boolean): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 5,
  padding: "5px 12px",
  background: active ? "var(--hq-accent-soft)" : "var(--hq-inlay-bg)",
  border: active ? `1px solid var(--hq-accent-border)` : `1px solid var(--hq-border)`,
  borderRadius: "999px",
  color: active ? "var(--hq-accent)" : colors.textSecondary,
  cursor: "pointer", fontSize: 12, fontWeight: active ? 600 : 400,
  transition: `all 0.15s cubic-bezier(0.4, 0, 0.2, 1)`,
});
