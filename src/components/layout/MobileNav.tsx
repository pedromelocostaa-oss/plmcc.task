import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ListChecks, BarChart2, ShoppingCart, Plus, FileText, Bookmark, Search, MoreHorizontal, X } from "lucide-react";
import { useQuickAdd, useSearch } from "@/routes/__root";
import { colors, spring, radius } from "@/lib/tokens";

type TabDef = { to: string; icon: React.ComponentType<{ size: number; strokeWidth: number }>; label: string };

const MAIN_TABS: TabDef[] = [
  { to: "/",      icon: Home,       label: "Hoje"    },
  { to: "/tasks", icon: ListChecks, label: "Tarefas" },
];

const MORE_TABS: TabDef[] = [
  { to: "/dashboard", icon: BarChart2,    label: "Dashboard" },
  { to: "/purchases", icon: ShoppingCart, label: "Compras"   },
  { to: "/notes",     icon: FileText,     label: "Anotações" },
  { to: "/bookmarks", icon: Bookmark,     label: "Links"     },
];

function quickAddTabForPath(path: string) {
  if (path.startsWith("/notes"))     return "note"     as const;
  if (path.startsWith("/bookmarks")) return "bookmark" as const;
  if (path.startsWith("/purchases")) return "purchase" as const;
  return "task" as const;
}

const tabStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 3,
  paddingTop: 8,
  paddingBottom: 6,
  textDecoration: "none",
  color: active ? "var(--hq-accent)" : colors.textMuted,
  transition: `color 0.15s ${spring.gentle}`,
  minHeight: 44,
  background: "none",
  border: "none",
  cursor: "pointer",
});

const tabLabelStyle = (active: boolean): React.CSSProperties => ({
  fontSize: 10,
  fontWeight: active ? 600 : 500,
  letterSpacing: "-0.01em",
  lineHeight: 1,
});

export function MobileNav() {
  const { openQuickAdd } = useQuickAdd();
  const { openSearch } = useSearch();
  const { location } = useRouterState();
  const currentPath = location.pathname;
  const [moreOpen, setMoreOpen] = useState(false);

  const moreActive = MORE_TABS.some(t => currentPath === t.to || currentPath.startsWith(t.to + "/"));

  return (
    <>
      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 99,
            background: "var(--hq-overlay)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              bottom: "calc(56px + env(safe-area-inset-bottom, 0px) + 8px)",
              right: 12,
              background: "var(--hq-modal-bg)",
              backdropFilter: "blur(30px) saturate(1.8)",
              WebkitBackdropFilter: "blur(30px) saturate(1.8)",
              border: `1px solid var(--hq-card-border)`,
              borderRadius: radius.lg,
              boxShadow: "var(--hq-shadow-float)",
              padding: "6px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              minWidth: 180,
            }}
          >
            <button
              onClick={() => { openSearch(); setMoreOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px",
                background: "none",
                border: "none",
                borderRadius: radius.sm,
                color: colors.text,
                cursor: "pointer",
                fontSize: 14,
                width: "100%",
                textAlign: "left",
              }}
            >
              <Search size={18} strokeWidth={1.75} />
              Buscar
            </button>
            {MORE_TABS.map(({ to, icon: Icon, label }) => {
              const active = currentPath === to || currentPath.startsWith(to + "/");
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMoreOpen(false)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px",
                    background: active ? "var(--hq-accent-bg)" : "none",
                    border: "none",
                    borderRadius: radius.sm,
                    color: active ? "var(--hq-accent)" : colors.text,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    textDecoration: "none",
                  }}
                >
                  <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: "var(--hq-bg-elevated)",
          backdropFilter: "blur(20px) saturate(1.8)",
          WebkitBackdropFilter: "blur(20px) saturate(1.8)",
          borderTop: `1px solid var(--hq-border)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          paddingBottom: "max(8px, var(--hq-safe-bottom))",
          paddingLeft: "env(safe-area-inset-left, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
          height: "calc(56px + env(safe-area-inset-bottom, 0px))",
          gap: 0,
        }}
      >
        {MAIN_TABS.map(({ to, icon: Icon, label }) => {
          const active = currentPath === to;
          return (
            <Link key={to} to={to} style={tabStyle(active)}>
              <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
              <span style={tabLabelStyle(active)}>{label}</span>
            </Link>
          );
        })}

        {/* Central FAB */}
        <button
          onClick={() => openQuickAdd(quickAddTabForPath(currentPath))}
          aria-label="Adicionar"
          style={{
            flex: 0,
            width: 44,
            height: 44,
            borderRadius: 14,
            background: "var(--hq-accent)",
            border: "none",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            boxShadow: `0 4px 12px rgba(229,132,48,0.45)`,
            transition: `transform 0.18s ${spring.bounce}, box-shadow 0.18s ${spring.gentle}`,
            marginTop: -16,
          }}
          onTouchStart={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.92)"; }}
          onTouchEnd={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>

        {/* Compras (direct tab) */}
        {(() => {
          const active = currentPath === "/purchases";
          return (
            <Link to="/purchases" style={tabStyle(active)}>
              <ShoppingCart size={22} strokeWidth={active ? 2.25 : 1.75} />
              <span style={tabLabelStyle(active)}>Compras</span>
            </Link>
          );
        })()}

        {/* More menu */}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          style={tabStyle(moreActive || moreOpen)}
        >
          {moreOpen
            ? <X size={22} strokeWidth={1.75} />
            : <MoreHorizontal size={22} strokeWidth={moreActive ? 2.25 : 1.75} />}
          <span style={tabLabelStyle(moreActive || moreOpen)}>Mais</span>
        </button>
      </nav>
    </>
  );
}

