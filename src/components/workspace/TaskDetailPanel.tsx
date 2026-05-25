import { useState, useEffect, useRef, useCallback } from "react";
import { X, Trash2, Tag, Check, Plus, AlignLeft, Calendar, ChevronUp, ChevronDown } from "lucide-react";
import type { Task } from "@/lib/types";
import { tagColor } from "@/lib/types";
import {
  useUpdateTask,
  useDeleteTask,
  useCreateSubtask,
  useToggleSubtask,
  useDeleteSubtask,
  useAddTag,
  useRemoveTag,
  useTaskComments,
  useAddComment,
} from "@/lib/queries";
import { showUndoToast } from "@/components/ui/undo-toast";
import { colors, radius, spring } from "@/lib/tokens";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface TaskDetailPanelProps {
  task: Task;
  onClose: () => void;
}

const PRIORITY_OPTIONS: { value: 1 | 2 | 3; label: string; color: string }[] = [
  { value: 1, label: "P1", color: "var(--hq-p1)" },
  { value: 2, label: "P2", color: "var(--hq-p2)" },
  { value: 3, label: "P3", color: "var(--hq-p3)" },
];

export function TaskDetailPanel({ task, onClose }: TaskDetailPanelProps) {
  const isMobile = useIsMobile();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createSubtask = useCreateSubtask();
  const toggleSubtask = useToggleSubtask();
  const deleteSubtask = useDeleteSubtask();
  const addTag = useAddTag();
  const removeTag = useRemoveTag();
  const addComment = useAddComment();

  const { data: comments = [] } = useTaskComments(task.id);

  // Local state for inline editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(task.title);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descVal, setDescVal] = useState(task.description ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [priority, setPriority] = useState<1 | 2 | 3>(task.priority);

  // Subtask input
  const [subtaskVal, setSubtaskVal] = useState("");

  // Tag input
  const [tagVal, setTagVal] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);

  // Comment input
  const [commentVal, setCommentVal] = useState("");

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const tags = task.task_tags ?? [];
  const subtasks = task.subtasks ?? [];
  const doneSubs = subtasks.filter((s) => s.done).length;

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Auto-focus title textarea when editing
  useEffect(() => {
    if (editingTitle && titleRef.current) titleRef.current.focus();
  }, [editingTitle]);

  useEffect(() => {
    if (editingDesc && descRef.current) descRef.current.focus();
  }, [editingDesc]);

  // Helpers
  function saveTitle() {
    const t = titleVal.trim();
    if (t && t !== task.title) {
      updateTask.mutate({ id: task.id, data: { title: t } });
    } else {
      setTitleVal(task.title);
    }
    setEditingTitle(false);
  }

  function saveDesc() {
    const d = descVal.trim();
    if (d !== (task.description ?? "")) {
      updateTask.mutate({ id: task.id, data: { description: d } });
    }
    setEditingDesc(false);
  }

  function saveDueDate(val: string) {
    setDueDate(val);
    updateTask.mutate({ id: task.id, data: { due_date: val || null } });
  }

  function savePriority(p: 1 | 2 | 3) {
    setPriority(p);
    updateTask.mutate({ id: task.id, data: { priority: p } });
  }

  function handleAddSubtask() {
    const t = subtaskVal.trim();
    if (!t) return;
    createSubtask.mutate({ taskId: task.id, title: t, projectId: task.project_id, position: subtasks.length });
    setSubtaskVal("");
  }

  function handleAddTag() {
    const t = tagVal.trim().toLowerCase();
    if (!t) return;
    if (tags.some((tt) => tt.tag === t)) { setTagVal(""); setShowTagInput(false); return; }
    addTag.mutate({ taskId: task.id, tag: t, projectId: task.project_id });
    setTagVal("");
    setShowTagInput(false);
  }

  function handleSendComment() {
    const c = commentVal.trim();
    if (!c) return;
    addComment.mutate({ taskId: task.id, content: c });
    setCommentVal("");
  }

  const handleDelete = useCallback(() => {
    onClose();
    let deleted = false;
    showUndoToast({
      title: "Tarefa excluída",
      description: task.title,
      icon: <Trash2 size={12} color="#fff" />,
      iconBg: "var(--hq-danger)",
      undo: () => { deleted = false; },
      duration: 5000,
    });
    setTimeout(() => {
      if (!deleted) {
        deleteTask.mutate({ id: task.id, projectId: task.project_id });
      }
    }, 5100);
  }, [task, onClose, deleteTask]);

  const panelWidth = isMobile ? "100%" : 520;

  const priorityColor = PRIORITY_OPTIONS.find((p) => p.value === priority)?.color ?? "var(--hq-p2)";

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          zIndex: 200,
          animation: "overlayIn 160ms ease-out",
        }}
      />

      <style>{`
        @keyframes overlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes panelSlideIn {
          from { transform: translateX(100%); opacity: 0.6; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @keyframes panelSlideInMobile {
          from { transform: translateY(100%); opacity: 0.6; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          top: isMobile ? "auto" : 0,
          bottom: isMobile ? 0 : "auto",
          right: 0,
          width: panelWidth,
          height: isMobile ? "88dvh" : "100dvh",
          background: "var(--hq-modal-bg)",
          backdropFilter: "blur(40px) saturate(1.8)",
          WebkitBackdropFilter: "blur(40px) saturate(1.8)",
          borderLeft: isMobile ? "none" : `1px solid var(--hq-border)`,
          borderTop: isMobile ? `1px solid var(--hq-border)` : "none",
          borderRadius: isMobile ? "16px 16px 0 0" : 0,
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: isMobile ? "panelSlideInMobile 200ms cubic-bezier(0.2,0.85,0.25,1)" : "panelSlideIn 220ms cubic-bezier(0.2,0.85,0.25,1)",
          boxShadow: "var(--hq-shadow-float)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "14px 16px 12px",
          borderBottom: `1px solid var(--hq-border)`,
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Priority badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => savePriority(opt.value)}
                  style={{
                    fontSize: 10, fontWeight: 700,
                    padding: "2px 7px", borderRadius: 4,
                    border: `1px solid ${priority === opt.value ? opt.color : "var(--hq-border)"}`,
                    background: priority === opt.value ? `${opt.color}20` : "transparent",
                    color: priority === opt.value ? opt.color : "var(--hq-text-muted)",
                    cursor: "pointer",
                    transition: "all 120ms",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Title */}
            {editingTitle ? (
              <textarea
                ref={titleRef}
                value={titleVal}
                onChange={(e) => setTitleVal(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveTitle(); }
                  if (e.key === "Escape") { setTitleVal(task.title); setEditingTitle(false); }
                }}
                rows={2}
                style={{
                  width: "100%", resize: "none",
                  background: "var(--hq-inlay-bg)",
                  border: `1px solid var(--hq-accent-border)`,
                  borderRadius: radius.sm,
                  color: "var(--hq-text)",
                  fontSize: 16, fontWeight: 600, lineHeight: 1.4,
                  padding: "6px 8px",
                  outline: "none",
                  boxSizing: "border-box",
                  letterSpacing: "-0.02em",
                  fontFamily: "inherit",
                }}
              />
            ) : (
              <h2
                onClick={() => setEditingTitle(true)}
                style={{
                  fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em",
                  lineHeight: 1.4, margin: 0,
                  cursor: "text",
                  color: "var(--hq-text)",
                }}
              >
                {task.title}
              </h2>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {/* Delete */}
            <button
              onClick={handleDelete}
              title="Excluir tarefa"
              style={{
                background: "transparent", border: "none",
                color: "var(--hq-danger)", cursor: "pointer",
                padding: 6, borderRadius: 6,
                display: "flex", alignItems: "center",
              }}
            >
              <Trash2 size={15} />
            </button>
            {/* Close */}
            <button
              onClick={onClose}
              style={{
                background: "transparent", border: "none",
                color: "var(--hq-text-muted)", cursor: "pointer",
                padding: 6, borderRadius: 6,
                display: "flex", alignItems: "center",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          {/* Meta row: date */}
          <div style={{ padding: "12px 16px", borderBottom: `1px solid var(--hq-border)`, display: "flex", alignItems: "center", gap: 10 }}>
            <Calendar size={13} color="var(--hq-text-muted)" />
            <span style={{ fontSize: 12, color: "var(--hq-text-muted)", minWidth: 60 }}>Data</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => saveDueDate(e.target.value)}
              style={{
                background: "var(--hq-inlay-bg)",
                border: `1px solid var(--hq-border)`,
                borderRadius: radius.sm,
                color: "var(--hq-text)",
                fontSize: 12,
                padding: "4px 8px",
                cursor: "pointer",
                outline: "none",
                colorScheme: "dark",
              }}
            />
          </div>

          {/* Description */}
          <div style={{ padding: "12px 16px", borderBottom: `1px solid var(--hq-border)` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
              <AlignLeft size={12} color="var(--hq-text-muted)" />
              <span style={{ fontSize: 11, color: "var(--hq-text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
                Descrição
              </span>
            </div>
            {editingDesc ? (
              <textarea
                ref={descRef}
                value={descVal}
                onChange={(e) => setDescVal(e.target.value)}
                onBlur={saveDesc}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setDescVal(task.description ?? ""); setEditingDesc(false); }
                }}
                rows={4}
                placeholder="Adicionar descrição..."
                style={{
                  width: "100%", resize: "vertical",
                  background: "var(--hq-inlay-bg)",
                  border: `1px solid var(--hq-accent-border)`,
                  borderRadius: radius.sm,
                  color: "var(--hq-text)",
                  fontSize: 13, lineHeight: 1.6,
                  padding: "8px 10px",
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  minHeight: 80,
                }}
              />
            ) : (
              <div
                onClick={() => setEditingDesc(true)}
                style={{
                  fontSize: 13, color: task.description ? "var(--hq-text-secondary)" : "var(--hq-text-muted)",
                  lineHeight: 1.65,
                  cursor: "text",
                  minHeight: 32,
                  padding: "2px 0",
                  fontStyle: task.description ? "normal" : "italic",
                  whiteSpace: "pre-wrap",
                }}
              >
                {task.description || "Clique para adicionar uma descrição..."}
              </div>
            )}
          </div>

          {/* Tags */}
          <div style={{ padding: "12px 16px", borderBottom: `1px solid var(--hq-border)` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Tag size={12} color="var(--hq-text-muted)" />
              <span style={{ fontSize: 11, color: "var(--hq-text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, flex: 1 }}>
                Tags
              </span>
              <button
                onClick={() => setShowTagInput(true)}
                style={{ background: "transparent", border: "none", color: "var(--hq-text-muted)", cursor: "pointer", padding: 2 }}
              >
                <Plus size={13} />
              </button>
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
              {tags.map((t) => {
                const tc = tagColor(t.tag);
                return (
                  <span key={t.id} style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: 11, padding: "3px 8px", borderRadius: "99px",
                    background: `${tc}22`, border: `1px solid ${tc}40`, color: tc,
                  }}>
                    {t.tag}
                    <button
                      onClick={() => removeTag.mutate({ taskId: task.id, tag: t.tag, projectId: task.project_id })}
                      style={{ background: "none", border: "none", color: tc, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", lineHeight: 1 }}
                    >
                      <X size={9} />
                    </button>
                  </span>
                );
              })}
              {showTagInput && (
                <input
                  autoFocus
                  value={tagVal}
                  onChange={(e) => setTagVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddTag();
                    if (e.key === "Escape") { setTagVal(""); setShowTagInput(false); }
                  }}
                  onBlur={() => { if (!tagVal.trim()) setShowTagInput(false); }}
                  placeholder="nova tag"
                  style={{
                    fontSize: 11, padding: "3px 8px",
                    border: `1px solid var(--hq-accent-border)`,
                    borderRadius: "99px",
                    background: "var(--hq-inlay-bg)",
                    color: "var(--hq-text)",
                    outline: "none",
                    width: 90,
                  }}
                />
              )}
              {tags.length === 0 && !showTagInput && (
                <span style={{ fontSize: 12, color: "var(--hq-text-muted)", fontStyle: "italic" }}>Nenhuma tag</span>
              )}
            </div>
          </div>

          {/* Subtasks */}
          <div style={{ padding: "12px 16px", borderBottom: `1px solid var(--hq-border)` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Check size={12} color="var(--hq-text-muted)" />
              <span style={{ fontSize: 11, color: "var(--hq-text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, flex: 1 }}>
                Subtarefas
              </span>
              <span style={{ fontSize: 11, color: doneSubs === subtasks.length && subtasks.length > 0 ? "var(--hq-success)" : "var(--hq-text-muted)", fontWeight: 600 }}>
                {doneSubs}/{subtasks.length}
              </span>
            </div>

            {/* Progress bar */}
            {subtasks.length > 0 && (
              <div style={{ height: 3, borderRadius: 2, background: "rgba(84,84,88,0.20)", marginBottom: 10, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${(doneSubs / subtasks.length) * 100}%`,
                  background: doneSubs === subtasks.length ? "var(--hq-success)" : "var(--hq-accent)",
                  borderRadius: 2,
                  transition: "width 0.3s ease",
                }} />
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
              {subtasks.map((s) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={() => toggleSubtask.mutate({ id: s.id, currentDone: s.done, projectId: task.project_id })}
                    style={{
                      width: 18, height: 18, borderRadius: 9, flexShrink: 0,
                      border: `1.5px solid ${s.done ? "var(--hq-success)" : "var(--hq-border)"}`,
                      background: s.done ? "var(--hq-success)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", padding: 0,
                    }}
                  >
                    {s.done && <Check size={10} color="#000" strokeWidth={3} />}
                  </button>
                  <span style={{
                    flex: 1, fontSize: 13, lineHeight: 1.4,
                    color: s.done ? "var(--hq-text-muted)" : "var(--hq-text)",
                    textDecoration: s.done ? "line-through" : "none",
                  }}>
                    {s.title}
                  </span>
                  <button
                    onClick={() => deleteSubtask.mutate({ id: s.id, projectId: task.project_id })}
                    style={{ background: "none", border: "none", color: "var(--hq-text-muted)", cursor: "pointer", padding: 2, opacity: 0.6, display: "flex", alignItems: "center" }}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>

            {/* Subtask input */}
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={subtaskVal}
                onChange={(e) => setSubtaskVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddSubtask(); }}
                placeholder="+ Nova subtarefa"
                style={{
                  flex: 1, background: "var(--hq-inlay-bg)",
                  border: `1px solid var(--hq-border)`,
                  borderRadius: radius.sm,
                  color: "var(--hq-text)",
                  fontSize: 12.5, padding: "6px 10px",
                  outline: "none",
                }}
              />
              <button
                onClick={handleAddSubtask}
                disabled={!subtaskVal.trim()}
                style={{
                  background: subtaskVal.trim() ? "var(--hq-accent)" : "var(--hq-inlay-bg)",
                  border: "none",
                  borderRadius: radius.sm,
                  color: subtaskVal.trim() ? "#fff" : "var(--hq-text-muted)",
                  cursor: subtaskVal.trim() ? "pointer" : "default",
                  padding: "6px 10px",
                  fontSize: 12, fontWeight: 600,
                  transition: "all 120ms",
                }}
              >
                Adicionar
              </button>
            </div>
          </div>

          {/* Comments */}
          <div style={{ padding: "12px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <AlignLeft size={12} color="var(--hq-text-muted)" />
              <span style={{ fontSize: 11, color: "var(--hq-text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
                Comentários
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
              {comments.map((c) => (
                <div key={c.id} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 14, flexShrink: 0,
                    background: "linear-gradient(135deg, #0A84FF, #005FCC)",
                    color: "#fff",
                    display: "grid", placeItems: "center",
                    fontSize: 11, fontWeight: 700,
                  }}>P</div>
                  <div style={{
                    flex: 1, background: "var(--hq-inlay-bg)",
                    border: `1px solid var(--hq-border)`,
                    borderRadius: radius.md,
                    padding: "8px 10px",
                  }}>
                    <div style={{ fontSize: 13, color: "var(--hq-text)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                      {c.content}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--hq-text-muted)", marginTop: 4 }}>
                      {new Date(c.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <div style={{ fontSize: 12, color: "var(--hq-text-muted)", fontStyle: "italic" }}>Nenhum comentário</div>
              )}
            </div>

            {/* Comment input */}
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
              <div style={{
                width: 28, height: 28, borderRadius: 14, flexShrink: 0,
                background: "linear-gradient(135deg, #0A84FF, #005FCC)",
                color: "#fff",
                display: "grid", placeItems: "center",
                fontSize: 11, fontWeight: 700,
              }}>P</div>
              <div style={{ flex: 1 }}>
                <textarea
                  value={commentVal}
                  onChange={(e) => setCommentVal(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); handleSendComment(); }
                  }}
                  placeholder="Adicionar comentário... (⌘↵ para enviar)"
                  rows={2}
                  style={{
                    width: "100%", resize: "none",
                    background: "var(--hq-inlay-bg)",
                    border: `1px solid var(--hq-border)`,
                    borderRadius: radius.md,
                    color: "var(--hq-text)",
                    fontSize: 13, lineHeight: 1.5,
                    padding: "8px 10px",
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
                {commentVal.trim() && (
                  <button
                    onClick={handleSendComment}
                    style={{
                      marginTop: 6,
                      background: "var(--hq-accent)",
                      border: "none", borderRadius: radius.sm,
                      color: "#fff", cursor: "pointer",
                      padding: "6px 14px", fontSize: 12, fontWeight: 600,
                    }}
                  >
                    Enviar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
