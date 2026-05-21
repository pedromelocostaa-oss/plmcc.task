import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Archive, Trash2, Plus, ArrowUpDown, Tag as TagIcon,
  ExternalLink, Link as LinkIcon, RotateCcw, X,
} from "lucide-react";
import { toast } from "sonner";
import {
  useProject,
  useTasksByProject,
  useLinksByProject,
  useNote,
  useUpdateProject,
  useArchiveProject,
  useUnarchiveProject,
  useDeleteProject,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useCycleTaskStatus,
  useCreateLink,
  useDeleteLink,
  useSaveNote,
} from "@/lib/queries";
import type { Task } from "@/lib/types";
import { isOverdue, isToday, isThisWeek, hostname, tagColor, formatDue } from "@/lib/format";
import { colors } from "@/lib/tokens";

export function ProjectView({ projectId }: { projectId: string }) {
  const nav = useNavigate();
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: tasks = [], isLoading: tasksLoading } = useTasksByProject(projectId);
  const { data: links = [] } = useLinksByProject(projectId);
  const { data: note } = useNote(projectId);

  const updateProject = useUpdateProject();
  const archiveProject = useArchiveProject();
  const unarchiveProject = useUnarchiveProject();
  const deleteProject = useDeleteProject();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const cycleStatus = useCycleTaskStatus();
  const createLink = useCreateLink();
  const deleteLink = useDeleteLink();
  const saveNote = useSaveNote();

  const [tab, setTab] = useState<"tasks" | "links" | "notes">("tasks");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [sortByPriority, setSortByPriority] = useState(false);
  const [dueFilter, setDueFilter] = useState<"all" | "today" | "week" | "overdue">("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    tasks.forEach((t) => t.task_tags?.forEach((tt) => tags.add(tt.tag)));
    return Array.from(tags).sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (tagFilter && !t.task_tags?.some((tt) => tt.tag === tagFilter)) return false;
      if (dueFilter === "today" && !isToday(t.due_date)) return false;
      if (dueFilter === "week" && !isThisWeek(t.due_date)) return false;
      if (dueFilter === "overdue" && !isOverdue(t.due_date, t.status)) return false;
      return true;
    });
  }, [tasks, dueFilter, tagFilter]);

  if (projectLoading) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{ height: 32, width: 200, background: colors.surface, borderRadius: 6, marginBottom: 16 }} />
        <div style={{ height: 4, background: colors.surface, borderRadius: 2, marginBottom: 24 }} />
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ height: 52, background: colors.surface, borderRadius: 8, marginBottom: 8 }} />
        ))}
      </div>
    );
  }

  if (!project) {
    return <div style={{ padding: 32, color: colors.textSecondary }}>Projeto não encontrado.</div>;
  }

  const done = tasks.filter((t) => t.status === "done").length;
  const pct = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);
  const barColor = pct === 100 ? colors.success : project.color;

  function handleArchiveToggle() {
    if (project!.archived) {
      unarchiveProject.mutate(project!.id, { onSuccess: () => toast.success("Projeto desarquivado") });
    } else {
      archiveProject.mutate(project!.id, { onSuccess: () => toast.success("Projeto arquivado") });
    }
  }

  function handleDelete() {
    if (!confirm(`Excluir o projeto "${project!.name}"? Esta ação é irreversível.`)) return;
    deleteProject.mutate(project!.id, {
      onSuccess: () => { nav({ to: "/" }); toast.success("Projeto excluído"); },
      onError: () => toast.error("Erro ao excluir projeto"),
    });
  }

  async function handleCreateTask(data: {
    title: string; description?: string | null; priority: Task['priority']; due_date?: string | null;
  }) {
    await createTask.mutateAsync({ ...data, project_id: projectId, status: "todo" });
    toast.success("Tarefa criada");
    setShowForm(false);
  }

  async function handleUpdateTask(id: string, data: Partial<Omit<Task, 'id' | 'created_at' | 'subtasks' | 'task_tags' | 'task_comments' | 'project'>>) {
    await updateTask.mutateAsync({ id, data });
    toast.success("Tarefa atualizada");
    setEditingTask(null);
  }

  return (
    <div style={{ padding: 32, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <span style={{ width: 12, height: 12, borderRadius: 6, background: project.color }} />
        {editingName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => {
              if (nameDraft.trim() && nameDraft !== project.name) {
                updateProject.mutate({ id: project.id, data: { name: nameDraft.trim() } });
              }
              setEditingName(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") { setEditingName(false); }
            }}
            style={{
              fontSize: 22, fontWeight: 700, background: "transparent",
              border: `1px solid ${colors.accent}`, color: colors.text,
              borderRadius: 6, padding: "2px 8px",
            }}
          />
        ) : (
          <h1
            onClick={() => { setNameDraft(project.name); setEditingName(true); }}
            style={{ fontSize: 22, fontWeight: 700, cursor: "text" }}
            title="Clique para editar"
          >
            {project.name}
          </h1>
        )}
        <div style={{ width: 80, height: 4, background: colors.borderLight, borderRadius: 2, overflow: "hidden", marginLeft: 8 }}>
          <div style={{ height: "100%", background: barColor, width: `${pct}%`, transition: "width 0.4s" }} />
        </div>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: colors.textSecondary }}>
          {done}/{tasks.length}
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={handleArchiveToggle} style={subtleBtn} title={project.archived ? "Desarquivar" : "Arquivar"}>
          {project.archived ? <RotateCcw size={14} /> : <Archive size={14} />}
        </button>
        <button onClick={handleDelete} style={{ ...subtleBtn, color: colors.danger }} title="Excluir">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${colors.borderLight}`, marginBottom: 20 }}>
        {([
          { id: "tasks" as const, label: "TAREFAS", count: tasks.length },
          { id: "links" as const, label: "LINKS", count: links.length },
          { id: "notes" as const, label: "NOTAS", count: null },
        ]).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "transparent", border: "none",
            color: tab === t.id ? colors.accent : colors.textSecondary,
            fontFamily: "JetBrains Mono, monospace", fontSize: 11, padding: "10px 14px", cursor: "pointer",
            borderBottom: "2px solid " + (tab === t.id ? colors.accent : "transparent"), marginBottom: -1,
          }}>
            {t.label}{t.count !== null && ` · ${t.count}`}
          </button>
        ))}
      </div>

      {tab === "tasks" && (
        <TasksTab
          tasks={filtered}
          allTags={allTags}
          tagFilter={tagFilter}
          setTagFilter={setTagFilter}
          dueFilter={dueFilter}
          setDueFilter={setDueFilter}
          sortByPriority={sortByPriority}
          setSortByPriority={setSortByPriority}
          showForm={showForm}
          setShowForm={setShowForm}
          editingTask={editingTask}
          setEditingTask={setEditingTask}
          isLoading={tasksLoading}
          onCreateTask={handleCreateTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={(id) => deleteTask.mutate({ id, projectId }, { onSuccess: () => toast.success("Tarefa excluída") })}
          onCycleStatus={(id, status) => cycleStatus.mutate({ id, currentStatus: status, projectId })}
          projectId={projectId}
        />
      )}
      {tab === "links" && (
        <LinksTab
          links={links}
          onAdd={(title, url) => createLink.mutate({ projectId, title, url }, { onSuccess: () => toast.success("Link adicionado") })}
          onDelete={(id) => deleteLink.mutate({ id, projectId })}
        />
      )}
      {tab === "notes" && (
        <NotesTab
          content={note?.content ?? ""}
          onSave={(c) => saveNote.mutate({ projectId, content: c })}
        />
      )}
    </div>
  );
}

// ─── TasksTab ─────────────────────────────────────────────────────────────────

type TasksTabProps = {
  tasks: Task[];
  allTags: string[];
  tagFilter: string | null;
  setTagFilter: (t: string | null) => void;
  dueFilter: "all" | "today" | "week" | "overdue";
  setDueFilter: (f: "all" | "today" | "week" | "overdue") => void;
  sortByPriority: boolean;
  setSortByPriority: (v: boolean) => void;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  editingTask: Task | null;
  setEditingTask: (t: Task | null) => void;
  isLoading: boolean;
  onCreateTask: (data: { title: string; description?: string | null; priority: Task['priority']; due_date?: string | null }) => Promise<void>;
  onUpdateTask: (id: string, data: Partial<Omit<Task, 'id' | 'created_at' | 'subtasks' | 'task_tags' | 'task_comments' | 'project'>>) => Promise<void>;
  onDeleteTask: (id: string) => void;
  onCycleStatus: (id: string, status: Task['status']) => void;
  projectId: string;
};

function TasksTab(props: TasksTabProps) {
  const {
    tasks, allTags, tagFilter, setTagFilter, dueFilter, setDueFilter,
    sortByPriority, setSortByPriority, showForm, setShowForm,
    editingTask, setEditingTask, isLoading,
    onCreateTask, onUpdateTask, onDeleteTask, onCycleStatus,
  } = props;

  const groups = sortByPriority
    ? [
        { label: "P1 · URGENTE", items: tasks.filter((t) => t.priority === 1) },
        { label: "P2 · NORMAL", items: tasks.filter((t) => t.priority === 2) },
        { label: "P3 · BAIXA", items: tasks.filter((t) => t.priority === 3) },
      ]
    : [
        { label: "A FAZER", items: tasks.filter((t) => t.status === "todo") },
        { label: "EM ANDAMENTO", items: tasks.filter((t) => t.status === "doing") },
        { label: "CONCLUÍDA", items: tasks.filter((t) => t.status === "done") },
      ];

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={() => { setShowForm(true); setEditingTask(null); }} style={accentBtn}>
          <Plus size={14} /> Nova tarefa
        </button>
        <button onClick={() => setSortByPriority(!sortByPriority)} style={{ ...ghostBtn, color: sortByPriority ? colors.accent : colors.textSecondary }}>
          <ArrowUpDown size={12} /> {sortByPriority ? "Por prioridade" : "Ordenar"}
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "today", "week", "overdue"] as const).map((f) => (
            <button key={f} onClick={() => setDueFilter(f)} style={{
              background: dueFilter === f ? colors.accentBg : "transparent",
              color: dueFilter === f ? colors.accent : colors.textSecondary,
              border: `1px solid ${dueFilter === f ? colors.accent : colors.border}`,
              padding: "4px 10px", borderRadius: 12, cursor: "pointer",
              fontSize: 11, fontFamily: "JetBrains Mono, monospace",
            }}>
              {f === "all" ? "Todos" : f === "today" ? "Hoje" : f === "week" ? "Semana" : "Atrasadas"}
            </button>
          ))}
        </div>
      </div>

      {/* Tag chips */}
      {allTags.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          <TagIcon size={12} color={colors.textMuted} />
          {allTags.map((t) => {
            const active = tagFilter === t;
            const c = tagColor(t);
            return (
              <button key={t} onClick={() => setTagFilter(active ? null : t)} style={{
                fontFamily: "JetBrains Mono, monospace", fontSize: 10, padding: "2px 8px", borderRadius: 10,
                background: active ? c + "33" : colors.borderLight,
                color: active ? c : colors.textSecondary,
                border: `1px solid ${active ? c : colors.border}`, cursor: "pointer",
              }}>{t}</button>
            );
          })}
        </div>
      )}

      {/* Inline form */}
      {(showForm || editingTask) && (
        <div style={{ marginBottom: 14 }}>
          <InlineTaskForm
            initial={editingTask}
            onCancel={() => { setShowForm(false); setEditingTask(null); }}
            onSave={async (d) => {
              if (editingTask) {
                await onUpdateTask(editingTask.id, d);
              } else {
                await onCreateTask(d as { title: string; priority: Task['priority']; due_date?: string | null });
              }
            }}
          />
        </div>
      )}

      {/* Groups */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 52, background: colors.surface, borderRadius: 8 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {groups.map((g) => g.items.length > 0 && (
            <div key={g.label}>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: colors.textMuted, marginBottom: 6, letterSpacing: 1 }}>
                {g.label} · {g.items.length}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {g.items.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onEdit={() => { setEditingTask(t); setShowForm(false); }}
                    onDelete={() => onDeleteTask(t.id)}
                    onCycleStatus={() => onCycleStatus(t.id, t.status)}
                  />
                ))}
              </div>
            </div>
          ))}
          {tasks.length === 0 && !showForm && (
            <div style={{ color: colors.textMuted, fontSize: 13, padding: 24, textAlign: "center" }}>
              Pressione <span className="kbd">N</span> para criar sua primeira tarefa
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

function TaskCard({
  task, onEdit, onDelete, onCycleStatus,
}: {
  task: Task; onEdit: () => void; onDelete: () => void; onCycleStatus: () => void;
}) {
  const [hov, setHov] = useState(false);
  const [open, setOpen] = useState(false);
  const due = formatDue(task.due_date, task.status);
  const subDone = task.subtasks?.filter((s) => s.done).length ?? 0;
  const subTotal = task.subtasks?.length ?? 0;
  const isDone = task.status === "done";
  const pColor = task.priority === 1 ? colors.p1 : task.priority === 2 ? colors.p2 : colors.p3;
  const pBg = task.priority === 1 ? colors.p1Bg : task.priority === 2 ? colors.p2Bg : colors.p3Bg;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? colors.surfaceHover : colors.surface,
        border: `1px solid ${colors.border}`, borderRadius: 8, transition: "background 0.15s",
      }}
    >
      <div style={{ padding: "10px 12px", display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: 10, padding: "2px 6px", borderRadius: 4,
          background: isDone ? colors.borderLight : pBg,
          color: isDone ? colors.textMuted : pColor, marginTop: 2, flexShrink: 0,
        }}>P{task.priority}</span>

        <button onClick={onCycleStatus} style={{
          width: 16, height: 16, borderRadius: 8, marginTop: 3, flexShrink: 0,
          border: `1.5px solid ${isDone ? colors.success : task.status === "doing" ? colors.warning : colors.border}`,
          background: isDone ? colors.success : task.status === "doing" ? "rgba(210,153,34,0.2)" : "transparent",
          cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center",
          color: "#0d1117", fontSize: 10, fontWeight: 700,
        }}>
          {isDone ? "✓" : ""}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, color: isDone ? colors.textMuted : colors.text,
            textDecoration: isDone ? "line-through" : "none",
          }}>
            {task.title}
          </div>
          {(task.task_tags?.length ?? 0) > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
              {task.task_tags!.map((tt) => {
                const c = tagColor(tt.tag);
                return (
                  <span key={tt.id} style={{
                    fontFamily: "JetBrains Mono, monospace", fontSize: 9, padding: "1px 6px", borderRadius: 10,
                    background: c + "22", color: c, border: `1px solid ${c}44`,
                  }}>{tt.tag}</span>
                );
              })}
            </div>
          )}
        </div>

        {due.label && (
          <span style={{ fontSize: 11, color: due.color, fontFamily: "JetBrains Mono, monospace", marginTop: 3, flexShrink: 0 }}>
            {due.label}
          </span>
        )}
        {subTotal > 0 && (
          <span style={{
            fontFamily: "JetBrains Mono, monospace", fontSize: 10, padding: "1px 6px", borderRadius: 4,
            background: colors.borderLight, color: subDone === subTotal ? colors.success : colors.textSecondary, marginTop: 3,
          }}>{subDone}/{subTotal}</span>
        )}

        {hov && (
          <>
            <button onClick={onEdit} style={iconBtn}><TagIcon size={13} /></button>
            <button onClick={onDelete} style={{ ...iconBtn, color: colors.danger }}><Trash2 size={13} /></button>
            {task.description && (
              <button onClick={() => setOpen(!open)} style={iconBtn}>
                {open ? "▲" : "▼"}
              </button>
            )}
          </>
        )}
      </div>

      {open && task.description && (
        <div style={{
          background: colors.bg, borderTop: `1px solid ${colors.borderLight}`,
          padding: 14, borderRadius: "0 0 8px 8px",
        }}>
          <div style={{ fontSize: 12, color: colors.textSecondary, whiteSpace: "pre-wrap" }}>{task.description}</div>
        </div>
      )}
    </div>
  );
}

// ─── InlineTaskForm ───────────────────────────────────────────────────────────

type TaskFormData = {
  title: string;
  description?: string;
  priority: Task['priority'];
  due_date?: string | null;
};

function InlineTaskForm({
  initial, onCancel, onSave,
}: {
  initial?: Task | null;
  onCancel: () => void;
  onSave: (d: TaskFormData) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priority, setPriority] = useState<Task['priority']>(initial?.priority ?? 2);
  const [dueDate, setDueDate] = useState(initial?.due_date ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      due_date: dueDate || null,
    });
  }

  return (
    <form onSubmit={submit} style={{
      background: colors.surface, border: `1px solid ${colors.accent}`, borderRadius: 10,
      padding: 16, display: "flex", flexDirection: "column", gap: 10,
    }}>
      <input
        autoFocus required placeholder="Título da tarefa" value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ ...inputStyle, fontSize: 15, fontWeight: 500 }}
      />
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ ...inputStyle, width: 150 }} />
        <div style={{ display: "flex", gap: 4 }}>
          {([1, 2, 3] as const).map((p) => (
            <button key={p} type="button" onClick={() => setPriority(p)} style={{
              fontFamily: "JetBrains Mono, monospace", fontSize: 11, padding: "5px 10px", borderRadius: 6,
              background: priority === p ? (p === 1 ? colors.p1Bg : p === 2 ? colors.p2Bg : colors.p3Bg) : colors.borderLight,
              color: priority === p ? (p === 1 ? colors.p1 : p === 2 ? colors.p2 : colors.p3) : colors.textSecondary,
              border: `1px solid ${priority === p ? (p === 1 ? colors.p1 : p === 2 ? colors.p2 : colors.p3) : colors.border}`,
              cursor: "pointer",
            }}>P{p}</button>
          ))}
        </div>
      </div>
      <textarea
        placeholder="Descrição (opcional)" value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
      />
      <div style={{ display: "flex", gap: 6 }}>
        <button type="submit" style={accentBtn}>{initial ? "Salvar alterações" : "Criar tarefa"}</button>
        <button type="button" onClick={onCancel} style={ghostBtn}>Cancelar</button>
      </div>
    </form>
  );
}

// ─── LinksTab ─────────────────────────────────────────────────────────────────

type PendingLink = { id: string; url: string; title: string };

function LinksTab({
  links, onAdd, onDelete,
}: {
  links: { id: string; title: string; url: string }[];
  onAdd: (title: string, url: string) => void;
  onDelete: (id: string) => void;
}) {
  const [pending, setPending] = useState<PendingLink[]>([
    { id: crypto.randomUUID(), url: "", title: "" },
  ]);
  const [saving, setSaving] = useState(false);

  function addRow() {
    setPending((prev) => [...prev, { id: crypto.randomUUID(), url: "", title: "" }]);
  }

  function removeRow(id: string) {
    setPending((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length > 0 ? next : [{ id: crypto.randomUUID(), url: "", title: "" }];
    });
  }

  function updateRow(id: string, field: "url" | "title", value: string) {
    setPending((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  }

  async function handleSave() {
    const valid = pending.filter((r) => r.url.trim());
    if (!valid.length) return;
    setSaving(true);
    for (const r of valid) {
      onAdd(r.title.trim(), r.url.trim());
    }
    setSaving(false);
    setPending([{ id: crypto.randomUUID(), url: "", title: "" }]);
  }

  const hasContent = pending.some((r) => r.url.trim());

  return (
    <div>
      {/* ── Add links form ── */}
      <div style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        padding: "14px 16px",
        marginBottom: 18,
      }}>
        <div style={{
          fontSize: 11, fontFamily: "JetBrains Mono, monospace",
          color: colors.textMuted, letterSpacing: 1, marginBottom: 10,
        }}>
          ADICIONAR LINKS
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pending.map((row, idx) => (
            <div key={row.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{
                fontSize: 11, color: colors.textMuted,
                fontFamily: "JetBrains Mono, monospace",
                width: 18, flexShrink: 0, textAlign: "right",
              }}>{idx + 1}.</span>
              <input
                autoFocus={idx === pending.length - 1 && idx > 0}
                value={row.url}
                onChange={(e) => updateRow(row.id, "url", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addRow(); }
                }}
                placeholder="https://..."
                style={{ ...inputStyle, flex: 2 }}
              />
              <input
                value={row.title}
                onChange={(e) => updateRow(row.id, "title", e.target.value)}
                placeholder="Título (opcional)"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={() => removeRow(row.id)}
                title="Remover linha"
                style={{
                  background: "transparent", border: "none",
                  color: colors.textMuted, cursor: "pointer",
                  padding: 4, borderRadius: 4, flexShrink: 0,
                  display: "flex", alignItems: "center",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = colors.danger; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = colors.textMuted; }}
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
          <button onClick={addRow} style={ghostBtn}>
            <Plus size={13} /> Adicionar novo link
          </button>
          <div style={{ flex: 1 }} />
          {hasContent && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={accentBtn}
            >
              Salvar {pending.filter((r) => r.url.trim()).length > 1
                ? `${pending.filter((r) => r.url.trim()).length} links`
                : "link"}
            </button>
          )}
        </div>
      </div>

      {/* ── Saved links list ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {links.length > 0 && (
          <div style={{
            fontSize: 11, fontFamily: "JetBrains Mono, monospace",
            color: colors.textMuted, letterSpacing: 1, marginBottom: 4,
          }}>
            LINKS SALVOS · {links.length}
          </div>
        )}
        {links.map((l) => <LinkRow key={l.id} link={l} onDelete={() => onDelete(l.id)} />)}
        {links.length === 0 && (
          <div style={{ color: colors.textMuted, fontSize: 13, padding: "12px 0" }}>
            Nenhum link salvo ainda.
          </div>
        )}
      </div>
    </div>
  );
}

function LinkRow({ link, onDelete }: { link: { id: string; title: string; url: string }; onDelete: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      background: hov ? colors.surfaceHover : colors.surface,
      border: `1px solid ${colors.border}`, borderRadius: 8,
      padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
    }}>
      <LinkIcon size={14} color={colors.textSecondary} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13 }}>{link.title || hostname(link.url)}</div>
        <div style={{ fontSize: 11, color: colors.textMuted }}>{hostname(link.url)}</div>
      </div>
      {hov && (
        <>
          <a href={link.url} target="_blank" rel="noreferrer" style={subtleBtn}><ExternalLink size={14} /></a>
          <button onClick={onDelete} style={{ ...subtleBtn, color: colors.danger }}><Trash2 size={14} /></button>
        </>
      )}
    </div>
  );
}

// ─── NotesTab ─────────────────────────────────────────────────────────────────

function NotesTab({ content, onSave }: { content: string; onSave: (c: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);

  useEffect(() => { setDraft(content); }, [content]);

  if (editing) {
    return (
      <div>
        <textarea
          autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} rows={20}
          style={{ ...inputStyle, width: "100%", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
        />
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <button onClick={() => { onSave(draft); setEditing(false); toast.success("Notas salvas"); }} style={accentBtn}>
            Salvar
          </button>
          <button onClick={() => { setDraft(content); setEditing(false); }} style={ghostBtn}>Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button onClick={() => setEditing(true)} style={ghostBtn}>Editar</button>
      </div>
      <div style={{
        background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8,
        padding: 16, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.7,
        color: content ? colors.text : colors.textMuted, minHeight: 120,
      }}>
        {content || "Nenhuma nota ainda. Clique em Editar para começar."}
      </div>
    </div>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text,
  padding: "8px 10px", borderRadius: 6, fontSize: 13,
};

const accentBtn: React.CSSProperties = {
  background: colors.accent, color: "#0d1117", border: "none",
  padding: "7px 12px", borderRadius: 6, cursor: "pointer",
  fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6,
};

const ghostBtn: React.CSSProperties = {
  background: "transparent", color: colors.textSecondary, border: `1px solid ${colors.border}`,
  padding: "6px 12px", borderRadius: 6, cursor: "pointer",
  fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4,
};

const subtleBtn: React.CSSProperties = {
  background: "transparent", border: "none", color: colors.textSecondary,
  cursor: "pointer", padding: 4, display: "inline-flex", alignItems: "center",
};

const iconBtn: React.CSSProperties = {
  background: "transparent", border: "none", color: colors.textSecondary,
  cursor: "pointer", padding: 4, marginTop: 1,
};
