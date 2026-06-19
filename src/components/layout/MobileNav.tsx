import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ListChecks, BarChart2, ShoppingCart, Plus } from "lucide-react";
import { useQuickAdd } from "@/routes/__root";
import { colors, spring } from "@/lib/tokens";
import { PlmccWordmark } from "@/components/ui/PlmccLogo";

type TabDef = { to: string; icon: React.ComponentType<{ size: number; strokeWidth: number }>; label: string };

const LEFT_TABS: TabDef[] = [
  { to: "/",      icon: Home,       label: "Hoje"    },
  { to: "/tasks", icon: ListChecks, label: "Tarefas" },
];

const RIGHT_TABS: TabDef[] = [
  { to: "/dashboard", icon: BarChart2,   label: "Stats"  },
  { to: "/purchases", icon: ShoppingCart, label: "Compras" },
];

function quickAddTabForPath(path: string) {
  if (path.startsWith("/notes"))     return "note"     as const;
  if (path.startsWith("/bookmarks")) return "bookmark" as const;
  if (path.startsWith("/purchases")) return "purchase" as const;
  return "task" as const;
}

export function MobileNav() {
  const { openQuickAdd } = useQuickAdd();
  const { location } = useRouterState();
  const currentPath = location.pathname;

  return (
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
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
        height: "calc(56px + env(safe-area-inset-bottom, 0px))",
        gap: 0,
      }}
    >
      {LEFT_TABS.map(({ to, icon: Icon, label }) => {
        const active = currentPath === to;
        return (
          <Link
            key={to}
            to={to}
            style={{
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
            }}
          >
            <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
            <span style={{
              fontSize: 10,
              fontWeight: active ? 600 : 500,
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}>
              {label}
            </span>
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
          boxShadow: `0 4px 12px rgba(10,132,255,0.55)`,
          transition: `transform 0.18s ${spring.bounce}, box-shadow 0.18s ${spring.gentle}`,
          marginTop: -16,
        }}
        onTouchStart={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.92)"; }}
        onTouchEnd={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>

      {RIGHT_TABS.map(({ to, icon: Icon, label }) => {
        const active = currentPath === to;
        return (
          <Link
            key={to}
            to={to}
            style={{
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
            }}
          >
            <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
            <span style={{
              fontSize: 10,
              fontWeight: active ? 600 : 500,
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

// ─── MobileHeader ────────────────────────────────────────────────────────────

export function MobileHeader() {
  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99,
        height: "calc(52px + env(safe-area-inset-top, 0px))",
        paddingTop: "env(safe-area-inset-top, 0px)",
        background: "rgba(18,18,18,0.88)",
        backdropFilter: "blur(40px) saturate(1.8)",
        WebkitBackdropFilter: "blur(40px) saturate(1.8)",
        borderBottom: `1px solid rgba(84,84,88,0.45)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
    >
      <PlmccWordmark size={28} color="var(--brand-amber)" />
    </header>
  );
}
