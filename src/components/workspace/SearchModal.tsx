import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAllTasks, useBookmarks, useLinksByProject, useProjects } from "@/lib/queries";
import { hostname } from "@/lib/format";
import { colors } from "@/lib/tokens";

export function SearchModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const { data: allTasks = [] } = useAllTasks();
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

    type Result = { kind: string; id: string; title: string; sub: string; color: string; onClick: () => void };
    const out: Result[] = [];

    allTasks.slice(0, 50).forEach((t) => {
      const match = t.title.toLowerCase().includes(s) ||
        (t.description ?? "").toLowerCase().includes(s);
      if (match) {
        const p = projects.find((x) => x.id === t.project_id);
        out.push({
          kind: "tarefa", id: t.id, title: t.title, sub: p?.name || "",
          color: p?.color || colors.textSecondary,
          onClick: () => { nav({ to: "/projects/$id", params: { id: t.project_id } }); onClose(); },
        });
      }
    });

    projects.forEach((p) => {
      if (p.name.toLowerCase().includes(s)) {
        out.push({
          kind: "projeto", id: p.id, title: p.name, sub: "",
          color: p.color,
          onClick: () => { nav({ to: "/projects/$id", params: { id: p.id } }); onClose(); },
        });
      }
    });

    bookmarks.forEach((b) => {
      const match = b.title.toLowerCase().includes(s) || b.url.toLowerCase().includes(s) || b.tag.toLowerCase().includes(s);
      if (match) {
        out.push({
          kind: "bookmark", id: b.id, title: b.title || hostname(b.url), sub: b.tag || hostname(b.url),
          color: "#a855f7", onClick: () => window.open(b.url, "_blank"),
        });
      }
    });

    return out.slice(0, 30);
  }, [q, allTasks, bookmarks, projects, nav, onClose]);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100,
      display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 100,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 560, background: colors.surface, border: `1px solid ${colors.border}`,
        borderRadius: 10, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
          borderBottom: `1px solid ${colors.borderLight}`,
        }}>
          <Search size={16} color={colors.textSecondary} />
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar tarefas, projetos, bookmarks..."
            style={{ flex: 1, background: "transparent", border: "none", color: colors.text, fontSize: 14 }}
          />
          <span className="kbd">esc</span>
        </div>

        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {q.length < 2 ? (
            <div style={{ padding: 32, color: colors.textMuted, fontSize: 12 }}>
              <div style={{ marginBottom: 14 }}>Digite ao menos 2 caracteres.</div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", color: colors.textSecondary, marginBottom: 8 }}>ATALHOS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div><span className="kbd">N</span> nova tarefa</div>
                <div><span className="kbd">/</span> abrir busca</div>
                <div><span className="kbd">esc</span> fechar</div>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: 24, color: colors.textMuted, fontSize: 13 }}>
              Nada encontrado para &quot;{q}&quot;
            </div>
          ) : results.map((r) => (
            <button key={r.kind + r.id} onClick={r.onClick} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
              background: "transparent", border: "none", borderBottom: `1px solid ${colors.borderLight}`,
              color: colors.text, cursor: "pointer", textAlign: "left",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: r.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
                {r.sub && <div style={{ fontSize: 11, color: colors.textMuted }}>{r.sub}</div>}
              </div>
              <span style={{
                fontFamily: "JetBrains Mono, monospace", fontSize: 9, padding: "2px 6px", borderRadius: 4,
                background: colors.borderLight, color: colors.textSecondary,
              }}>{r.kind}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
