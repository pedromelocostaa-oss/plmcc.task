import { useState } from "react";
import { Pencil, Trash2, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import type { Task } from "@/lib/types";
import { formatDue, tagColor, uid } from "@/lib/format";
import { useTaskMut } from "@/lib/queries";

export function TaskCard({ task, onEdit }: { task: Task; onEdit: () => void }) {
  const mut = useTaskMut();
  const [hov, setHov] = useState(false);
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");

  const due = formatDue(task.due_date, task.status);
  const subDone = task.subtasks.filter((s) => s.done).length;
  const hasMore = task.description || task.subtasks.length > 0 || task.comments.length > 0;

  function cycleStatus() {
    const next = task.status === "todo" ? "doing" : task.status === "doing" ? "done" : "todo";
    const patch: any = { status: next, completed_at: next === "done" ? new Date().toISOString() : null };
    mut.update.mutate({ id: task.id, patch });
  }

  function toggleSub(id: string) {
    const next = task.subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s));
    mut.update.mutate({ id: task.id, patch: { subtasks: next } as any });
  }

  function addComment() {
    const t = comment.trim(); if (!t) return;
    const next = [...task.comments, { id: uid(), text: t, created_at: new Date().toISOString() }];
    mut.update.mutate({ id: task.id, patch: { comments: next } as any });
    setComment("");
  }

  const pColor = task.priority === 1 ? "#ef4444" : task.priority === 2 ? "#f97316" : "#3b82f6";
  const pBg = task.priority === 1 ? "rgba(239,68,68,0.13)" : task.priority === 2 ? "rgba(249,115,22,0.13)" : "rgba(59,130,246,0.13)";
  const isDone = task.status === "done";

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      background: hov ? "#1c2128" : "#161b22", border: "1px solid #30363d",
      borderRadius: 8, transition: "background 0.15s",
    }}>
      <div style={{ padding: "10px 12px", display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{
          fontFamily: "DM Mono", fontSize: 10, padding: "2px 6px", borderRadius: 4,
          background: isDone ? "#21262d" : pBg, color: isDone ? "#6e7681" : pColor, marginTop: 2,
        }}>P{task.priority}</span>

        <button onClick={cycleStatus} style={{
          width: 16, height: 16, borderRadius: 8, marginTop: 3,
          border: "1.5px solid " + (isDone ? "#3fb950" : task.status === "doing" ? "#d29922" : "#30363d"),
          background: isDone ? "#3fb950" : task.status === "doing" ? "rgba(210,153,34,0.2)" : "transparent",
          cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center",
          color: "#0d1117", fontSize: 10, fontWeight: 700,
        }}>{isDone ? "✓" : ""}</button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: isDone ? "#6e7681" : "#e6edf3", textDecoration: isDone ? "line-through" : "none" }}>
            {task.title}
          </div>
          {task.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
              {task.tags.map((t) => {
                const c = tagColor(t);
                return <span key={t} style={{
                  fontFamily: "DM Mono", fontSize: 9, padding: "1px 6px", borderRadius: 10,
                  background: c + "22", color: c, border: "1px solid " + c + "44",
                }}>{t}</span>;
              })}
            </div>
          )}
        </div>

        {due.label && <span style={{ fontSize: 11, color: due.color, fontFamily: "DM Mono", marginTop: 3 }}>{due.label}</span>}
        {task.subtasks.length > 0 && (
          <span style={{
            fontFamily: "DM Mono", fontSize: 10, padding: "1px 6px", borderRadius: 4,
            background: "#21262d", color: subDone === task.subtasks.length ? "#3fb950" : "#8b949e", marginTop: 3,
          }}>{subDone}/{task.subtasks.length}</span>
        )}
        {task.comments.length > 0 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "#8b949e", marginTop: 3 }}>
            <MessageSquare size={11} />{task.comments.length}
          </span>
        )}

        {hov && (
          <>
            <button onClick={onEdit} style={icon}><Pencil size={13} /></button>
            <button onClick={() => mut.remove.mutate(task.id)} style={icon}><Trash2 size={13} /></button>
            {hasMore && <button onClick={() => setOpen(!open)} style={icon}>{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>}
          </>
        )}
      </div>

      {open && hasMore && (
        <div style={{ background: "#0d1117", borderTop: "1px solid #21262d", padding: 14, borderRadius: "0 0 8px 8px" }}>
          {task.description && <div style={{ fontSize: 12, color: "#8b949e", marginBottom: 12, whiteSpace: "pre-wrap" }}>{task.description}</div>}
          {task.subtasks.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: "DM Mono", fontSize: 10, color: "#6e7681", marginBottom: 6 }}>SUBTAREFAS</div>
              {task.subtasks.map((s) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                  <button onClick={() => toggleSub(s.id)} style={{
                    width: 14, height: 14, borderRadius: 7,
                    border: "1.5px solid " + (s.done ? "#3fb950" : "#30363d"),
                    background: s.done ? "#3fb950" : "transparent", cursor: "pointer", padding: 0,
                    color: "#0d1117", fontSize: 9, fontWeight: 700,
                  }}>{s.done ? "✓" : ""}</button>
                  <span style={{ fontSize: 12, color: s.done ? "#6e7681" : "#e6edf3", textDecoration: s.done ? "line-through" : "none" }}>{s.title}</span>
                </div>
              ))}
            </div>
          )}
          <div>
            <div style={{ fontFamily: "DM Mono", fontSize: 10, color: "#6e7681", marginBottom: 6 }}>LOG</div>
            {task.comments.map((c) => (
              <div key={c.id} style={{ display: "flex", gap: 8, fontSize: 12, color: "#e6edf3", padding: "3px 0" }}>
                <span style={{ width: 4, height: 4, borderRadius: 2, background: "#30363d", marginTop: 6 }} />
                <span style={{ flex: 1 }}>{c.text}</span>
                <span style={{ fontFamily: "DM Mono", fontSize: 10, color: "#6e7681" }}>
                  {new Date(c.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
            <input value={comment} onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addComment(); }}
              placeholder="Adicionar log... (Enter)" style={{
                marginTop: 6, background: "#161b22", border: "1px solid #30363d", color: "#e6edf3",
                padding: "6px 10px", borderRadius: 6, fontSize: 12, width: "100%",
              }} />
          </div>
        </div>
      )}
    </div>
  );
}

const icon: React.CSSProperties = { background: "transparent", border: "none", color: "#8b949e", cursor: "pointer", padding: 4, marginTop: 1 };
