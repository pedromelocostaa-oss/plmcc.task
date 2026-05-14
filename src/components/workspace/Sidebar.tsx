import { useState } from "react";
import { Home, LayoutGrid, Search, Bookmark, Plus, Download, Archive, ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { useProjects, useTasks, useProjectMut, useBookmarks, useLinks, useNotes } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { PROJECT_COLOR_KEYS, PROJECT_COLORS } from "@/lib/types";

type View = { kind: "home" } | { kind: "dashboard" } | { kind: "bookmarks" } | { kind: "project"; id: string };

export function Sidebar({ view, setView, openSearch }: { view: View; setView: (v: View) => void; openSearch: () => void }) {
  const { user } = useAuth();
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: bookmarks = [] } = useBookmarks();
  const { data: links = [] } = useLinks();
  const { data: notes = [] } = useNotes();
  const projectMut = useProjectMut();
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("orange");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);

  function projStats(pid: string) {
    const t = tasks.filter((x) => x.project_id === pid);
    const done = t.filter((x) => x.status === "done").length;
    const pending = t.length - done;
    const pct = t.length === 0 ? 0 : Math.round((done / t.length) * 100);
    return { done, pending, pct, total: t.length };
  }

  async function createProject() {
    const name = newName.trim();
    if (!name || !user) return;
    await projectMut.create.mutateAsync({ name, color: newColor, user_id: user.id, position: active.length } as any);
    setNewName(""); setNewColor("orange"); setCreating(false);
  }

  async function exportJson() {
    const payload = { exported_at: new Date().toISOString(), projects, tasks, links, notes, bookmarks };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url; a.download = `pedro-hq-${date}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  const navItems = [
    { kind: "home", label: "Início", icon: Home },
    { kind: "dashboard", label: "Dashboard", icon: LayoutGrid },
  ] as const;

  return (
    <aside style={{
      width: 220, flexShrink: 0, height: "100vh", background: "#010409",
      borderRight: "1px solid #21262d", display: "flex", flexDirection: "column",
      color: "#e6edf3", overflow: "hidden",
    }}>
      <div style={{ padding: "16px 16px 14px", borderBottom: "1px solid #21262d" }}>
        <div style={{ fontFamily: "DM Mono", fontSize: 10, color: "#6e7681", letterSpacing: 1 }}>WORKSPACE</div>
        <div style={{ fontSize: 17, fontWeight: 700 }}>Pedro's HQ</div>
      </div>

      <div style={{ padding: "8px 8px", borderBottom: "1px solid #21262d", display: "flex", flexDirection: "column", gap: 2 }}>
        {navItems.map((n) => {
          const Icon = n.icon;
          const activeView = view.kind === n.kind;
          return (
            <button key={n.kind} onClick={() => setView({ kind: n.kind } as View)} style={navBtn(activeView)}>
              <Icon size={14} /><span style={{ flex: 1, textAlign: "left" }}>{n.label}</span>
            </button>
          );
        })}
        <button onClick={openSearch} style={navBtn(false)}>
          <Search size={14} /><span style={{ flex: 1, textAlign: "left" }}>Busca global</span>
          <span className="kbd">/</span>
        </button>
        <button onClick={() => setView({ kind: "bookmarks" })} style={navBtn(view.kind === "bookmarks")}>
          <Bookmark size={14} /><span style={{ flex: 1, textAlign: "left" }}>Links Salvos</span>
          {bookmarks.length > 0 && <Badge>{bookmarks.length}</Badge>}
        </button>
      </div>

      <div style={{ padding: "10px 8px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "DM Mono", fontSize: 10, color: "#6e7681", letterSpacing: 1, paddingLeft: 8 }}>PROJETOS</div>
        <button onClick={() => setCreating(true)} style={iconBtn}><Plus size={14} /></button>
      </div>

      {creating && (
        <div style={{ padding: "6px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
          <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") createProject(); if (e.key === "Escape") setCreating(false); }}
            placeholder="Nome do projeto" style={{ ...inputSm }} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "2px 4px" }}>
            {PROJECT_COLOR_KEYS.map((c) => (
              <button key={c} onClick={() => setNewColor(c)} style={{
                width: 16, height: 16, borderRadius: 8, background: PROJECT_COLORS[c],
                border: newColor === c ? "2px solid #e6edf3" : "1px solid #30363d", cursor: "pointer",
              }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={createProject} style={{ ...smBtn, background: "#f97316", color: "#0d1117", flex: 1 }}>Criar</button>
            <button onClick={() => setCreating(false)} style={smBtn}>✕</button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px", display: "flex", flexDirection: "column", gap: 1 }}>
        {active.map((p) => {
          const st = projStats(p.id);
          const isActive = view.kind === "project" && view.id === p.id;
          const color = PROJECT_COLORS[p.color] || p.color;
          const barColor = st.pct === 100 ? "#3fb950" : color;
          return (
            <div key={p.id} onMouseEnter={() => setHoveredId(p.id)} onMouseLeave={() => setHoveredId(null)}
              style={{ position: "relative" }}>
              <button onClick={() => setView({ kind: "project", id: p.id })} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                background: isActive ? "rgba(249,115,22,0.10)" : "transparent",
                border: "none", color: isActive ? "#f97316" : "#e6edf3", cursor: "pointer",
                borderRadius: 6, fontSize: 13, textAlign: "left",
              }}>
                <span style={{ width: 7, height: 7, borderRadius: 4, background: color, flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                {hoveredId === p.id ? (
                  <span onClick={(e) => { e.stopPropagation(); projectMut.update.mutate({ id: p.id, patch: { archived: true } as any }); }}
                    style={{ ...iconBtn, padding: 2 }}><Archive size={12} /></span>
                ) : st.total > 0 && st.pct === 100 ? (
                  <span style={{ color: "#3fb950", fontSize: 12 }}>✓</span>
                ) : st.pending > 0 ? <Badge>{st.pending}</Badge> : null}
              </button>
              <div style={{ height: 2, background: "#21262d", margin: "0 10px 2px", borderRadius: 1, overflow: "hidden" }}>
                <div style={{ height: "100%", background: barColor, width: `${st.pct}%`, transition: "width 0.4s" }} />
              </div>
            </div>
          );
        })}

        {archived.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <button onClick={() => setShowArchived(!showArchived)} style={{
              ...iconBtn, width: "100%", padding: "6px 10px", display: "flex",
              alignItems: "center", gap: 6, fontSize: 11, fontFamily: "DM Mono", color: "#6e7681",
            }}>
              {showArchived ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              ARQUIVADOS ({archived.length})
            </button>
            {showArchived && archived.map((p) => {
              const color = PROJECT_COLORS[p.color] || p.color;
              const isActive = view.kind === "project" && view.id === p.id;
              return (
                <div key={p.id} onMouseEnter={() => setHoveredId(p.id)} onMouseLeave={() => setHoveredId(null)}
                  style={{ position: "relative", opacity: hoveredId === p.id ? 1 : 0.6 }}>
                  <button onClick={() => setView({ kind: "project", id: p.id })} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                    background: isActive ? "rgba(249,115,22,0.10)" : "transparent",
                    border: "none", color: "#e6edf3", cursor: "pointer", borderRadius: 6, fontSize: 13, textAlign: "left",
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: 4, background: color }} />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                    {hoveredId === p.id && (
                      <span onClick={(e) => { e.stopPropagation(); projectMut.update.mutate({ id: p.id, patch: { archived: false } as any }); }}
                        style={{ ...iconBtn, padding: 2 }}><RotateCcw size={12} /></span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid #21262d", padding: 8 }}>
        <button onClick={exportJson} style={{ ...navBtn(false), color: "#8b949e", fontSize: 12 }}>
          <Download size={13} /><span>Exportar JSON</span>
        </button>
      </div>
    </aside>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: "DM Mono", fontSize: 10, padding: "1px 6px",
      background: "#21262d", color: "#8b949e", borderRadius: 4, minWidth: 18, textAlign: "center",
    }}>{children}</span>
  );
}

const navBtn = (active: boolean): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
  background: active ? "rgba(249,115,22,0.10)" : "transparent",
  color: active ? "#f97316" : "#e6edf3",
  border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, width: "100%",
});

const iconBtn: React.CSSProperties = {
  background: "transparent", border: "none", color: "#8b949e",
  cursor: "pointer", padding: 4, borderRadius: 4, display: "flex", alignItems: "center",
};

const inputSm: React.CSSProperties = {
  background: "#0d1117", border: "1px solid #30363d", color: "#e6edf3",
  padding: "6px 8px", borderRadius: 6, fontSize: 12,
};

const smBtn: React.CSSProperties = {
  background: "#21262d", color: "#e6edf3", border: "1px solid #30363d",
  padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12,
};

export type { View };
