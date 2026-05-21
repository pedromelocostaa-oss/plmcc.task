import { useState } from "react";
import { FileText, Plus } from "lucide-react";
import { useNotes } from "@/lib/queries";
import { colors, spring, radius } from "@/lib/tokens";
import { EmptyState } from "@/components/workspace/EmptyState";
import { useQuickAdd } from "@/routes/__root";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function NotesView() {
  const { data: notes = [], isLoading } = useNotes();
  const { openQuickAdd } = useQuickAdd();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
          onAction={openQuickAdd}
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
            onClick={openQuickAdd}
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

          {notes.map((note) => (
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
                cursor: "default",
                transition: `border-color 0.15s ${spring.gentle}`,
                backdropFilter: "blur(8px)",
              }}
            >
              {/* Title */}
              <div style={{
                fontSize: 14.5,
                fontWeight: 600,
                color: colors.text,
                letterSpacing: "-0.01em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
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
    </div>
  );
}
