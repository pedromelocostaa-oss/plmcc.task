import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home, LayoutGrid, Search, Bookmark, Plus, Download,
  Archive, ChevronDown, ChevronRight, RotateCcw, Sun, Moon,
} from "lucide-react";
import { useProjects, useArchivedProjects, useBookmarks, useCreateProject, useArchiveProject, useUnarchiveProject, useTasksByProject } from "@/lib/queries";
import { PROJECT_COLORS } from "@/lib/types";
import { useSearch } from "@/routes/__root";
import { SearchModal } from "@/components/workspace/SearchModal";
import { colors } from "@/lib/tokens";
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
        width: 240, flexShrink: 0, height: "100vh", background: "#010409",
        borderRight: `1px solid ${colors.borderLight}`, display: "flex", flexDirection: "column",
        color: colors.text, overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 16px 14px", borderBottom: `1px solid ${colors.borderLight}` }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: colors.textMuted, letterSpacing: 1 }}>
            COMMAND CENTER
          </div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Pedro's HQ</div>
        </div>

        {/* Nav */}
        <div style={{ padding: "8px 8px", borderBottom: `1px solid ${colors.borderLight}`, display: "flex", flexDirection: "column", gap: 2 }}>
          <NavLink to="/" label="Meu dia" icon={<Home size={14} />} active={currentPath === "/"} />
          <NavLink to="/tasks" label="Tarefas" icon={<LayoutGrid size={14} />} active={currentPath === "/tasks"} />
          <NavLink to="/dashboard" label="Dashboard" icon={<LayoutGrid size={14} />} active={currentPath === "/dashboard"} />
          <button onClick={openSearch} style={navBtnStyle(false)}>
            <Search size={14} />
            <span style={{ flex: 1, textAlign: "left" }}>Buscar</span>
            <span className="kbd">/</span>
          </button>
          <NavLink
            to="/bookmarks"
            label="Links Salvos"
            icon={<Bookmark size={14} />}
            active={currentPath === "/bookmarks"}
            badge={bookmarks.length > 0 ? bookmarks.length : undefined}
          />
        </div>

        {/* Projects header */}
        <div style={{ padding: "10px 8px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: colors.textMuted, letterSpacing: 1, paddingLeft: 8 }}>
            PROJETOS
          </div>
          <button onClick={() => setCreating(true)} style={iconBtnStyle}><Plus size={14} /></button>
        </div>

        {/* New project form */}
        {creating && (
          <div style={{ padding: "6px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
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
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "2px 4px" }}>
              {PROJECT_COLORS.map((c) => (
                <button key={c} onClick={() => setNewColor(c)} style={{
                  width: 16, height: 16, borderRadius: 8, background: c,
                  border: newColor === c ? "2px solid #e6edf3" : "1px solid #30363d", cursor: "pointer",
                }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={handleCreateProject} style={{ ...smBtnStyle, background: colors.accent, color: "#0d1117", flex: 1 }}>
                Criar
              </button>
              <button onClick={() => setCreating(false)} style={smBtnStyle}>✕</button>
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
                fontFamily: "JetBrains Mono, monospace", color: colors.textMuted,
              }}>
                {showArchived ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                ARQUIVADOS ({archivedProjects.length})
              </button>
              {showArchived && archivedProjects.map((p) => (
                <div key={p.id} style={{ opacity: hoveredId === p.id ? 1 : 0.6 }}
                  onMouseEnter={() => setHoveredId(p.id)} onMouseLeave={() => setHoveredId(null)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px" }}>
                    <span style={{ width: 7, height: 7, borderRadius: 4, background: p.color, flexShrink: 0 }} />
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
        <div style={{ borderTop: `1px solid ${colors.borderLight}`, padding: 8 }}>
          <button onClick={handleExport} style={{ ...navBtnStyle(false), color: colors.textSecondary, fontSize: 12 }}>
            <Download size={13} /><span>Exportar JSON</span>
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
          display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
          background: active ? colors.accentBg : "transparent",
          color: active ? colors.accent : colors.text,
          borderRadius: 6, fontSize: 13,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: 4, background: color, flexShrink: 0 }} />
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
      <div style={{ height: 2, background: colors.borderLight, margin: "0 10px 2px", borderRadius: 1, overflow: "hidden" }}>
        <div style={{ height: "100%", background: barColor, width: `${pct}%`, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

function SidebarBadge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: "JetBrains Mono, monospace", fontSize: 10, padding: "1px 6px",
      background: colors.borderLight, color: colors.textSecondary,
      borderRadius: 4, minWidth: 18, textAlign: "center",
    }}>{children}</span>
  );
}

const navBtnStyle = (active: boolean): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
  background: active ? colors.accentBg : "transparent",
  color: active ? colors.accent : colors.text,
  border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, width: "100%",
  textDecoration: "none",
});

const iconBtnStyle: React.CSSProperties = {
  background: "transparent", border: "none", color: colors.textSecondary,
  cursor: "pointer", padding: 4, borderRadius: 4, display: "flex", alignItems: "center",
};

const inputSmStyle: React.CSSProperties = {
  background: "#0d1117", border: `1px solid ${colors.border}`, color: colors.text,
  padding: "6px 8px", borderRadius: 6, fontSize: 12,
};

const smBtnStyle: React.CSSProperties = {
  background: colors.borderLight, color: colors.text, border: `1px solid ${colors.border}`,
  padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12,
};
