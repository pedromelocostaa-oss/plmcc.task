import { useEffect, useRef, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { FINANCAS_TABS, isTabActive } from "../lib/nav";
import { colors } from "@/lib/tokens";

export type SubNavLink = ComponentType<{ to: string; style?: CSSProperties; current?: boolean; children: ReactNode }>;

// Barra de abas no topo de todas as telas de finanças: funciona no celular e com o menu lateral recolhido.
export function FinancasSubNavUI({ pathname, Link: LinkComp }: { pathname: string; Link: SubNavLink }) {
  const trilho = useRef<HTMLDivElement>(null);

  // No celular as abas rolam para o lado: leva a aba ativa para dentro da tela.
  useEffect(() => {
    trilho.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  return (
    <nav
      aria-label="Seções de finanças"
      style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "var(--hq-bg)", borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <div ref={trilho} style={{
        display: "flex", gap: 6, padding: "10px 16px", overflowX: "auto", whiteSpace: "nowrap",
        maxWidth: 1000, margin: "0 auto", scrollbarWidth: "none",
      }}>
        {FINANCAS_TABS.map((t) => {
          const active = isTabActive(pathname, t.to);
          return (
            <LinkComp
              key={t.to}
              to={t.to}
              current={active}
              style={{
                flexShrink: 0, padding: "7px 14px", borderRadius: 999, fontSize: 13, textDecoration: "none",
                fontWeight: active ? 600 : 500,
                background: active ? "rgba(0,122,255,0.12)" : "var(--hq-surface)",
                color: active ? "#007AFF" : colors.textSecondary,
              }}
            >
              {t.label}
            </LinkComp>
          );
        })}
      </div>
    </nav>
  );
}

const RouterLink: SubNavLink = ({ to, style, current, children }) => (
  <Link to={to as never} style={style} aria-current={current ? "page" : undefined}>{children}</Link>
);

export function FinancasSubNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return <FinancasSubNavUI pathname={pathname} Link={RouterLink} />;
}
