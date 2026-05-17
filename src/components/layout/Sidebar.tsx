import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home, ListChecks, Search, Bookmark, Plus, Download,
  Archive, ChevronDown, ChevronRight, RotateCcw, Sun, Moon, BarChart2,
} from "lucide-react";
import { useProjects, useArchivedProjects, useBookmarks, useCreateProject, useArchiveProject, useUnarchiveProject, useTasksByProject } from "@/lib/queries";
import { PROJECT_COLORS } from "@/lib/types";
import { useSearch } from "@/routes/__root";
import { SearchModal } from "@/components/workspace/SearchModal";
import { colors, spring, radius } from "@/lib/tokens";
import { useTheme } from "@/hooks/use-theme";

export function Sidebar() {
  const { data: projects = [] } = useProjects();
  const { data: archivedProjects = [] } = useArchivedProjects();
  const { data: bookmarks = [] } = useBookmarks();
  const createProject = useCreateProject();
  const archiveProject = useArchiveProject();
  const unarchiveProject = useUnarchiveProject();
  const { open: searchOpen, openSearch, closeSearch } = useSearch();
  const { theme, toggle } = useTheme();

  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PROJECT_COLORS[0]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  async function handleCreateProject() {
    const name = newName.trim();
    if (!name) return;
    await createProject.mutateAsync({ name, color: newColor, position: projects.length });
    setNewName(""); setNewColor(PROJECT_COLORS[0]); setCreating(false);
  }

  function handleExport() {
    const payload = {
      exportedAt: new Date().toISOString(),
      note: "Exportado do Pedro's Command Center",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url; a.download = `pedro-hq-${date}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <aside style={{
        width: 240,
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
      }}>
        {/* Header */}
        <div style={{ padding: "20px 16px 16px", borderBottom: `1px solid ${colors.separator}` }}>
          <div style={{
            fontSize: 10,
            color: colors.textMuted,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 500,
            marginBottom: 4,
          }}>
            Command Center
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Pedro's HQ</div>
        </div>

        {/* Nav */}
        <div style={{ padding: "8px 8px", borderBottom: `1px solid ${colors.separator}`, display: "flex", flexDirection: "column", gap: 1 }}>
          <NavLink to="/" label="Meu dia" icon={<Home size={15} />} active={currentPath === "/"} />
          <NavLink to="/tasks" label="Tarefas" icon={<ListChecks size={15} />} active={currentPath === "/tasks"} />
          <NavLink to="/dashboard" label="Dashboard" icon={<BarChart2 size={15} />} active={currentPath === "/dashboard"} />
          <button onClick={openSearch} style={navBtnStyle(false)}>
            <Search size={15} />
            <span style={{ flex: 1, textAlign: "left" }}>Buscar</span>
            <span className="kbd">/</span>
          </button>
          <NavLink
            to="/bookmarks"
            label="Links Salvos"
            icon={<Bookmark size={15} />}
            active={currentPath === "/bookmarks"}
            badge={bookmarks.length > 0 ? bookmarks.length : undefined}
          />
        </div>

        {/* Projects header */}
        <div style={{ padding: "12px 8px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{
            fontSize: 10,
            color: colors.textMuted,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 500,
            paddingLeft: 8,
          }}>
            Projetos
          </div>
          <button onClick={() => setCreating(true)} style={iconBtnStyle} title="Novo projeto"><Plus size={14} /></button>
        </div>

        {/* New project form */}
        {creating && (
          <div style={{
            margin: "0 8px 8px",
            padding: "10px",
            background: colors.surface,
            borderRadius: radius.md,
            border: `1px solid ${colors.separator}`,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateProject();
                if (e.key === "Escape") setCreating(false);
              }}
              placeholder="Nome do projeto"
              style={inputSmStyle}
            />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PROJECT_COLORS.map((c) => (
                <button key={c} onClick={() => setNewColor(c)} style={{
                  width: 18, height: 18, borderRadius: 9, background: c, cursor: "pointer",
                  border: newColor === c ? `2px solid ${colors.text}` : "2px solid transparent",
                  transition: `border-color 0.15s ${spring.snappy}`,
                }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={handleCreateProject} style={{
                flex: 1, background: colors.accent, color: "#000",
                border: "none", padding: "6px 10px", borderRadius: radius.sm,
                cursor: "pointer", fontSize: 12, fontWeight: 600,
              }}>
                Criar
              </button>
              <button onClick={() => setCreating(false)} style={{
                background: colors.surfaceRaised, color: colors.textSecondary,
                border: `1px solid ${colors.separator}`, padding: "6px 10px",
                borderRadius: radius.sm, cursor: "pointer", fontSize: 12,
              }}>✕</button>
            </div>
          </div>
        )}

        {/* Active projects list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px", display: "flex", flexDirection: "column", gap: 1 }}>
          {projects.map((p) => (
            <ProjectRow
              key={p.id}
              id={p.id}
              name={p.name}
              color={p.color}
              active={currentPath === `/projects/${p.id}`}
              hovered={hoveredId === p.id}
              onMouseEnter={() => setHoveredId(p.id)}
              onMouseLeave={() => setHoveredId(null)}
              onArchive={() => archiveProject.mutate(p.id)}
            />
          ))}

          {/* Archived section */}
          {archivedProjects.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <button onClick={() => setShowArchived(!showArchived)} style={{
                ...iconBtnStyle, width: "100%", padding: "6px 10px", display: "flex",
                alignItems: "center", gap: 6, fontSize: 11,
                color: colors.textMuted,
              }}>
                {showArchived ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>
                  Arquivados ({archivedProjects.length})
                </span>
              </button>
              {showArchived && archivedProjects.map((p) => (
                <div key={p.id} style={{ opacity: hoveredId === p.id ? 1 : 0.55, transition: `opacity 0.2s ${spring.gentle}` }}
                  onMouseEnter={() => setHoveredId(p.id)} onMouseLeave={() => setHoveredId(null)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 4, background: p.color, flexShrink: 0 }} />
                    <Link to="/projects/$id" params={{ id: p.id }} style={{
                      flex: 1, fontSize: 13, color: colors.text, textDecoration: "none",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {p.name}
                    </Link>
                    {hoveredId === p.id && (
                      <button onClick={() => unarchiveProject.mutate(p.id)} style={{ ...iconBtnStyle, padding: 2 }}>
                        <RotateCcw size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: `1px solid ${colors.separator}`,
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}>
          <button onClick={handleExport} style={{ ...navBtnStyle(false), color: colors.textSecondary, fontSize: 12 }}>
            <Download size={13} /><span>Exportar JSON</span>
          </button>
          <button onClick={toggle} style={{ ...navBtnStyle(false), color: colors.textSecondary, fontSize: 12 }}>
            {theme === "light" ? <Moon size={13} /> : <Sun size={13} />}
            <span>{theme === "light" ? "Modo escuro" : "Modo claro"}</span>
          </button>
        </div>
      </aside>

      {searchOpen && <SearchModal onClose={closeSearch} />}
    </>
  );
}

function NavLink({
  to, label, icon, active, badge,
}: {
  to: string; label: string; icon: React.ReactNode; active: boolean; badge?: number;
}) {
  return (
    <Link to={to} style={{ textDecoration: "none" }}>
      <div style={navBtnStyle(active)}>
        {icon}
        <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
        {badge !== undefined && <SidebarBadge>{badge}</SidebarBadge>}
      </div>
    </Link>
  );
}

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
    <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ position: "relative" }}>
      <Link to="/projects/$id" params={{ id }} style={{ textDecoration: "none" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          background: active ? colors.accentBg : hovered ? "rgba(255,255,255,0.05)" : "transparent",
          color: active ? colors.accent : colors.text,
          borderRadius: "8px",
          fontSize: 13,
          transition: `background 0.18s ${spring.gentle}`,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: 4, background: color, flexShrink: 0,
            boxShadow: `0 0 6px ${color}66`,
          }} />
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
          {hovered ? (
            <button onClick={(e) => { e.preventDefault(); onArchive(); }} style={{ ...iconBtnStyle, padding: 2 }}>
              <Archive size={12} />
            </button>
          ) : pct === 100 && total > 0 ? (
            <span style={{ color: colors.success, fontSize: 12 }}>✓</span>
          ) : pending > 0 ? (
            <SidebarBadge>{pending}</SidebarBadge>
          ) : null}
        </div>
      </Link>
      {total > 0 && (
        <div style={{ height: 2, background: colors.borderLight, margin: "0 10px 2px", borderRadius: 1, overflow: "hidden" }}>
          <div style={{
            height: "100%", background: barColor, width: `${pct}%`,
            transition: `width 0.5s ${spring.default}`,
          }} />
        </div>
      )}
    </div>
  );
}

function SidebarBadge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 10,
      padding: "1px 6px",
      background: colors.surfaceRaised,
      color: colors.textSecondary,
      borderRadius: "99px",
      minWidth: 18,
      textAlign: "center",
      fontVariantNumeric: "tabular-nums",
    }}>{children}</span>
  );
}

const navBtnStyle = (active: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "7px 10px",
  background: active ? colors.accentBg : "transparent",
  color: active ? colors.accent : colors.text,
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: 13,
  width: "100%",
  textDecoration: "none",
  fontWeight: active ? 600 : 400,
  transition: `background 0.18s cubic-bezier(0.4,0,0.2,1)`,
});

const iconBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: colors.textSecondary,
  cursor: "pointer",
  padding: 4,
  borderRadius: 6,
  display: "flex",
  alignItems: "center",
};

const inputSmStyle: React.CSSProperties = {
  background: colors.surfaceRaised,
  border: `1px solid ${colors.separator}`,
  color: colors.text,
  padding: "7px 9px",
  borderRadius: "8px",
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
};
