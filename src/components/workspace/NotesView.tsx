import { useState } from "react";
import { FileText, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { useNotes, useUpdateNote, useDeleteNote, useProjects } from "@/lib/queries";
import { colors, spring, radius } from "@/lib/tokens";
import { EmptyState } from "@/components/workspace/EmptyState";
import { useQuickAdd } from "@/routes/__root";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

type Note = {
  id: string;
  title: string;
  body?: string | null;
  created_at: string;
  updated_at?: string | null;
  project?: { name: string; color: string } | null;
  project_id?: string | null;
};

export function NotesView() {
  const { data: notes = [], isLoading } = useNotes();
  const { openQuickAdd } = useQuickAdd();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  return (
    <div style={{
      padding: "28px",
      minHeight: "100dvh",
      background: "var(--hq-bg)",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: "clamp(22px, 5vw, 32px)",
          fontWeight: 700,
          letterSpacing: "-0.025em",
          margin: 0,
          color: colors.text,
        }}>
          Anotações
        </h1>
        {notes.length > 0 && (
          <p style={{ margin: "4px 0 0", fontSize: 13, color: colors.textSecondary }}>
            {notes.length} {notes.length === 1 ? "anotação" : "anotações"}
          </p>
        )}
      </div>

      {isLoading ? (
        <div style={{ color: colors.textMuted, fontSize: 13 }}>Carregando...</div>
      ) : notes.length === 0 ? (
        <EmptyState
          icon={<FileText size={24} />}
          iconColor="#FFCC00"
          title="Nenhuma anotação ainda"
          description="Crie sua primeira anotação para guardar ideias, contexto de projetos e referências."
          actionLabel="Criar anotação"
          onAction={() => openQuickAdd("note")}
          kbd="⌘N"
        />
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 12,
        }}>
          {/* Add note card */}
          <button
            onClick={() => openQuickAdd("note")}
            style={{
              background: "transparent",
              border: `1.5px dashed var(--hq-border)`,
              borderRadius: 14,
              padding: 16,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              minHeight: 140,
              color: colors.textMuted,
              transition: `border-color 0.15s ${spring.gentle}, color 0.15s ${spring.gentle}`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--hq-accent)";
              (e.currentTarget as HTMLElement).style.color = "var(--hq-accent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--hq-border)";
              (e.currentTarget as HTMLElement).style.color = colors.textMuted;
            }}
          >
            <Plus size={20} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>Nova nota</span>
          </button>

          {(notes as Note[]).map((note) => (
            <div
              key={note.id}
              onMouseEnter={() => setHoveredId(note.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                background: "var(--hq-card-bg)",
                border: `1px solid ${hoveredId === note.id ? "var(--hq-border-strong)" : "var(--hq-card-border)"}`,
                borderRadius: 14,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                position: "relative",
                cursor: "default",
                transition: `border-color 0.15s ${spring.gentle}`,
                backdropFilter: "blur(8px)",
              }}
            >
              {/* Hover actions */}
              {hoveredId === note.id && (
                <div style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  display: "flex",
                  gap: 4,
                }}>
                  <button
                    onClick={() => setEditingNote(note)}
                    title="Editar"
                    style={noteIconBtn}
                  >
                    <Pencil size={13} />
                  </button>
                  <NoteDeleteButton noteId={note.id} />
                </div>
              )}

              {/* Title */}
              <div style={{
                fontSize: 14.5,
                fontWeight: 600,
                color: colors.text,
                letterSpacing: "-0.01em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                paddingRight: hoveredId === note.id ? 52 : 0,
                transition: "padding-right 0.1s",
              }}>
                {note.title}
              </div>

              {/* Preview */}
              {note.body && (
                <div style={{
                  fontSize: 12.5,
                  color: colors.textSecondary,
                  lineHeight: 1.55,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical" as const,
                  overflow: "hidden",
                }}>
                  {note.body}
                </div>
              )}

              {/* Footer */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: "auto",
                paddingTop: 8,
                borderTop: `1px solid var(--hq-divider)`,
              }}>
                {note.project && (
                  <>
                    <span style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: note.project.color, flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 11, color: colors.textMuted, flex: 1 }}>
                      {note.project.name}
                    </span>
                  </>
                )}
                {!note.project && <span style={{ flex: 1 }} />}
                <span style={{
                  fontSize: 11,
                  color: colors.textMuted,
                  fontFamily: '"SF Mono", ui-monospace, monospace',
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {formatDate(note.updated_at || note.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editingNote && (
        <NoteEditModal
          note={editingNote}
          onClose={() => setEditingNote(null)}
        />
      )}
    </div>
  );
}

function NoteDeleteButton({ noteId }: { noteId: string }) {
  const deleteNote = useDeleteNote();
  return (
    <button
      onClick={() => {
        deleteNote.mutate(noteId, {
          onSuccess: () => toast.success("Anotação excluída"),
          onError: () => toast.error("Erro ao excluir"),
        });
      }}
      title="Excluir"
      style={{ ...noteIconBtn, color: "var(--hq-danger)" }}
    >
      <Trash2 size={13} />
    </button>
  );
}

function NoteEditModal({ note, onClose }: { note: Note; onClose: () => void }) {
  const updateNote = useUpdateNote();
  const { data: projects = [] } = useProjects();
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body ?? "");
  const [projectId, setProjectId] = useState<string | null>(note.project_id ?? null);

  async function handleSave() {
    if (!title.trim()) return;
    try {
      await updateNote.mutateAsync({ id: note.id, data: { title: title.trim(), body } });
      toast.success("Anotação atualizada");
      onClose();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Erro ao atualizar");
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "var(--hq-overlay)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480, maxWidth: "calc(100vw - 32px)",
          maxHeight: "90dvh",
          background: "var(--hq-modal-bg)",
          backdropFilter: "blur(30px) saturate(1.8)",
          WebkitBackdropFilter: "blur(30px) saturate(1.8)",
          border: `1px solid var(--hq-card-border)`,
          borderRadius: radius.xl,
          boxShadow: "var(--hq-shadow-float)",
          overflow: "hidden",
          display: "flex", flexDirection: "column",
          animation: "modalIn 0.22s cubic-bezier(0.2,0.85,0.25,1)",
        }}
      >
        <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.94) translateY(-10px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px 0" }}>
          <h2 style={{ flex: 1, fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
            Editar anotação
          </h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: colors.textMuted, cursor: "pointer", padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 18px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>Título *</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da anotação"
              style={modalInputStyle}
            />
          </div>

          {/* Project picker */}
          <div>
            <label style={labelStyle}>Projeto (opcional)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setProjectId(null)}
                style={projectPillStyle(projectId === null, "var(--hq-accent)", false)}
              >
                Sem projeto
              </button>
              {projects.filter((p) => !p.archived).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProjectId(p.id)}
                  style={projectPillStyle(projectId === p.id, p.color, true)}
                >
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color }} />
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Conteúdo</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escreva aqui..."
              rows={6}
              style={{ ...modalInputStyle, resize: "vertical", lineHeight: 1.6, minHeight: 120 }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              onClick={handleSave}
              disabled={!title.trim() || updateNote.isPending}
              style={{
                flex: 1, background: "var(--hq-accent)", color: "#fff",
                border: "none", padding: "11px", borderRadius: 10,
                cursor: "pointer", fontSize: 14, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <Check size={14} />
              {updateNote.isPending ? "Salvando..." : "Salvar alterações"}
            </button>
            <button
              onClick={onClose}
              style={{
                background: "transparent", color: colors.textSecondary,
                border: `1px solid var(--hq-border)`, padding: "11px 16px",
                borderRadius: 10, cursor: "pointer", fontSize: 14,
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const noteIconBtn: React.CSSProperties = {
  background: "var(--hq-inlay-bg)",
  border: `1px solid var(--hq-border)`,
  color: colors.textSecondary,
  cursor: "pointer",
  padding: 5,
  borderRadius: 6,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: colors.textMuted,
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const modalInputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--hq-inlay-bg)",
  border: `1px solid var(--hq-border)`,
  color: colors.text,
  padding: "8px 10px",
  borderRadius: 8,
  fontSize: 13,
  boxSizing: "border-box",
};

function projectPillStyle(active: boolean, color: string, hasColor: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "5px 11px",
    background: active ? (hasColor ? `${color}20` : "var(--hq-accent-soft)") : "var(--hq-inlay-bg)",
    border: active
      ? `1.5px solid ${hasColor ? `${color}70` : "var(--hq-accent-border)"}`
      : `1px solid var(--hq-border)`,
    borderRadius: 999,
    color: active ? color : colors.textSecondary,
    cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 400,
  };
}
