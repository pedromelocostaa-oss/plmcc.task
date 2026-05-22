import { useState } from "react";
import {
  ShoppingCart, Trash2, ExternalLink, Pencil, X, Check,
  Plus, Minus, Tag, Calendar, Package, FileText, Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { usePurchases, useTogglePurchaseBought, useDeletePurchase, useUpdatePurchase } from "@/lib/queries";
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

const PURCHASE_CATEGORIES = [
  { value: "pessoal",  label: "Pessoal",  emoji: "🏠" },
  { value: "casa",     label: "Casa",     emoji: "🛋️" },
  { value: "trabalho", label: "Trabalho", emoji: "💼" },
  { value: "presente", label: "Presente", emoji: "🎁" },
  { value: "viagem",   label: "Viagem",   emoji: "✈️" },
  { value: "tech",     label: "Tech",     emoji: "💻" },
];

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

type PurchaseItem = {
  id: string;
  name: string;
  url?: string | null;
  urls?: { url: string; label: string }[];
  price_cents: number;
  qty: number;
  category: string;
  description?: string | null;
  bought: boolean;
  bought_at?: string | null;
  created_at: string;
};

export function PurchasesView() {
  const { data: purchases = [], isLoading } = usePurchases();
  const toggleBought = useTogglePurchaseBought();
  const deletePurchase = useDeletePurchase();
  const { openQuickAdd } = useQuickAdd();

  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<PurchaseItem | null>(null);
  const [editingItem, setEditingItem] = useState<PurchaseItem | null>(null);

  const typedPurchases = purchases as PurchaseItem[];

  const filtered = filterCategory
    ? typedPurchases.filter((p) => p.category === filterCategory)
    : typedPurchases;

  const pending = typedPurchases.filter((p) => !p.bought);
  const bought  = typedPurchases.filter((p) => p.bought);

  const pendingTotal = pending.reduce((sum, p) => sum + (p.price_cents || 0) * (p.qty || 1), 0);
  const boughtTotal  = bought.reduce((sum, p) => sum + (p.price_cents || 0) * (p.qty || 1), 0);
  const mostExpensivePending = pending.length > 0
    ? pending.reduce((max, p) => (p.price_cents || 0) > (max.price_cents || 0) ? p : max, pending[0])
    : null;

  const categoriesInUse = Array.from(new Set(typedPurchases.map((p) => p.category))).filter(Boolean);

  function openDetail(item: PurchaseItem) {
    setDetailItem(item);
  }

  function openEdit(item: PurchaseItem, e: React.MouseEvent) {
    e.stopPropagation();
    setDetailItem(null);
    setEditingItem(item);
  }

  return (
    <div style={{ padding: "28px", minHeight: "100dvh", background: "var(--hq-bg)" }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{
          fontSize: "clamp(22px, 5vw, 32px)", fontWeight: 700,
          letterSpacing: "-0.025em", margin: 0, color: colors.text,
        }}>
          Compras
        </h1>
        {typedPurchases.length > 0 && (
          <p style={{ margin: "4px 0 0", fontSize: 13, color: colors.textSecondary }}>
            {pending.length} pendente{pending.length !== 1 ? "s" : ""} · {bought.length} comprado{bought.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Category filter pills */}
      {categoriesInUse.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          <button onClick={() => setFilterCategory(null)} style={filterPillStyle(filterCategory === null)}>
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
      ) : typedPurchases.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart size={24} />}
          iconColor="#FF6B35"
          title="Nenhuma compra na lista"
          description="Adicione produtos que você quer comprar, com preço estimado e categoria."
          actionLabel="Adicionar produto"
          onAction={() => openQuickAdd("purchase")}
          kbd="⌘N"
        />
      ) : (
        <>
          {/* KPI strip */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10, marginBottom: 20,
          }}>
            <KpiCard label="Pendente"  value={formatPrice(pendingTotal)} color="var(--hq-accent)" />
            <KpiCard label="Comprado"  value={formatPrice(boughtTotal)}  color="var(--hq-success)" />
            <KpiCard
              label="Mais caro pendente"
              value={mostExpensivePending
                ? `${mostExpensivePending.name.slice(0, 14)}… ${formatPrice(mostExpensivePending.price_cents || 0)}`
                : "—"}
              color={colors.textSecondary}
            />
          </div>

          {/* List */}
          <div style={{
            background: "var(--hq-card-bg)",
            border: `1px solid var(--hq-card-border)`,
            borderRadius: 14, overflow: "hidden", backdropFilter: "blur(8px)",
          }}>
            {filtered.map((item, idx) => {
              const catInfo  = CATEGORIES[item.category] ?? { emoji: "📦", label: item.category };
              const isHov    = hoveredId === item.id;
              const allLinks = (item.urls ?? []).filter((l) => l.url);
              const firstUrl = allLinks[0]?.url ?? item.url;

              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => openDetail(item)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px",
                    borderBottom: idx < filtered.length - 1 ? `1px solid var(--hq-divider)` : "none",
                    background: isHov ? "var(--hq-surface-hover)" : "transparent",
                    transition: `background 0.1s ${spring.gentle}`,
                    cursor: "pointer",
                  }}
                >
                  {/* Checkbox */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleBought.mutate({ id: item.id, bought: item.bought }); }}
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

                  {/* Category badge */}
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: "var(--hq-inlay-bg)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, flexShrink: 0,
                  }}>
                    {catInfo.emoji}
                  </div>

                  {/* Name + link preview */}
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
                    {firstUrl && (
                      <div style={{
                        fontSize: 10.5, color: colors.textMuted,
                        fontFamily: '"SF Mono", ui-monospace, monospace',
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        display: "flex", alignItems: "center", gap: 3,
                      }}>
                        <ExternalLink size={9} />
                        {allLinks.length > 1
                          ? `${allLinks.length} lojas`
                          : (allLinks[0]?.label || (() => { try { return new URL(firstUrl).hostname; } catch { return firstUrl; } })())}
                      </div>
                    )}
                  </div>

                  {/* Qty */}
                  {item.qty > 1 && (
                    <span style={{
                      padding: "2px 8px", background: "var(--hq-inlay-bg)",
                      borderRadius: radius.full, fontSize: 11,
                      color: colors.textMuted, fontVariantNumeric: "tabular-nums",
                    }}>
                      ×{item.qty}
                    </span>
                  )}

                  {/* Date */}
                  <span style={{
                    fontSize: 10.5, color: colors.textMuted,
                    fontFamily: '"SF Mono", ui-monospace, monospace',
                    fontVariantNumeric: "tabular-nums", flexShrink: 0,
                  }}>
                    {formatDateShort(item.created_at)}
                  </span>

                  {/* Price */}
                  {item.price_cents > 0 && (
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      fontFamily: '"SF Mono", ui-monospace, monospace',
                      fontVariantNumeric: "tabular-nums",
                      color: item.bought ? colors.textMuted : colors.text, flexShrink: 0,
                    }}>
                      {formatPrice(item.price_cents)}
                    </span>
                  )}

                  {/* Hover actions */}
                  {isHov && (
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => openEdit(item, e)} title="Editar" style={rowIconBtn}>
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deletePurchase.mutate(item.id); }}
                        title="Excluir"
                        style={{ ...rowIconBtn, color: "var(--hq-danger)" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add row */}
            <div style={{ padding: "10px 16px", borderTop: `1px solid var(--hq-divider)` }}>
              <button
                onClick={() => openQuickAdd("purchase")}
                style={{
                  background: "none", border: "none", color: colors.textMuted,
                  cursor: "pointer", fontSize: 12,
                  display: "flex", alignItems: "center", gap: 6, padding: 0,
                }}
              >
                + Adicionar produto
              </button>
            </div>
          </div>
        </>
      )}

      {/* Detail modal */}
      {detailItem && (
        <PurchaseDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onEdit={(item) => { setDetailItem(null); setEditingItem(item); }}
          onToggleBought={(item) => toggleBought.mutate({ id: item.id, bought: item.bought })}
          onDelete={(item) => { deletePurchase.mutate(item.id); setDetailItem(null); }}
        />
      )}

      {/* Edit modal */}
      {editingItem && (
        <PurchaseEditModal item={editingItem} onClose={() => setEditingItem(null)} />
      )}
    </div>
  );
}

