import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home, ListChecks, Search, Bookmark, Plus, Download,
  Archive, ChevronDown, ChevronRight, RotateCcw, Sun, Moon,
  BarChart2, PanelLeftClose, PanelLeftOpen, FileText, ShoppingCart, CalendarDays,
} from "lucide-react";
import { MiniCalendar } from "@/components/workspace/MiniCalendar";
import {
  useProjects, useArchivedProjects, useBookmarks,
  useCreateProject, useArchiveProject, useUnarchiveProject, useTasksByProject,
} from "@/lib/queries";
import { PROJECT_COLORS } from "@/lib/types";
import { useSearch, useQuickAdd } from "@/routes/__root";
import { SearchModal } from "@/components/workspace/SearchModal";
import { colors, spring, radius, NAV_TINTS } from "@/lib/tokens";
import { SquircleIcon, ProjectSquircle } from "@/components/ui/squircle-icon";
import { LogoWordmark, LogoMark } from "@/components/ui/Logo";
import { useTheme } from "@/hooks/use-theme";

const COLLAPSED_W = 64;
const EXPANDED_W = 248;

export function Sidebar() {
  const { data: projects = [] } = useProjects();
  const { data: archivedProjects = [] } = useArchivedProjects();
  const { data: bookmarks = [] } = useBookmarks();
  const createProject = useCreateProject();
  const archiveProject = useArchiveProject();
  const unarchiveProject = useUnarchiveProject();
  const { open: searchOpen, openSearch, closeSearch } = useSearch();
  const { openQuickAdd } = useQuickAdd();
  const { theme, toggle } = useTheme();
  const { location } = useRouterState();

  function quickAddTabForPath(path: string) {
    if (path.startsWith("/notes"))     return "note"     as const;
    if (path.startsWith("/bookmarks")) return "bookmark" as const;
    if (path.startsWith("/purchases")) return "purchase" as const;
    return "task" as const;
  }

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; }
    catch { return false; }
  });
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PROJECT_COLORS[0]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("sidebar-collapsed", String(next)); } catch {}
  }

  async function handleCreateProject() {
    const name = newName.trim();
    if (!name) return;
    await createProject.mutateAsync({ name, color: newColor, position: projects.length });
    setNewName(""); setNewColor(PROJECT_COLORS[0]); setCreating(false);
  }

  function handleExport() {
    const payload = { exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `pedro-hq-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  const w = collapsed ? COLLAPSED_W : EXPANDED_W;

  return (
    <>
      <aside style={{
        width: w,
        flexShrink: 0,
        height: "100vh",
        background: "var(--hq-panel)",
        backdropFilter: "blur(40px) saturate(1.8)",
        WebkitBackdropFilter: "blur(40px) saturate(1.8)",
        borderRight: `1px solid var(--hq-border)`,
        display: "flex",
        flexDirection: "column",
        color: colors.text,
        overflow: "hidden",
        transition: `width 220ms cubic-bezier(0.4, 0, 0.2, 1)`,
      }}>

        {/* Workspace header */}
        <div style={{
          padding: collapsed ? "12px 0 10px" : "12px 12px 10px",
          borderBottom: `1px solid var(--hq-border)`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          justifyContent: collapsed ? "center" : "space-between",
        }}>
          {collapsed ? (
            /* Collapsed: "cc" circle mark, acts as expand trigger */
            <button
              onClick={toggleCollapse}
              title="Expandir sidebar"
              style={{
                background: "transparent", border: "none",
                padding: 0, cursor: "pointer",
                display: "flex", alignItems: "center",
              }}
            >
              <LogoMark size={32} />
            </button>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                {/* Full "Plm cc" wordmark */}
                <LogoWordmark height={28} />
                <div style={{
                  fontSize: 10, color: colors.textMuted,
                  letterSpacing: "0.04em", paddingLeft: 2,
                }}>
                  plmcc.task · Pedro Melo
                </div>
              </div>
              <button
                onClick={toggleCollapse}
                title="Colapsar sidebar"
                style={{
                  background: "transparent", border: "none",
                  color: colors.textMuted, cursor: "pointer",
                  padding: 4, borderRadius: 6,
                  display: "flex", alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <PanelLeftClose size={16} />
              </button>
            </>
          )}
        </div>

        {/* Search button */}
        {!collapsed && (
          <div style={{ padding: "10px 10px 4px" }}>
            <button
              onClick={openSearch}
              style={{
                width: "100%",
                display: "flex", alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                background: "var(--hq-inlay-bg)",
                border: `1px solid var(--hq-border)`,
                borderRadius: radius.full,
                color: colors.textMuted,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              <SquircleIcon tint={NAV_TINTS.search} size={18}>
                <Search size={10} strokeWidth={2.5} />
              </SquircleIcon>
              <span style={{ flex: 1, textAlign: "left" }}>Buscar</span>
              <span className="kbd">⌘K</span>
            </button>
          </div>
        )}

        {/* Nav */}
        <div style={{
          padding: collapsed ? "8px 6px" : "8px 8px",
          borderBottom: `1px solid var(--hq-border)`,
          display: "flex", flexDirection: "column", gap: 1,
        }}>
          <NavLink to="/" tint={NAV_TINTS.home} icon={<Home size={13} strokeWidth={2.25} />} label="Meu dia" active={currentPath === "/"} collapsed={collapsed} />
          <NavLink to="/upcoming" tint={NAV_TINTS.upcoming} icon={<CalendarDays size={13} strokeWidth={2.25} />} label="Próximos 7 dias" active={currentPath === "/upcoming"} collapsed={collapsed} />
          <NavLink to="/tasks" tint={NAV_TINTS.tasks} icon={<ListChecks size={13} strokeWidth={2.25} />} label="Tarefas" active={currentPath === "/tasks"} collapsed={collapsed} />
          <NavLink to="/dashboard" tint={NAV_TINTS.dash} icon={<BarChart2 size={13} strokeWidth={2.25} />} label="Dashboard" active={currentPath === "/dashboard"} collapsed={collapsed} />
          <NavLink to="/notes" tint={NAV_TINTS.notes} icon={<FileText size={13} strokeWidth={2.25} />} label="Anotações" active={currentPath === "/notes"} collapsed={collapsed} />
          <NavLink to="/purchases" tint={NAV_TINTS.purchases} icon={<ShoppingCart size={13} strokeWidth={2.25} />} label="Compras" active={currentPath === "/purchases"} collapsed={collapsed} />
          <NavLink
            to="/bookmarks"
            tint={NAV_TINTS.bookmarks}
            icon={<Bookmark size={13} strokeWidth={2.25} />}
            label="Links salvos"
            active={currentPath === "/bookmarks"}
            collapsed={collapsed}
            badge={bookmarks.length > 0 ? bookmarks.length : undefined}
          />

          {/* Collapsed search button */}
          {collapsed && (
            <button
              onClick={openSearch}
              title="Buscar"
              style={navBtnStyle(false, collapsed)}
            >
              <SquircleIcon tint={NAV_TINTS.search} size={22}>
                <Search size={12} strokeWidth={2.5} />
              </SquircleIcon>
            </button>
          )}
        </div>

        {/* Mini calendar — expanded only */}
        {!collapsed && (
          <div style={{ padding: "8px 8px 4px", borderBottom: `1px solid var(--hq-border)` }}>
            <MiniCalendar />
          </div>
        )}

        {/* Projects section */}
        {!collapsed && (
          <>
            <div style={{ padding: "10px 8px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 10, color: colors.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, paddingLeft: 8 }}>
                Projetos
              </div>
              <button onClick={() => setCreating(true)} style={iconBtnStyle} title="Novo projeto">
                <Plus size={13} />
              </button>
            </div>

            {creating && (
              <div style={{
                margin: "0 8px 8px",
                padding: 10,
                background: colors.surface,
                borderRadius: radius.md,
                border: `1px solid var(--hq-border)`,
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                <input
                  autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateProject(); if (e.key === "Escape") setCreating(false); }}
                  placeholder="Nome do projeto"
                  style={inputSmStyle}
                />
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {PROJECT_COLORS.map((c) => (
                    <button key={c} onClick={() => setNewColor(c)} style={{
                      width: 18, height: 18, borderRadius: 9, background: c, cursor: "pointer",
                      border: newColor === c ? `2px solid ${colors.text}` : "2px solid transparent",
                    }} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={handleCreateProject} style={{
                    flex: 1, background: colors.accent, color: "#fff",
                    border: "none", padding: "6px 10px", borderRadius: radius.sm,
                    cursor: "pointer", fontSize: 12, fontWeight: 600,
                  }}>Criar</button>
                  <button onClick={() => setCreating(false)} style={{
                    background: colors.surfaceRaised, color: colors.textSecondary,
                    border: `1px solid var(--hq-border)`, padding: "6px 10px",
                    borderRadius: radius.sm, cursor: "pointer", fontSize: 12,
                  }}>✕</button>
                </div>
              </div>
            )}

            <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px", display: "flex", flexDirection: "column", gap: 1 }}>
              {projects.map((p) => (
                <ProjectRow
                  key={p.id} id={p.id} name={p.name} color={p.color}
                  active={currentPath === `/projects/${p.id}`}
                  hovered={hoveredId === p.id}
                  onMouseEnter={() => setHoveredId(p.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onArchive={() => archiveProject.mutate(p.id)}
                />
              ))}

              {archivedProjects.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => setShowArchived(!showArchived)} style={{
                    ...iconBtnStyle, width: "100%", padding: "6px 10px",
                    display: "flex", alignItems: "center", gap: 6, color: colors.textMuted,
                  }}>
                    {showArchived ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                    <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Arquivados ({archivedProjects.length})
                    </span>
                  </button>
                  {showArchived && archivedProjects.map((p) => (
                    <div key={p.id}
                      style={{ opacity: hoveredId === p.id ? 1 : 0.55 }}
                      onMouseEnter={() => setHoveredId(p.id)} onMouseLeave={() => setHoveredId(null)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px" }}>
                        <ProjectSquircle name={p.name} color={p.color} size={18} />
                        <Link to="/projects/$id" params={{ id: p.id }} style={{
                          flex: 1, fontSize: 13, color: colors.text, textDecoration: "none",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{p.name}</Link>
                        {hoveredId === p.id && (
                          <button onClick={() => unarchiveProject.mutate(p.id)} style={{ ...iconBtnStyle, padding: 2 }}>
                            <RotateCcw size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Collapsed: project squircles */}
        {collapsed && (
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            {projects.map((p) => (
              <Link key={p.id} to="/projects/$id" params={{ id: p.id }} title={p.name} style={{ textDecoration: "none" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: currentPath === `/projects/${p.id}` ? colors.accentBg : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: currentPath === `/projects/${p.id}` ? `1px solid var(--hq-accent-border)` : "1px solid transparent",
                  transition: `background 0.15s ${spring.gentle}`,
                }}>
                  <ProjectSquircle name={p.name} color={p.color} size={24} />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{
          borderTop: `1px solid var(--hq-border)`,
          padding: collapsed ? "8px 6px" : "8px",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          {/* Quick Add */}
          <button
            onClick={() => openQuickAdd(quickAddTabForPath(location.pathname))}
            title="Adicionar tarefa ou link"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "space-between",
              gap: 8,
              padding: collapsed ? "10px 0" : "9px 12px",
              background: colors.accentSoft,
              border: `1px solid var(--hq-accent-border)`,
              borderRadius: radius.md,
              color: colors.accent,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              width: "100%",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Plus size={15} style={{ flexShrink: 0 }} />
              {!collapsed && <span>Adicionar</span>}
            </div>
            {!collapsed && <span className="kbd">⌘N</span>}
          </button>

          {!collapsed && (
            <>
              <button onClick={handleExport} style={{ ...navBtnStyle(false, false), color: colors.textSecondary, fontSize: 12 }}>
                <Download size={13} /><span>Exportar JSON</span>
              </button>
              <button onClick={toggle} style={{ ...navBtnStyle(false, false), color: colors.textSecondary, fontSize: 12 }}>
                {theme === "light" ? <Moon size={13} /> : <Sun size={13} />}
                <span>{theme === "light" ? "Modo escuro" : "Modo claro"}</span>
              </button>
            </>
          )}

          {collapsed && (
            <button onClick={toggle} title={theme === "light" ? "Modo escuro" : "Modo claro"} style={{
              background: "transparent", border: "none",
              color: colors.textMuted, cursor: "pointer",
              padding: "8px 0", display: "flex", justifyContent: "center", alignItems: "center",
            }}>
              {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
            </button>
          )}
        </div>
      </aside>

      {searchOpen && <SearchModal onClose={closeSearch} />}
    </>
  );
}

// ── NavLink ───────────────────────────────────────────────────────────────────

function NavLink({
  to, label, tint, icon, active, collapsed, badge,
}: {
  to: string; label: string; tint: string; icon: React.ReactNode;
  active: boolean; collapsed: boolean; badge?: number;
}) {
  return (
    <Link to={to} style={{ textDecoration: "none" }} title={collapsed ? label : undefined}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: 10,
        padding: collapsed ? "9px 0" : "7px 10px",
        background: active ? colors.accentSoft : "transparent",
        color: active ? colors.accent : colors.text,
        border: "none",
        borderRadius: radius.md,
        cursor: "pointer",
        fontSize: 13,
        width: "100%",
        fontWeight: active ? 600 : 400,
        transition: `background 0.15s ${spring.gentle}`,
      }}
        onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(120,120,128,0.12)"; }}
        onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <SquircleIcon tint={tint} size={22}>{icon}</SquircleIcon>
        {!collapsed && (
          <>
            <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
            {badge !== undefined && <SidebarBadge>{badge}</SidebarBadge>}
          </>
        )}
      </div>
    </Link>
  );
}

// ── ProjectRow ────────────────────────────────────────────────────────────────

function ProjectRow({
  id, name, color, active, hovered, onMouseEnter, onMouseLeave, onArchive,
}: {
  id: string; name: string; color: string; active: boolean;
  hovered: boolean; onMouseEnter: () => void; onMouseLeave: () => void;
  onArchive: () => void;
}) {
  const { data: tasks = [] } = useTasksByProject(id);
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const pending = total - done;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const barColor = pct === 100 ? "var(--hq-success)" : color;

  return (
    <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <Link to="/projects/$id" params={{ id }} style={{ textDecoration: "none" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 9, padding: "6px 10px",
          background: active ? colors.accentSoft : hovered ? "rgba(120,120,128,0.10)" : "transparent",
          color: active ? colors.accent : colors.text,
          borderRadius: radius.md, fontSize: 13,
          transition: `background 0.15s ${spring.gentle}`,
        }}>
          <ProjectSquircle name={name} color={color} size={22} />
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
          {hovered ? (
            <button onClick={(e) => { e.preventDefault(); onArchive(); }} style={{ ...iconBtnStyle, padding: 2 }}>
              <Archive size={11} />
            </button>
          ) : pct === 100 && total > 0 ? (
            <span style={{ color: "var(--hq-success)", fontSize: 11 }}>✓</span>
          ) : pending > 0 ? (
            <SidebarBadge>{pending}</SidebarBadge>
          ) : null}
        </div>
      </Link>
      {total > 0 && (
        <div style={{ height: 2, background: colors.borderLight, margin: "0 10px 2px", borderRadius: 1, overflow: "hidden" }}>
          <div style={{ height: "100%", background: barColor, width: `${pct}%`, transition: `width 0.5s ${spring.default}` }} />
        </div>
      )}
    </div>
  );
}

// ── SidebarBadge ──────────────────────────────────────────────────────────────

function SidebarBadge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 10, padding: "1px 6px",
      background: "var(--hq-inlay-bg)", color: colors.textSecondary,
      borderRadius: "99px", minWidth: 18, textAlign: "center",
      fontVariantNumeric: "tabular-nums",
    }}>{children}</span>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const navBtnStyle = (active: boolean, collapsed: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  justifyContent: collapsed ? "center" : "flex-start",
  gap: 8,
  padding: collapsed ? "9px 0" : "7px 10px",
  background: active ? colors.accentSoft : "transparent",
  color: active ? colors.accent : colors.text,
  border: "none",
  borderRadius: radius.md,
  cursor: "pointer",
  fontSize: 13,
  width: "100%",
  textDecoration: "none",
  fontWeight: active ? 600 : 400,
});

const iconBtnStyle: React.CSSProperties = {
  background: "transparent", border: "none",
  color: colors.textSecondary, cursor: "pointer",
  padding: 4, borderRadius: 6,
  display: "flex", alignItems: "center",
};

const inputSmStyle: React.CSSProperties = {
  background: "var(--hq-inlay-bg)",
  border: `1px solid var(--hq-border)`,
  color: colors.text, padding: "7px 9px",
  borderRadius: radius.md, fontSize: 13,
  width: "100%", boxSizing: "border-box",
};
