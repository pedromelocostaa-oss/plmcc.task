import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ListChecks, BarChart2, Bookmark, Plus } from "lucide-react";
import { useQuickAdd } from "@/routes/__root";
import { colors, spring, radius } from "@/lib/tokens";

const TABS = [
  { to: "/",          icon: Home,       label: "Início"   },
  { to: "/tasks",     icon: ListChecks, label: "Tarefas"  },
  { to: "/dashboard", icon: BarChart2,  label: "Painel"   },
  { to: "/bookmarks", icon: Bookmark,   label: "Links"    },
] as const;

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
        background: "rgba(18,18,18,0.88)",
        backdropFilter: "blur(40px) saturate(1.8)",
        WebkitBackdropFilter: "blur(40px) saturate(1.8)",
        borderTop: `1px solid rgba(84,84,88,0.45)`,
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
      {TABS.slice(0, 2).map(({ to, icon: Icon, label }) => {
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
              color: active ? colors.accent : colors.textMuted,
              transition: `color 0.15s ${spring.gentle}`,
              minHeight: 44,
            }}
          >
            <Icon
              size={22}
              strokeWidth={active ? 2.2 : 1.7}
              style={{ flexShrink: 0 }}
            />
            <span style={{
              fontSize: 10,
              fontWeight: active ? 600 : 400,
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}>
              {label}
            </span>
          </Link>
        );
      })}

      {/* Central Quick Add button */}
      <button
        onClick={openQuickAdd}
        aria-label="Adicionar"
        style={{
          flex: 0,
          width: 52,
          height: 52,
          borderRadius: 16,
          background: colors.accent,
          border: "none",
          color: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
          boxShadow: `0 4px 16px ${colors.accent}60`,
          transition: `transform 0.18s ${spring.bounce}, box-shadow 0.18s ${spring.gentle}`,
          marginTop: -8,
        }}
        onTouchStart={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.92)"; }}
        onTouchEnd={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {TABS.slice(2).map(({ to, icon: Icon, label }) => {
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
              color: active ? colors.accent : colors.textMuted,
              transition: `color 0.15s ${spring.gentle}`,
              minHeight: 44,
            }}
          >
            <Icon
              size={22}
              strokeWidth={active ? 2.2 : 1.7}
              style={{ flexShrink: 0 }}
            />
            <span style={{
              fontSize: 10,
              fontWeight: active ? 600 : 400,
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
