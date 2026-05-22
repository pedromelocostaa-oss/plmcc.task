import { useMemo, useState } from "react";
import { Search, Plus, ExternalLink, Trash2, Link as LinkIcon, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useBookmarks, useCreateBookmark, useDeleteBookmark, useUpdateBookmark } from "@/lib/queries";
import { hostname } from "@/lib/format";
import { colors, spring, radius } from "@/lib/tokens";
import type { Bookmark } from "@/lib/types";

export function BookmarksView() {
  const [q, setQ] = useState("");
  const { data: bookmarks = [], isLoading } = useBookmarks(q);
  const createBookmark = useCreateBookmark();
  const deleteBookmark = useDeleteBookmark();

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const [url, setUrl] = useState("");

  const grouped = useMemo(() => {
    const map: Record<string, Bookmark[]> = {};
    bookmarks.forEach((b) => { const k = b.tag || ""; (map[k] ??= []).push(b); });
    const tags = Object.keys(map).filter((t) => t).sort();
    if (map[""]) tags.push("");
    return tags.map((t) => ({ tag: t, items: map[t] }));
  }, [bookmarks]);

  async function handleAdd() {
    if (!url.trim()) return;
    try {
      let normalUrl = url.trim();
      if (!normalUrl.startsWith("http://") && !normalUrl.startsWith("https://")) normalUrl = "https://" + normalUrl;
      await createBookmark.mutateAsync({ title: title.trim(), url: normalUrl, tag: tag.trim() });
      toast.success("Link salvo");
      setTitle(""); setTag(""); setUrl(""); setAdding(false);
    } catch {
      toast.error("Erro ao salvar link");
    }
  }

  return (
    <div style={{ padding: 32, minHeight: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Links Salvos</h1>
          <p style={{ color: colors.textSecondary, fontSize: 13 }}>{bookmarks.length} bookmarks</p>
        </div>
        <button onClick={() => setAdding(!adding)} style={accentBtn}>
          <Plus size={14} /> Adicionar
        </button>
      </div>

      {/* Search */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, background: colors.surface,
        border: `1px solid ${colors.border}`, borderRadius: 8,
        padding: "8px 12px", marginBottom: 16,
      }}>
        <Search size={14} color={colors.textMuted} />
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar título, URL ou tag..."
          style={{ flex: 1, background: "transparent", border: "none", color: colors.text, fontSize: 13 }}
        />
      </div>

      {/* Add form */}
      {adding && (
        <div style={{
          background: colors.surface, border: `1px solid ${colors.accent}`, borderRadius: 10,
          padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 8,
        }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (opcional)" style={inputStyle} />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
          <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Tag (ex: trabalho, leitura)" style={inputStyle} />
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={handleAdd} style={accentBtn}>Salvar</button>
            <button onClick={() => setAdding(false)} style={ghostBtn}>Cancelar</button>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 60, background: colors.surface, borderRadius: 8 }} />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: colors.textMuted }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔖</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
            {q ? `Nada encontrado para "${q}"` : "Nenhum link salvo"}
          </div>
          <div style={{ fontSize: 13 }}>Salve seus primeiros links clicando em Adicionar</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {grouped.map(({ tag, items }) => (
            <div key={tag || "_none"}>
              <div style={{
                fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#a855f7",
                marginBottom: 8, textTransform: "uppercase", letterSpacing: 1,
              }}>
                {tag ? `# ${tag}` : "sem tag"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
                {items.map((b) => (
                  <BookmarkCard
                    key={b.id}
                    bookmark={b}
                    onDelete={() => deleteBookmark.mutate(b.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BookmarkCard({ bookmark: b, onDelete }: { bookmark: Bookmark; onDelete: () => void }) {
  const updateBookmark = useUpdateBookmark();
  const [hov, setHov] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(b.title);
  const [editUrl, setEditUrl] = useState(b.url);
  const [editTag, setEditTag] = useState(b.tag ?? "");

  function startEdit() {
    setEditTitle(b.title);
    setEditUrl(b.url);
    setEditTag(b.tag ?? "");
    setEditing(true);
  }

  async function saveEdit() {
    let url = editUrl.trim();
    if (!url) return;
    if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
    try {
      await updateBookmark.mutateAsync({
        id: b.id,
        data: { title: editTitle.trim(), url, tag: editTag.trim() },
      });
      toast.success("Link atualizado");
      setEditing(false);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Erro ao atualizar");
    }
  }

  if (editing) {
    return (
      <div style={{
        background: "var(--hq-card-bg)",
        border: `1.5px solid var(--hq-accent)`,
        borderRadius: radius.md,
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}>
        <input
          autoFocus
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Título"
          style={cardInputStyle}
        />
        <input
          value={editUrl}
          onChange={(e) => setEditUrl(e.target.value)}
          placeholder="https://..."
          style={cardInputStyle}
        />
        <input
          value={editTag}
          onChange={(e) => setEditTag(e.target.value)}
          placeholder="Tag"
          style={cardInputStyle}
        />
        <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
          <button
            onClick={saveEdit}
            disabled={updateBookmark.isPending}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "4px 10px", background: "var(--hq-accent)", color: "#fff",
              border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}
          >
            <Check size={12} /> Salvar
          </button>
          <button
            onClick={() => setEditing(false)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "4px 10px", background: "transparent", color: colors.textSecondary,
              border: `1px solid ${colors.border}`, borderRadius: 6, cursor: "pointer", fontSize: 12,
            }}
          >
            <X size={12} /> Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? colors.surfaceHover : colors.surface,
        border: `1px solid ${colors.border}`, borderRadius: 8,
        padding: "10px 12px", display: "flex", alignItems: "center", gap: 10,
        transition: "background 0.15s",
      }}
    >
      <LinkIcon size={14} color={colors.textSecondary} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: colors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {b.title || hostname(b.url)}
        </div>
        <div style={{ fontSize: 11, color: colors.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {hostname(b.url)}
        </div>
      </div>
      {hov && (
        <>
          <a href={b.url} target="_blank" rel="noreferrer" style={iconBtn} title="Abrir">
            <ExternalLink size={14} />
          </a>
          <button onClick={startEdit} style={iconBtn} title="Editar">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete} style={{ ...iconBtn, color: colors.danger }} title="Excluir">
            <Trash2 size={14} />
          </button>
        </>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text,
  padding: "8px 10px", borderRadius: 6, fontSize: 13,
};

const cardInputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--hq-inlay-bg)",
  border: `1px solid var(--hq-border)`,
  color: colors.text,
  padding: "6px 8px",
  borderRadius: 6,
  fontSize: 12,
  boxSizing: "border-box",
};

const accentBtn: React.CSSProperties = {
  background: colors.accent, color: "#0d1117", border: "none",
  padding: "7px 12px", borderRadius: 6, cursor: "pointer",
  fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6,
};

const ghostBtn: React.CSSProperties = {
  background: "transparent", color: colors.textSecondary, border: `1px solid ${colors.border}`,
  padding: "7px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12,
};

const iconBtn: React.CSSProperties = {
  background: "transparent", border: "none", color: colors.textSecondary,
  cursor: "pointer", padding: 4, display: "inline-flex",
};
