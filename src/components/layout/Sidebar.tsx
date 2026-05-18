import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home, ListChecks, Search, Bookmark, Plus, Download,
  Archive, ChevronDown, ChevronRight, RotateCcw, Sun, Moon,
  BarChart2, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import {
  useProjects, useArchivedProjects, useBookmarks,
  useCreateProject, useArchiveProject, useUnarchiveProject, useTasksByProject,
} from "@/lib/queries";
import { PROJECT_COLORS } from "@/lib/types";
import { useSearch, useQuickAdd } from "@/routes/__root";
import { SearchModal } from "@/components/workspace/SearchModal";
import { colors, spring, radius } from "@/lib/tokens";
import { useTheme } from "@/hooks/use-theme";

const COLLAPSED_W = 56;
const EXPANDED_W = 240;

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
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(40px) saturate(1.6)",
        WebkitBackdropFilter: "blur(40px) saturate(1.6)",
        borderRight: `1px solid ${colors.separator}`,
        display: "flex",
        flexDirection: "column",
        color: colors.text,
        overflow: "hidden",
        transition: `width 0.25s ${spring.snappy}`,
      }}>

        {/* Header + collapse toggle */}
        <div style={{
          padding: collapsed ? "16px 0 14px" : "16px 12px 14px",
          borderBottom: `1px solid ${colors.separator}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          justifyContent: collapsed ? "center" : "space-between",
        }}>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 10, color: colors.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 500, marginBottom: 2 }}>
                Command Center
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>Pedro's HQ</div>
            </div>
          )}
          <button
            onClick={toggleCollapse}
            title={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            style={{
              background: "transparent", border: "none",
              color: colors.textMuted, cursor: "pointer",
              padding: 4, borderRadius: 6,
              display: "flex", alignItems: "center",
              flexShrink: 0,
            }}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        {/* Nav */}
        <div style={{
          padding: collapsed ? "8px 4px" : "8px",
          borderBottom: `1px solid ${colors.separator}`,
          display: "flex", flexDirection: "column", gap: 1,
        }}>
          <NavLink to="/" icon={<Home size={15} />} label="Meu dia" active={currentPath === "/"} collapsed={collapsed} />
          <NavLink to="/tasks" icon={<ListChecks size={15} />} label="Tarefas" active={currentPath === "/tasks"} collapsed={collapsed} />
          <NavLink to="/dashboard" icon={<BarChart2 size={15} />} label="Dashboard" active={currentPath === "/dashboard"} collapsed={collapsed} />

          <button
            onClick={openSearch}
            title="Buscar"
            style={navBtnStyle(false, collapsed)}
          >
            <Search size={15} style={{ flexShrink: 0 }} />
            {!collapsed && <><span style={{ flex: 1, textAlign: "left" }}>Buscar</span><span className="kbd">/</span></>}
          </button>

          <NavLink
            to="/bookmarks"
            icon={<Bookmark size={15} />}
            label="Links Salvos"
            active={currentPath === "/bookmarks"}
            collapsed={collapsed}
            badge={bookmarks.length > 0 ? bookmarks.length : undefined}
          />
        </div>

        {/* Projects section */}
        {!collapsed && (
          <>
            <div style={{ padding: "10px 8px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 10, color: colors.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 500, paddingLeft: 8 }}>
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
                border: `1px solid ${colors.separator}`,
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
                    flex: 1, background: colors.accent, color: "#000",
                    border: "none", padding: "6px 10px", borderRadius: radius.sm,
                    cursor: "pointer", fontSize: 12, fontWeight: 600,
                  }}>Criar</button>
                  <button onClick={() => setCreating(false)} style={{
                    background: colors.surfaceRaised, color: colors.textSecondary,
                    border: `1px solid ${colors.separator}`, padding: "6px 10px",
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
                        <span style={{ width: 7, height: 7, borderRadius: 4, background: p.color, flexShrink: 0 }} />
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

        {/* Collapsed: project dots */}
        {collapsed && (
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            {projects.map((p) => (
              <Link key={p.id} to="/projects/$id" params={{ id: p.id }} title={p.name} style={{ textDecoration: "none" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: currentPath === `/projects/${p.id}` ? colors.accentBg : colors.surfaceRaised,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: currentPath === `/projects/${p.id}` ? `1px solid ${colors.accentBorder}` : "1px solid transparent",
                }}>
                  <span style={{ width: 10, height: 10, borderRadius: 5, background: p.color, boxShadow: `0 0 6px ${p.color}80` }} />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Footer: Quick Add + utility buttons */}
        <div style={{
          borderTop: `1px solid ${colors.separator}`,
          padding: collapsed ? "8px 4px" : "8px",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          {/* Quick Add */}
          <button
            onClick={openQuickAdd}
            title="Adicionar tarefa ou link"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 8,
              padding: collapsed ? "10px 0" : "9px 10px",
              background: colors.accentBg,
              border: `1px solid ${colors.accentBorder}`,
              borderRadius: radius.sm,
              color: colors.accent,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              width: "100%",
            }}
          >
            <Plus size={15} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Adicionar</span>}
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
  to, label, icon, active, collapsed, badge,
}: {
  to: string; label: string; icon: React.ReactNode;
  active: boolean; collapsed: boolean; badge?: number;
}) {
  return (
    <Link to={to} style={{ textDecoration: "none" }} title={collapsed ? label : undefined}>
      <div style={navBtnStyle(active, collapsed)}>
        <span style={{ flexShrink: 0 }}>{icon}</span>
        {!collapsed && <><span style={{ flex: 1, textAlign: "left" }}>{label}</span>{badge !== undefined && <SidebarBadge>{badge}</SidebarBadge>}</>}
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
  const barColor = pct === 100 ? colors.success : color;

  return (
    <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <Link to="/projects/$id" params={{ id }} style={{ textDecoration: "none" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
          background: active ? colors.accentBg : hovered ? "rgba(255,255,255,0.05)" : "transparent",
          color: active ? colors.accent : colors.text,
          borderRadius: "8px", fontSize: 13,
          transition: `background 0.15s ${spring.gentle}`,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: color, flexShrink: 0, boxShadow: `0 0 5px ${color}66` }} />
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
          {hovered ? (
            <button onClick={(e) => { e.preventDefault(); onArchive(); }} style={{ ...iconBtnStyle, padding: 2 }}>
              <Archive size={11} />
            </button>
          ) : pct === 100 && total > 0 ? (
            <span style={{ color: colors.success, fontSize: 11 }}>✓</span>
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
      background: colors.surfaceRaised, color: colors.textSecondary,
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
  background: active ? colors.accentBg : "transparent",
  color: active ? colors.accent : colors.text,
  border: "none",
  borderRadius: "8px",
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
  background: colors.surfaceRaised,
  border: `1px solid ${colors.separator}`,
  color: colors.text, padding: "7px 9px",
  borderRadius: "8px", fontSize: 13,
  width: "100%", boxSizing: "border-box",
};