// ── Detail modal ──────────────────────────────────────────────────────────────

function PurchaseDetailModal({
  item, onClose, onEdit, onToggleBought, onDelete,
}: {
  item: PurchaseItem;
  onClose: () => void;
  onEdit: (item: PurchaseItem) => void;
  onToggleBought: (item: PurchaseItem) => void;
  onDelete: (item: PurchaseItem) => void;
}) {
  const catInfo  = CATEGORIES[item.category] ?? { emoji: "📦", label: item.category };
  const allLinks = (item.urls ?? []).filter((l) => l.url);
  const firstUrl = allLinks[0]?.url ?? item.url;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "var(--hq-overlay)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 440, maxWidth: "calc(100vw - 32px)",
          background: "var(--hq-modal-bg)",
          backdropFilter: "blur(30px) saturate(1.8)",
          WebkitBackdropFilter: "blur(30px) saturate(1.8)",
          border: `1px solid var(--hq-card-border)`,
          borderRadius: radius.xl,
          boxShadow: "var(--hq-shadow-float)",
          overflow: "hidden",
          animation: "modalIn 0.2s cubic-bezier(0.2,0.85,0.25,1)",
        }}
      >
        <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.94) translateY(-8px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>

        {/* Hero strip */}
        <div style={{
          padding: "20px 20px 16px",
          borderBottom: `1px solid var(--hq-divider)`,
          display: "flex", gap: 14, alignItems: "flex-start",
        }}>
          {/* Big emoji */}
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "var(--hq-inlay-bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, flexShrink: 0,
          }}>
            {catInfo.emoji}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 17, fontWeight: 700, color: colors.text,
              letterSpacing: "-0.02em",
              textDecoration: item.bought ? "line-through" : "none",
              opacity: item.bought ? 0.6 : 1,
              wordBreak: "break-word",
            }}>
              {item.name}
            </div>
            <div style={{
              marginTop: 4, fontSize: 12, color: colors.textMuted,
              display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
            }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "2px 8px",
                background: item.bought ? "var(--hq-success-bg, rgba(48,209,88,.12))" : "var(--hq-accent-soft)",
                color: item.bought ? "var(--hq-success)" : "var(--hq-accent)",
                borderRadius: 999, fontSize: 11, fontWeight: 600,
              }}>
                {item.bought ? "✓ Comprado" : "Pendente"}
              </span>
              <span style={{ color: "var(--hq-divider)" }}>·</span>
              <span>{catInfo.label}</span>
            </div>
          </div>

          <button onClick={onClose} style={{ background: "transparent", border: "none", color: colors.textMuted, cursor: "pointer", padding: 4, flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* Detail rows */}
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Price & Qty */}
          <div style={{ display: "flex", gap: 12 }}>
            {item.price_cents > 0 && (
              <DetailChip
                icon={<span style={{ fontSize: 12 }}>R$</span>}
                label="Preço estimado"
                value={formatPrice(item.price_cents * (item.qty || 1))}
                sub={item.qty > 1 ? `${item.qty} × ${formatPrice(item.price_cents)}` : undefined}
              />
            )}
            {item.qty > 1 && (
              <DetailChip
                icon={<Package size={13} />}
                label="Quantidade"
                value={`${item.qty} unidades`}
              />
            )}
          </div>

          {/* Links */}
          {(allLinks.length > 0 || firstUrl) && (
            <div>
              <div style={sectionLabel}><LinkIcon size={11} /> Onde comprar</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                {allLinks.length > 0
                  ? allLinks.map((l, i) => (
                      <a
                        key={i}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={linkRowStyle}
                      >
                        <ExternalLink size={13} style={{ flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--hq-accent)" }}>
                            {l.label || (() => { try { return new URL(l.url).hostname; } catch { return l.url; } })()}
                          </div>
                          <div style={{
                            fontSize: 11, color: colors.textMuted,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {l.url}
                          </div>
                        </div>
                      </a>
                    ))
                  : firstUrl && (
                      <a href={firstUrl} target="_blank" rel="noopener noreferrer" style={linkRowStyle}>
                        <ExternalLink size={13} style={{ flexShrink: 0 }} />
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--hq-accent)" }}>
                          {(() => { try { return new URL(firstUrl).hostname; } catch { return firstUrl; } })()}
                        </div>
                      </a>
                    )
                }
              </div>
            </div>
          )}

          {/* Description */}
          {item.description && (
            <div>
              <div style={sectionLabel}><FileText size={11} /> Descrição</div>
              <p style={{
                margin: "6px 0 0", fontSize: 13, color: colors.textSecondary,
                lineHeight: 1.6, whiteSpace: "pre-wrap",
              }}>
                {item.description}
              </p>
            </div>
          )}

          {/* Dates */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <div style={metaChip}>
              <Calendar size={10} />
              Adicionado em {formatDate(item.created_at)}
            </div>
            {item.bought && item.bought_at && (
              <div style={{ ...metaChip, color: "var(--hq-success)", background: "var(--hq-success-bg, rgba(48,209,88,.1))" }}>
                <Check size={10} />
                Comprado em {formatDate(item.bought_at)}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div style={{
          padding: "12px 20px 18px",
          borderTop: `1px solid var(--hq-divider)`,
          display: "flex", gap: 8,
        }}>
          <button
            onClick={() => onToggleBought(item)}
            style={{
              flex: 1, padding: "10px",
              background: item.bought ? "var(--hq-inlay-bg)" : "var(--hq-success, #30d158)",
              color: item.bought ? colors.textSecondary : "#fff",
              border: item.bought ? `1px solid var(--hq-border)` : "none",
              borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              transition: "all 0.15s",
            }}
          >
            <Check size={14} />
            {item.bought ? "Marcar como pendente" : "Marcar como comprado"}
          </button>
          <button
            onClick={() => onEdit(item)}
            title="Editar"
            style={{
              padding: "10px 14px",
              background: "var(--hq-inlay-bg)",
              border: `1px solid var(--hq-border)`,
              borderRadius: 10, cursor: "pointer", color: colors.textSecondary,
              display: "flex", alignItems: "center", gap: 6, fontSize: 13,
            }}
          >
            <Pencil size={13} /> Editar
          </button>
          <button
            onClick={() => onDelete(item)}
            title="Excluir"
            style={{
              padding: "10px 14px",
              background: "transparent",
              border: `1px solid var(--hq-border)`,
              borderRadius: 10, cursor: "pointer",
              color: "var(--hq-danger)",
              display: "flex", alignItems: "center",
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail helpers ────────────────────────────────────────────────────────────

function DetailChip({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div style={{
      flex: 1,
      background: "var(--hq-inlay-bg)",
      border: `1px solid var(--hq-border)`,
      borderRadius: 10, padding: "10px 12px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, color: colors.textMuted, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: colors.text, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 5,
  fontSize: 10, fontWeight: 700, color: colors.textMuted,
  textTransform: "uppercase", letterSpacing: "0.06em",
};

const linkRowStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "8px 12px",
  background: "var(--hq-inlay-bg)",
  border: `1px solid var(--hq-border)`,
  borderRadius: 8,
  textDecoration: "none",
  color: "inherit",
  overflow: "hidden",
  transition: "border-color 0.15s",
};

const metaChip: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  padding: "4px 10px",
  background: "var(--hq-inlay-bg)",
  border: `1px solid var(--hq-border)`,
  borderRadius: 999,
  fontSize: 11, color: colors.textMuted,
};

// ── Edit modal ────────────────────────────────────────────────────────────────

function PurchaseEditModal({ item, onClose }: { item: PurchaseItem; onClose: () => void }) {
  const updatePurchase = useUpdatePurchase();

  const [name, setName] = useState(item.name);
  const [links, setLinks] = useState<{ id: string; url: string; label: string }[]>(
    item.urls && item.urls.length > 0
      ? item.urls.map((l, i) => ({ id: String(i), url: l.url, label: l.label }))
      : [{ id: "0", url: item.url ?? "", label: "" }]
  );
  const [price, setPrice] = useState(
    item.price_cents > 0 ? (item.price_cents / 100).toFixed(2).replace(".", ",") : ""
  );
  const [qty, setQty]           = useState(item.qty ?? 1);
  const [category, setCategory] = useState(item.category ?? "pessoal");
  const [description, setDescription] = useState(item.description ?? "");

  function addLink() { setLinks((ls) => [...ls, { id: crypto.randomUUID(), url: "", label: "" }]); }
  function removeLink(id: string) { setLinks((ls) => ls.length > 1 ? ls.filter((l) => l.id !== id) : ls); }
  function updateLink(id: string, field: "url" | "label", value: string) {
    setLinks((ls) => ls.map((l) => l.id === id ? { ...l, [field]: value } : l));
  }

  async function handleSave() {
    if (!name.trim()) return;
    try {
      const priceCents = price ? Math.round(parseFloat(price.replace(",", ".")) * 100) : 0;
      const validLinks = links
        .filter((l) => l.url.trim())
        .map((l) => {
          let url = l.url.trim();
          if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
          return { url, label: l.label.trim() };
        });

      await updatePurchase.mutateAsync({
        id: item.id,
        data: {
          name: name.trim(),
          urls: validLinks,
          url: validLinks[0]?.url ?? null,
          price_cents: priceCents,
          qty,
          category,
          description: description.trim() || null,
        },
      });
      toast.success("Compra atualizada");
      onClose();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Erro ao atualizar");
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: "var(--hq-overlay)",
        backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480, maxWidth: "calc(100vw - 32px)", maxHeight: "90dvh",
          background: "var(--hq-modal-bg)",
          backdropFilter: "blur(30px) saturate(1.8)",
          WebkitBackdropFilter: "blur(30px) saturate(1.8)",
          border: `1px solid var(--hq-card-border)`,
          borderRadius: radius.xl, boxShadow: "var(--hq-shadow-float)",
          overflow: "hidden", display: "flex", flexDirection: "column",
          animation: "modalIn 0.22s cubic-bezier(0.2,0.85,0.25,1)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px 0" }}>
          <h2 style={{ flex: 1, fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
            Editar produto
          </h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: colors.textMuted, cursor: "pointer", padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 18px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>

          <div>
            <label style={labelStyle}>Produto *</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do produto" style={modalInputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Links das lojas</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
              {links.map((link, idx) => (
                <div key={link.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                    <input
                      value={link.url}
                      onChange={(e) => updateLink(link.id, "url", e.target.value)}
                      placeholder={`https://... (loja ${idx + 1})`}
                      style={{ ...modalInputStyle, marginBottom: 0 }}
                    />
                    <input
                      value={link.label}
                      onChange={(e) => updateLink(link.id, "label", e.target.value)}
                      placeholder="Nome da loja (Amazon, Shopee...)"
                      style={{ ...modalInputStyle, fontSize: 11, padding: "5px 10px", color: colors.textSecondary }}
                    />
                  </div>
                  {links.length > 1 && (
                    <button type="button" onClick={() => removeLink(link.id)} style={{ background: "none", border: "none", color: colors.textMuted, cursor: "pointer", padding: 4 }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addLink}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "none", border: `1px dashed var(--hq-border)`,
                  borderRadius: radius.md, color: colors.textMuted,
                  cursor: "pointer", fontSize: 12, padding: "6px 12px", alignSelf: "flex-start",
                }}
              >
                <Plus size={12} /> Adicionar outro link
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Descrição (opcional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Cor, tamanho, referência..." rows={2} style={{ ...modalInputStyle, resize: "vertical", lineHeight: 1.5 }} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Preço estimado</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: colors.textMuted, pointerEvents: "none" }}>R$</span>
                <input type="text" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" style={{ ...modalInputStyle, paddingLeft: 32 }} />
              </div>
            </div>
            <div style={{ width: 100 }}>
              <label style={labelStyle}>Qtd.</label>
              <div style={{ display: "flex", alignItems: "center", background: "var(--hq-inlay-bg)", border: `1px solid var(--hq-border)`, borderRadius: radius.md, overflow: "hidden", height: 36 }}>
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ flex: 1, background: "none", border: "none", color: colors.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, height: "100%" }}><Minus size={12} /></button>
                <span style={{ width: 32, textAlign: "center", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{qty}</span>
                <button type="button" onClick={() => setQty((q) => q + 1)} style={{ flex: 1, background: "none", border: "none", color: colors.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, height: "100%" }}><Plus size={12} /></button>
              </div>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Categoria</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {PURCHASE_CATEGORIES.map((cat) => {
                const active = category === cat.value;
                return (
                  <button
                    key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "5px 11px",
                      background: active ? "var(--hq-accent-soft)" : "var(--hq-inlay-bg)",
                      border: active ? `1.5px solid var(--hq-accent-border)` : `1px solid var(--hq-border)`,
                      borderRadius: radius.full,
                      color: active ? "var(--hq-accent)" : colors.textSecondary,
                      cursor: "pointer", fontSize: 12, fontWeight: active ? 600 : 400,
                    }}
                  >
                    <span>{cat.emoji}</span>{cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              onClick={handleSave}
              disabled={!name.trim() || updatePurchase.isPending}
              style={{
                flex: 1, background: "var(--hq-accent)", color: "#fff",
                border: "none", padding: "11px", borderRadius: 10,
                cursor: "pointer", fontSize: 14, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <Check size={14} />
              {updatePurchase.isPending ? "Salvando..." : "Salvar alterações"}
            </button>
            <button
              onClick={onClose}
              style={{
                background: "transparent", color: colors.textSecondary,
                border: `1px solid var(--hq-border)`, padding: "11px 16px",
                borderRadius: 10, cursor: "pointer", fontSize: 14,
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── KpiCard ───────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: "var(--hq-card-bg)", border: `1px solid var(--hq-card-border)`,
      borderRadius: 10, padding: "12px 14px", backdropFilter: "blur(8px)",
    }}>
      <div style={{ fontSize: 10, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color, fontVariantNumeric: "tabular-nums", marginTop: 4, letterSpacing: "-0.015em" }}>
        {value}
      </div>
    </div>
  );
}

// ── style helpers ─────────────────────────────────────────────────────────────

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

const rowIconBtn: React.CSSProperties = {
  background: "var(--hq-inlay-bg)", border: `1px solid var(--hq-border)`,
  color: colors.textSecondary, cursor: "pointer", padding: 5, borderRadius: 6,
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600, color: colors.textMuted,
  marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em",
};

const modalInputStyle: React.CSSProperties = {
  width: "100%", background: "var(--hq-inlay-bg)", border: `1px solid var(--hq-border)`,
  color: colors.text, padding: "8px 10px", borderRadius: 8, fontSize: 13, boxSizing: "border-box",
};
