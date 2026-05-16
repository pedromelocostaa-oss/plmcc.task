import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAllTasks, useProjects, useCreateTask, useDeleteTask, useCycleTaskStatus, type TaskFilters } from "@/lib/queries";
import type { Task } from "@/lib/types";
import { formatDue, tagColor } from "@/lib/format";
import { colors } from "@/lib/tokens";

export function TasksView() {
  const [statusFilter, setStatusFilter] = useState<Task['status'] | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<Task['priority'] | "all">("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [dueFilter, setDueFilter] = useState<"all" | "today" | "week" | "overdue" | "nodue">("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newProjectId, setNewProjectId] = useState("");
  const [newPriority, setNewPriority] = useState<Task['priority']>(2);
  const [newDue, setNewDue] = useState("");

  const { data: projects = [] } = useProjects();
  const createTask = useCreateTask();
  const deleteTask = useDeleteTask();
  const cycleStatus = useCycleTaskStatus();

  const filters: TaskFilters = useMemo(() => {
    const f: TaskFilters = {};
    if (statusFilter !== "all") f.status = statusFilter;
    if (priorityFilter !== "all") f.priority = priorityFilter;
    if (projectFilter !== "all") f.project_id = projectFilter;
    return f;
  }, [statusFilter, priorityFilter, projectFilter]);

  const { data: allTasks = [], isLoading } = useAllTasks(filters);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  const tasks = useMemo(() => {
    return allTasks.filter((t) => {
      if (dueFilter === "today") return t.due_date === today;
      if (dueFilter === "week") {
        if (!t.due_date) return false;
        const d = new Date(t.due_date + "T00:00:00");
        const todayD = new Date(today + "T00:00:00");
        const diff = (d.getTime() - todayD.getTime()) / 86400000;
        return diff >= 0 && diff <= 7;
      }
      if (dueFilter === "overdue") return t.due_date && t.due_date < today && t.status !== "done";
      if (dueFilter === "nodue") return !t.due_date;
      return true;
    });
  }, [allTasks, dueFilter, today]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newProjectId) return;
    try {
      await createTask.mutateAsync({
        title: newTitle.trim(),
        project_id: newProjectId,
        priority: newPriority,
        due_date: newDue || null,
        status: "todo",
      });
      toast.success("Tarefa criada");
      setNewTitle(""); setNewDue(""); setShowAddForm(false);
    } catch {
      toast.error("Erro ao criar tarefa");
    }
  }

  return (
    <div style={{ padding: 32, minHeight: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Todas as tarefas</h1>
          <p style={{ color: colors.textSecondary, fontSize: 13 }}>{tasks.length} tarefa{tasks.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} style={accentBtn}>
          <Plus size={14} /> Nova tarefa
        </button>
      </div>

      {/* Quick add form */}
      {showAddForm && (
        <form onSubmit={handleCreate} style={{
          background: colors.surface, border: `1px solid ${colors.accent}`, borderRadius: 10,
          padding: 16, marginBottom: 20, display: "flex", flexDirection: "column", gap: 10,
        }}>
          <input
            autoFocus required placeholder="Título da tarefa" value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{ ...inputStyle, fontSize: 15, fontWeight: 500 }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select
              required value={newProjectId} onChange={(e) => setNewProjectId(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            >
              <option value="">Selecionar projeto...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} style={{ ...inputStyle, width: 150 }} />
            <div style={{ display: "flex", gap: 4 }}>
              {([1, 2, 3] as const).map((p) => (
                <button key={p} type="button" onClick={() => setNewPriority(p)} style={{
                  fontFamily: "JetBrains Mono, monospace", fontSize: 11, padding: "5px 10px", borderRadius: 6,
                  background: newPriority === p ? (p === 1 ? colors.p1Bg : p === 2 ? colors.p2Bg : colors.p3Bg) : colors.borderLight,
                  color: newPriority === p ? (p === 1 ? colors.p1 : p === 2 ? colors.p2 : colors.p3) : colors.textSecondary,
                  border: `1px solid ${newPriority === p ? (p === 1 ? colors.p1 : p === 2 ? colors.p2 : colors.p3) : colors.border}`,
                  cursor: "pointer",
                }}>P{p}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="submit" style={accentBtn}>Criar</button>
            <button type="button" onClick={() => setShowAddForm(false)} style={ghostBtn}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div style={{
        background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10,
        padding: "12px 16px", marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center",
      }}>
        {/* Status */}
        <FilterGroup label="Status" value={statusFilter} onChange={(v) => setStatusFilter(v as typeof statusFilter)} options={[
          { value: "all", label: "Todos" },
          { value: "todo", label: "A fazer" },
          { value: "doing", label: "Em andamento" },
          { value: "done", label: "Concluída" },
        ]} />

        <div style={{ width: 1, height: 24, background: colors.border }} />

        {/* Priority */}
        <FilterGroup label="Prioridade" value={String(priorityFilter)} onChange={(v) => setPriorityFilter(v === "all" ? "all" : Number(v) as Task['priority'])} options={[
          { value: "all", label: "Todas" },
          { value: "1", label: "P1" },
          { value: "2", label: "P2" },
          { value: "3", label: "P3" },
        ]} />

        <div style={{ width: 1, height: 24, background: colors.border }} />

        {/* Due */}
        <FilterGroup label="Prazo" value={dueFilter} onChange={(v) => setDueFilter(v as typeof dueFilter)} options={[
          { value: "all", label: "Qualquer" },
          { value: "today", label: "Hoje" },
          { value: "week", label: "Semana" },
          { value: "overdue", label: "Atrasadas" },
          { value: "nodue", label: "Sem prazo" },
        ]} />

        {projects.length > 0 && (
          <>
            <div style={{ width: 1, height: 24, background: colors.border }} />
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              style={{
                background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text,
                padding: "4px 8px", borderRadius: 6, fontSize: 12,
              }}
            >
              <option value="all">Todos os projetos</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Task list */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ height: 52, background: colors.surface, borderRadius: 8 }} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: colors.textMuted }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Nenhuma tarefa encontrada</div>
          <div style={{ fontSize: 13 }}>Ajuste os filtros ou crie uma nova tarefa</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {tasks.map((task) => (
            <AllTaskCard
              key={task.id}
              task={task}
              onCycle={() => cycleStatus.mutate({ id: task.id, currentStatus: task.status, projectId: task.project_id })}
              onDelete={() => deleteTask.mutate({ id: task.id, projectId: task.project_id }, { onSuccess: () => toast.success("Tarefa excluída") })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AllTaskCard({
  task, onCycle, onDelete,
}: {
  task: Task; onCycle: () => void; onDelete: () => void;
}) {
  const [hov, setHov] = useState(false);
  const isDone = task.status === "done";
  const due = formatDue(task.due_date, task.status);
  const pColor = task.priority === 1 ? colors.p1 : task.priority === 2 ? colors.p2 : colors.p3;
  const pBg = task.priority === 1 ? colors.p1Bg : task.priority === 2 ? colors.p2Bg : colors.p3Bg;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? colors.surfaceHover : colors.surface,
        border: `1px solid ${colors.border}`, borderRadius: 8, transition: "background 0.15s",
        padding: "10px 12px", display: "flex", alignItems: "flex-start", gap: 10,
      }}
    >
      <span style={{
        fontFamily: "JetBrains Mono, monospace", fontSize: 10, padding: "2px 6px", borderRadius: 4,
        background: isDone ? colors.borderLight : pBg,
        color: isDone ? colors.textMuted : pColor, marginTop: 2, flexShrink: 0,
      }}>P{task.priority}</span>

      <button onClick={onCycle} style={{
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
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {task.title}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 3, alignItems: "center" }}>
          {task.project && (
            <Link to="/projects/$id" params={{ id: task.project_id }} style={{
              display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none",
              fontSize: 11, color: colors.textSecondary,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: task.project.color }} />
              {task.project.name}
            </Link>
          )}
          {task.task_tags?.map((tt) => {
            const c = tagColor(tt.tag);
            return (
              <span key={tt.id} style={{
                fontFamily: "JetBrains Mono, monospace", fontSize: 9, padding: "1px 6px", borderRadius: 10,
                background: c + "22", color: c, border: `1px solid ${c}44`,
              }}>{tt.tag}</span>
            );
          })}
        </div>
      </div>

      {due.label && (
        <span style={{ fontSize: 11, color: due.color, fontFamily: "JetBrains Mono, monospace", marginTop: 3, flexShrink: 0 }}>
          {due.label}
        </span>
      )}

      {hov && (
        <button onClick={onDelete} style={{ ...iconBtn, color: colors.danger }}>
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

// ─── FilterGroup ──────────────────────────────────────────────────────────────

function FilterGroup({
  label: _label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {options.map((opt) => (
        <button key={opt.value} onClick={() => onChange(opt.value)} style={{
          padding: "4px 10px", borderRadius: 6, cursor: "pointer",
          fontSize: 11, fontFamily: "JetBrains Mono, monospace",
          background: value === opt.value ? colors.accentBg : "transparent",
          color: value === opt.value ? colors.accent : colors.textSecondary,
          border: `1px solid ${value === opt.value ? colors.accent : colors.border}`,
        }}>
          {opt.label}
        </button>
      ))}
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
  padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12,
};

const iconBtn: React.CSSProperties = {
  background: "transparent", border: "none", color: colors.textSecondary,
  cursor: "pointer", padding: 4, marginTop: 1,
};
