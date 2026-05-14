import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useTasks, useLinks, useBookmarks, useProjects } from "@/lib/queries";
import { PROJECT_COLORS } from "@/lib/types";
import { hostname } from "@/lib/format";
import type { View } from "./Sidebar";

export function SearchModal({ onClose, setView }: { onClose: () => void; setView: (v: View) => void }) {
  const [q, setQ] = useState("");
  const { data: tasks = [] } = useTasks();
  const { data: links = [] } = useLinks();
  const { data: bookmarks = [] } = useBookmarks();
  const { data: projects = [] } = useProjects();

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const out: { kind: string; id: string; title: string; sub: string; color: string; onClick: () => void }[] = [];
    tasks.forEach((t) => {
      if (t.title.toLowerCase().includes(s) || t.description.toLowerCase().includes(s)) {
        const p = projects.find((x) => x.id === t.project_id);
        out.push({
          kind: "tarefa", id: t.id, title: t.title, sub: p?.name || "",
          color: p ? (PROJECT_COLORS[p.color] || p.color) : "#8b949e",
          onClick: () => { if (p) { setView({ kind: "project", id: p.id }); onClose(); } },
        });
      }
    });
    links.forEach((l) => {
      if (l.title.toLowerCase().includes(s) || l.url.toLowerCase().includes(s)) {
        const p = projects.find((x) => x.id === l.project_id);
        out.push({
          kind: "link", id: l.id, title: l.title || hostname(l.url), sub: hostname(l.url),
          color: p ? (PROJECT_COLORS[p.color] || p.color) : "#8b949e",
          onClick: () => window.open(l.url, "_blank"),
        });
      }
    });
    bookmarks.forEach((b) => {
      if (b.title.toLowerCase().includes(s) || b.url.toLowerCase().includes(s) || b.tag.toLowerCase().includes(s)) {
        out.push({
          kind: "bookmark", id: b.id, title: b.title || hostname(b.url), sub: b.tag || hostname(b.url),
          color: "#a855f7", onClick: () => window.open(b.url, "_blank"),
        });
      }
    });
    return out.slice(0, 30);
  }, [q, tasks, links, bookmarks, projects, setView, onClose]);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100,
      display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 100,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 560, background: "#161b22", border: "1px solid #30363d", borderRadius: 10,
        overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid #21262d" }}>
          <Search size={16} color="#8b949e" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar tarefas, links, bookmarks..."
            style={{ flex: 1, background: "transparent", border: "none", color: "#e6edf3", fontSize: 14 }} />
          <span className="kbd">esc</span>
        </div>
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {q.length < 2 ? (
            <div style={{ padding: 32, color: "#6e7681", fontSize: 12 }}>
              <div style={{ marginBottom: 14 }}>Digite ao menos 2 caracteres.</div>
              <div style={{ fontFamily: "DM Mono", color: "#8b949e", marginBottom: 8 }}>ATALHOS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div><span className="kbd">N</span> nova tarefa</div>
                <div><span className="kbd">/</span> abrir busca</div>
                <div><span className="kbd">esc</span> fechar</div>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: 24, color: "#6e7681", fontSize: 13 }}>Nenhum resultado.</div>
          ) : results.map((r) => (
            <button key={r.kind + r.id} onClick={r.onClick} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
              background: "transparent", border: "none", borderBottom: "1px solid #21262d",
              color: "#e6edf3", cursor: "pointer", textAlign: "left",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: r.color }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
                <div style={{ fontSize: 11, color: "#6e7681" }}>{r.sub}</div>
              </div>
              <span style={{
                fontFamily: "DM Mono", fontSize: 9, padding: "2px 6px", borderRadius: 4,
                background: "#21262d", color: "#8b949e",
              }}>{r.kind}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
