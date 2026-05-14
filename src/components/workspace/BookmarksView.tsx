import { useMemo, useState } from "react";
import { Search, Plus, ExternalLink, Trash2, Link as LinkIcon } from "lucide-react";
import { useBookmarks, useBookmarkMut } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { hostname } from "@/lib/format";

export function BookmarksView() {
  const { user } = useAuth();
  const { data: bookmarks = [] } = useBookmarks();
  const mut = useBookmarkMut();
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const [url, setUrl] = useState("");

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return bookmarks.filter((b) => !s || b.title.toLowerCase().includes(s) || b.url.toLowerCase().includes(s) || b.tag.toLowerCase().includes(s));
  }, [bookmarks, q]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof bookmarks> = {};
    filtered.forEach((b) => { const k = b.tag || ""; (map[k] ||= []).push(b); });
    const tags = Object.keys(map).filter((t) => t).sort();
    if (map[""]) tags.push("");
    return tags.map((t) => ({ tag: t, items: map[t] }));
  }, [filtered]);

  async function add() {
    if (!url.trim() || !user) return;
    await mut.create.mutateAsync({ user_id: user.id, title: title.trim(), url: url.trim(), tag: tag.trim() } as any);
    setTitle(""); setTag(""); setUrl(""); setAdding(false);
  }

  return (
    <div style={{ padding: 32, height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Links Salvos</h1>
        <button onClick={() => setAdding(!adding)} style={accentBtn}>
          <Plus size={14} /> Adicionar
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#161b22",
        border: "1px solid #30363d", borderRadius: 8, padding: "8px 12px", marginBottom: 16 }}>
        <Search size={14} color="#6e7681" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..."
          style={{ flex: 1, background: "transparent", border: "none", color: "#e6edf3", fontSize: 13 }} />
      </div>

      {adding && (
        <div style={{ background: "#161b22", border: "1px solid #f97316", borderRadius: 10, padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (opcional)" style={inp} />
          <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Tag" style={inp} />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." style={inp} />
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={add} style={accentBtn}>Salvar</button>
            <button onClick={() => setAdding(false)} style={ghostBtn}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {grouped.map(({ tag, items }) => (
          <div key={tag || "_none"}>
            <div style={{ fontFamily: "DM Mono", fontSize: 11, color: "#a855f7", marginBottom: 8 }}>
              {tag ? `# ${tag}` : "sem tag"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
              {items.map((b) => (
                <BookmarkCard key={b.id} b={b} onDelete={() => mut.remove.mutate(b.id)} />
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && <div style={{ color: "#6e7681", fontSize: 13 }}>Nenhum link salvo.</div>}
      </div>
    </div>
  );
}

function BookmarkCard({ b, onDelete }: { b: any; onDelete: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      background: hov ? "#1c2128" : "#161b22", border: "1px solid #30363d", borderRadius: 8,
      padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, transition: "background 0.15s",
    }}>
      <LinkIcon size={14} color="#8b949e" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "#e6edf3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {b.title || hostname(b.url)}
        </div>
        <div style={{ fontSize: 11, color: "#6e7681", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hostname(b.url)}</div>
      </div>
      {hov && (
        <>
          <a href={b.url} target="_blank" rel="noreferrer" style={iconLink} title="Abrir"><ExternalLink size={14} /></a>
          <button onClick={onDelete} style={iconLink} title="Excluir"><Trash2 size={14} /></button>
        </>
      )}
    </div>
  );
}

const inp: React.CSSProperties = { background: "#0d1117", border: "1px solid #30363d", color: "#e6edf3", padding: "8px 10px", borderRadius: 6, fontSize: 13 };
const accentBtn: React.CSSProperties = { background: "#f97316", color: "#0d1117", border: "none", padding: "7px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 };
const ghostBtn: React.CSSProperties = { background: "transparent", color: "#8b949e", border: "1px solid #30363d", padding: "7px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 };
const iconLink: React.CSSProperties = { background: "transparent", border: "none", color: "#8b949e", cursor: "pointer", padding: 4 };
