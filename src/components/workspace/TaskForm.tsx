import { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import type { Task, Subtask } from "@/lib/types";
import { uid, tagColor } from "@/lib/format";

type Draft = {
  title: string; description: string; priority: 1 | 2 | 3;
  due_date: string; tags: string[]; subtasks: Subtask[];
};

export function TaskForm({ initial, onCancel, onSave }: {
  initial?: Task | null; onCancel: () => void;
  onSave: (d: Partial<Task>) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft>(() => ({
    title: initial?.title || "",
    description: initial?.description || "",
    priority: (initial?.priority as 1 | 2 | 3) || 2,
    due_date: initial?.due_date || "",
    tags: initial?.tags || [],
    subtasks: initial?.subtasks || [],
  }));
  const [tagInput, setTagInput] = useState("");
  const [subInput, setSubInput] = useState("");

  useEffect(() => { /* autofocus */ }, []);

  function addTag(v: string) {
    const t = v.trim();
    if (t && !draft.tags.includes(t)) setDraft({ ...draft, tags: [...draft.tags, t] });
    setTagInput("");
  }
  function addSub() {
    const t = subInput.trim(); if (!t) return;
    setDraft({ ...draft, subtasks: [...draft.subtasks, { id: uid(), title: t, done: false }] });
    setSubInput("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    await onSave({
      title: draft.title.trim(), description: draft.description, priority: draft.priority,
      due_date: draft.due_date || null, tags: draft.tags, subtasks: draft.subtasks,
    });
  }

  return (
    <form onSubmit={submit} style={{
      background: "#161b22", border: "1px solid #f97316", borderRadius: 10,
      padding: 16, display: "flex", flexDirection: "column", gap: 10,
    }}>
      <input autoFocus required placeholder="Título da tarefa" value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        style={{ ...inp, fontSize: 15, fontWeight: 500 }} />

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="date" value={draft.due_date} onChange={(e) => setDraft({ ...draft, due_date: e.target.value })} style={{ ...inp, width: 150 }} />
        <div style={{ display: "flex", gap: 4 }}>
          {[1, 2, 3].map((p) => (
            <button key={p} type="button" onClick={() => setDraft({ ...draft, priority: p as 1 | 2 | 3 })} style={{
              fontFamily: "DM Mono", fontSize: 11, padding: "5px 10px", borderRadius: 6,
              background: draft.priority === p
                ? (p === 1 ? "rgba(239,68,68,0.13)" : p === 2 ? "rgba(249,115,22,0.13)" : "rgba(59,130,246,0.13)")
                : "#21262d",
              color: draft.priority === p ? (p === 1 ? "#ef4444" : p === 2 ? "#f97316" : "#3b82f6") : "#8b949e",
              border: "1px solid " + (draft.priority === p ? (p === 1 ? "#ef4444" : p === 2 ? "#f97316" : "#3b82f6") : "#30363d"),
              cursor: "pointer",
            }}>P{p}</button>
          ))}
        </div>
      </div>

      <textarea placeholder="Descrição" value={draft.description}
        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        rows={3} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />

      <div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          {draft.tags.map((t) => (
            <button key={t} type="button" onClick={() => setDraft({ ...draft, tags: draft.tags.filter((x) => x !== t) })}
              style={{ ...tagPill(t), cursor: "pointer" }}>
              {t} ✕
            </button>
          ))}
        </div>
        <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }}
          placeholder="Tags (Enter para adicionar)" style={inp} />
      </div>

      <div>
        {draft.subtasks.map((s, i) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
            <input type="checkbox" checked={s.done}
              onChange={(e) => { const ns = [...draft.subtasks]; ns[i] = { ...s, done: e.target.checked }; setDraft({ ...draft, subtasks: ns }); }} />
            <span style={{ flex: 1, fontSize: 13, color: s.done ? "#6e7681" : "#e6edf3", textDecoration: s.done ? "line-through" : "none" }}>{s.title}</span>
            <button type="button" onClick={() => setDraft({ ...draft, subtasks: draft.subtasks.filter((x) => x.id !== s.id) })}
              style={{ background: "transparent", border: "none", color: "#6e7681", cursor: "pointer" }}><Trash2 size={12} /></button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6 }}>
          <input value={subInput} onChange={(e) => setSubInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSub(); } }}
            placeholder="Subtarefa" style={{ ...inp, flex: 1 }} />
          <button type="button" onClick={addSub} style={ghostBtn}><Plus size={14} /></button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <button type="submit" style={accentBtn}>{initial ? "Salvar alterações" : "Criar tarefa"}</button>
        <button type="button" onClick={onCancel} style={ghostBtn}><X size={14} /> Cancelar</button>
      </div>
    </form>
  );
}

function tagPill(t: string): React.CSSProperties {
  const c = tagColor(t);
  return {
    fontFamily: "DM Mono", fontSize: 10, padding: "2px 8px", borderRadius: 10,
    background: c + "22", color: c, border: "1px solid " + c + "44",
  };
}

const inp: React.CSSProperties = { background: "#0d1117", border: "1px solid #30363d", color: "#e6edf3", padding: "8px 10px", borderRadius: 6, fontSize: 13 };
const accentBtn: React.CSSProperties = { background: "#f97316", color: "#0d1117", border: "none", padding: "7px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 };
const ghostBtn: React.CSSProperties = { background: "transparent", color: "#8b949e", border: "1px solid #30363d", padding: "7px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 };
