import { useEffect, useMemo, useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAllTasks, useBookmarks, useLinksByProject, useProjects } from "@/lib/queries";
import { hostname } from "@/lib/format";
import { colors, spring, radius } from "@/lib/tokens";

export function SearchModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const nav = useNavigate();
  const { data: allTasks = [] } = useAllTasks();
  const { data: bookmarks = [] } = useBookmarks();
  const { data: projects = [] } = useProjects();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => i + 1); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(0, i - 1)); }
    }
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
          color: "#BF5AF2", onClick: () => window.open(b.url, "_blank"),
        });
      }
    });

    return out.slice(0, 30);
  }, [q, allTasks, bookmarks, projects, nav, onClose]);

  // clamp selected index
  const clampedIdx = Math.min(selectedIdx, Math.max(0, results.length - 1));

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        zIndex: 200,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 80,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 580,
          background: "rgba(28,28,30,0.92)",
          backdropFilter: "blur(30px) saturate(1.8)",
          WebkitBackdropFilter: "blur(30px) saturate(1.8)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: radius.xl,
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.05) inset",
          animation: "spotlightIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <style>{`
          @keyframes spotlightIn {
            from { opacity: 0; transform: scale(0.94) translateY(-12px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Search input row */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 18px",
          borderBottom: q.length >= 2 && results.length > 0 ? `1px solid rgba(84,84,88,0.4)` : "none",
        }}>
          <Search size={18} color={colors.textMuted} />
          <input
            autoFocus
            value={q}
            onChange={(e) => { setQ(e.target.value); setSelectedIdx(0); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[clampedIdx]) results[clampedIdx].onClick();
            }}
            placeholder="Buscar tarefas, projetos, bookmarks..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: colors.text,
              fontSize: 17,
              fontWeight: 400,
              letterSpacing: "-0.01em",
            }}
          />
          <span className="kbd" style={{ flexShrink: 0 }}>esc</span>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          {q.length < 2 ? (
            <div style={{ padding: "20px 20px 24px" }}>
              <div style={{ color: colors.textMuted, fontSize: 12, marginBottom: 16 }}>
                Digite ao menos 2 caracteres para buscar.
              </div>
              <div style={{ color: colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                Atalhos
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { key: "⌘K / /", label: "abrir busca" },
                  { key: "↑↓", label: "navegar" },
                  { key: "↵", label: "selecionar" },
                  { key: "Esc", label: "fechar" },
                ].map(({ key, label }) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="kbd">{key}</span>
                    <span style={{ color: colors.textSecondary, fontSize: 12 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: "32px 20px", color: colors.textMuted, fontSize: 14, textAlign: "center" }}>
              Nada encontrado para &quot;{q}&quot;
            </div>
          ) : results.map((r, i) => (
            <button
              key={r.kind + r.id}
              onClick={r.onClick}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 18px",
                background: i === clampedIdx ? "rgba(255,255,255,0.07)" : "transparent",
                border: "none",
                borderBottom: i < results.length - 1 ? `1px solid rgba(84,84,88,0.25)` : "none",
                color: colors.text,
                cursor: "pointer",
                textAlign: "left",
                transition: `background 0.12s ${spring.gentle}`,
              }}
            >
              <span style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                background: r.color,
                flexShrink: 0,
                boxShadow: `0 0 8px ${r.color}66`,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>{r.title}</div>
                {r.sub && <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>{r.sub}</div>}
              </div>
              <span style={{
                fontSize: 9,
                padding: "2px 7px",
                borderRadius: "99px",
                background: "rgba(84,84,88,0.4)",
                color: colors.textSecondary,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                flexShrink: 0,
              }}>{r.kind}</span>
              {i === clampedIdx && <ArrowRight size={13} color={colors.textMuted} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
