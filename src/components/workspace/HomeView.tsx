import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { useProjects, useTasks, useTaskMut } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { PROJECT_COLORS } from "@/lib/types";
import type { Task } from "@/lib/types";
import type { View } from "./Sidebar";

// ── date helpers ────────────────────────────────────────────────────────────

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isTodayDate(date: Date): boolean {
  return toIso(date) === toIso(new Date());
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// ── main view ────────────────────────────────────────────────────────────────

export function HomeView({ setView: _setView }: { setView: (v: View) => void }) {
  const { user } = useAuth();
  const { data: projects = [] } = useProjects();
  const { data: tasks = [], isLoading } = useTasks();
  const taskMut = useTaskMut();
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [quickAddId, setQuickAddId] = useState<string | null>(null);

  const active = projects.filter((p) => !p.archived);
  const selectedIso = toIso(selectedDate);

  const tasksByProject = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const p of active) {
      map[p.id] = tasks
        .filter((t) => t.project_id === p.id && t.due_date === selectedIso)
        .sort((a, b) => a.priority - b.priority);
    }
    return map;
  }, [tasks, active, selectedIso]);

  function toggleTask(task: Task) {
    const newStatus: Task["status"] = task.status === "done" ? "todo" : "done";
    taskMut.update.mutate(
      {
        id: task.id,
        patch: {
          status: newStatus,
          completed_at: newStatus === "done" ? new Date().toISOString() : null,
        },
      },
      { onError: () => toast.error("Erro ao atualizar tarefa") },
    );
  }

  if (projects.length === 0) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <div style={{ fontSize: 48 }}>🚀</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Bem-vindo ao Pedro's HQ</div>
        <div style={{ color: "#8b949e", fontSize: 13 }}>Crie seu primeiro projeto na barra lateral para começar.</div>
      </div>
    );
  }

  const isToday = isTodayDate(selectedDate);

  return (
    <div style={{ padding: 32, height: "100%", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Início</h1>
          <p style={{ color: "#8b949e", fontSize: 13 }}>Tarefas por projeto no dia selecionado</p>
        </div>
        {!isToday && (
          <button onClick={() => setSelectedDate(new Date())} style={todayBtnStyle}>
            Hoje
          </button>
        )}
      </div>

      {/* Date navigator */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 28 }}>
        <button onClick={() => setSelectedDate(addDays(selectedDate, -1))} style={arrowBtnStyle}>
          <ChevronLeft size={16} />
        </button>
        <span style={{
          fontSize: 15, fontWeight: 600, minWidth: 300, textAlign: "center",
          color: isToday ? "#f97316" : "#e6edf3",
          textTransform: "capitalize",
        }}>
          {formatDateLabel(selectedDate)}
          {isToday && (
            <span style={{ fontFamily: "DM Mono", fontSize: 10, color: "#f97316", marginLeft: 8, opacity: 0.7 }}>
              · HOJE
            </span>
          )}
        </span>
        <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} style={arrowBtnStyle}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Project grid */}
      {isLoading ? (
        <div style={{ color: "#6e7681", fontSize: 13 }}>Carregando tarefas...</div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
          alignItems: "start",
        }}>
          {active.map((project) => {
            const ptasks = tasksByProject[project.id] ?? [];
            const doneCt = ptasks.filter((t) => t.status === "done").length;
            const color = PROJECT_COLORS[project.color] || project.color;
            const pct = ptasks.length > 0 ? Math.round((doneCt / ptasks.length) * 100) : 0;
            const allDone = ptasks.length > 0 && doneCt === ptasks.length;
            const isAdding = quickAddId === project.id;

            return (
              <div key={project.id} style={{
                background: "#161b22",
                border: "1px solid #30363d",
                borderRadius: 10,
                overflow: "hidden",
              }}>
                {/* Card header */}
                <div style={{
                  padding: "11px 14px",
                  borderBottom: "1px solid #21262d",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: color, flexShrink: 0 }} />
                  <span style={{
                    flex: 1, fontSize: 13, fontWeight: 600,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {project.name}
                  </span>
                  <span style={{
                    fontFamily: "DM Mono", fontSize: 10, padding: "1px 6px", borderRadius: 4,
                    background: allDone ? "rgba(63,185,80,0.13)" : "#21262d",
                    color: allDone ? "#3fb950" : "#8b949e",
                  }}>
                    {doneCt}/{ptasks.length}
                  </span>
                  <button
                    onClick={() => setQuickAddId(isAdding ? null : project.id)}
                    title="Adicionar tarefa"
                    style={{ background: "transparent", border: "none", color: "#8b949e", cursor: "pointer", padding: 3, borderRadius: 4, display: "flex", alignItems: "center" }}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Progress bar */}
                {ptasks.length > 0 && (
                  <div style={{ height: 2, background: "#21262d" }}>
                    <div style={{
                      height: "100%",
                      background: pct === 100 ? "#3fb950" : color,
                      width: `${pct}%`,
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                )}

                {/* Task list */}
                <div style={{ padding: "4px 0", maxHeight: 260, overflowY: "auto" }}>
                  {ptasks.length === 0 && !isAdding && (
                    <div style={{ padding: "14px", color: "#6e7681", fontSize: 12, fontStyle: "italic" }}>
                      Nenhuma tarefa para este dia
                    </div>
                  )}
                  {ptasks.map((task) => (
                    <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task)} />
                  ))}
                </div>

                {/* Quick-add form */}
                {isAdding && user && (
                  <QuickAdd
                    projectId={project.id}
                    userId={user.id}
                    dueDate={selectedIso}
                    onDone={() => setQuickAddId(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── sub-components ───────────────────────────────────────────────────────────

function TaskRow({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const done = task.status === "done";
  return (
    <button onClick={onToggle} style={{
      width: "100%", display: "flex", alignItems: "flex-start", gap: 10,
      padding: "7px 14px", background: "transparent", border: "none",
      cursor: "pointer", textAlign: "left", color: "#e6edf3",
    }}>
      <span style={{
        width: 15, height: 15, borderRadius: 4, flexShrink: 0, marginTop: 1,
        border: `1.5px solid ${done ? "#3fb950" : "#30363d"}`,
        background: done ? "#3fb950" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s",
      }}>
        {done && <Check size={9} color="#0d1117" strokeWidth={3} />}
      </span>
      <span style={{
        flex: 1, fontSize: 13, lineHeight: 1.45,
        color: done ? "#6e7681" : "#e6edf3",
        textDecoration: done ? "line-through" : "none",
        transition: "color 0.15s",
      }}>
        {task.title}
      </span>
      {task.priority === 1 && (
        <span style={{ fontFamily: "DM Mono", fontSize: 9, color: "#ef4444", flexShrink: 0, marginTop: 2 }}>P1</span>
      )}
    </button>
  );
}

function QuickAdd({
  projectId, userId, dueDate, onDone,
}: {
  projectId: string; userId: string; dueDate: string; onDone: () => void;
}) {
  const { create } = useTaskMut();
  const [title, setTitle] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await create.mutateAsync({
        title: title.trim(),
        project_id: projectId,
        user_id: userId,
        due_date: dueDate,
        status: "todo",
        priority: 2,
        description: "",
        tags: [],
        subtasks: [],
        comments: [],
      } as any);
      toast.success("Tarefa criada");
      setTitle("");
      onDone();
    } catch {
      toast.error("Erro ao criar tarefa");
    }
  }

  return (
    <form onSubmit={submit} style={{ padding: "8px 14px 12px", borderTop: "1px solid #21262d" }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onDone()}
          placeholder="Nova tarefa..."
          style={{
            flex: 1, background: "#0d1117", border: "1px solid #30363d",
            color: "#e6edf3", padding: "6px 8px", borderRadius: 6, fontSize: 12,
          }}
        />
        <button type="submit" style={{
          background: "#f97316", color: "#0d1117", border: "none",
          padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 700,
        }}>+</button>
        <button type="button" onClick={onDone} style={{
          background: "transparent", border: "1px solid #30363d", color: "#8b949e",
          padding: "6px 8px", borderRadius: 6, cursor: "pointer", fontSize: 12,
        }}>✕</button>
      </div>
    </form>
  );
}

// ── styles ───────────────────────────────────────────────────────────────────

const arrowBtnStyle: React.CSSProperties = {
  background: "#161b22", border: "1px solid #30363d", color: "#e6edf3",
  padding: "6px 10px", borderRadius: 6, cursor: "pointer",
  display: "flex", alignItems: "center",
};

const todayBtnStyle: React.CSSProperties = {
  background: "rgba(249,115,22,0.10)", color: "#f97316",
  border: "1px solid rgba(249,115,22,0.3)",
  padding: "5px 12px", borderRadius: 6, cursor: "pointer",
  fontSize: 12, fontFamily: "DM Mono",
};
