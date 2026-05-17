import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { useProjects, useTasksForToday, useCreateTask, useCycleTaskStatus } from "@/lib/queries";
import type { Task } from "@/lib/types";
import { colors, spring, radius } from "@/lib/tokens";

// ── date helpers ────────────────────────────────────────────────────────────

function toIso(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
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
    timeZone: "America/Sao_Paulo",
  });
}

// ── main view ────────────────────────────────────────────────────────────────

export function HomeView() {
  const { data: projects = [] } = useProjects();
  const { data: tasks = [], isLoading } = useTasksForToday();
  const createTask = useCreateTask();
  const cycleStatus = useCycleTaskStatus();
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

  if (active.length === 0 && !isLoading) {
    return (
      <div style={{
        height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 12, padding: 32,
        background: colors.bg,
      }}>
        <div style={{ fontSize: 56, marginBottom: 4 }}>🚀</div>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>Bem-vindo ao Pedro's HQ</div>
        <div style={{ color: colors.textSecondary, fontSize: 14, textAlign: "center", maxWidth: 320 }}>
          Crie seu primeiro projeto na barra lateral para começar.
        </div>
      </div>
    );
  }

  const isToday = isTodayDate(selectedDate);
  const totalTasks = Object.values(tasksByProject).flat().length;
  const doneTasks = Object.values(tasksByProject).flat().filter((t) => t.status === "done").length;

  return (
    <div style={{ padding: "28px 28px 40px", minHeight: "100%", background: colors.bg }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            marginBottom: 4,
            color: colors.text,
          }}>Meu dia</h1>
          <p style={{ color: colors.textSecondary, fontSize: 13 }}>
            {totalTasks === 0
              ? "Nenhuma tarefa para este dia"
              : `${doneTasks} de ${totalTasks} ${totalTasks === 1 ? "tarefa concluída" : "tarefas concluídas"}`}
          </p>
        </div>
        {!isToday && (
          <button
            onClick={() => setSelectedDate(new Date())}
            style={{
              background: colors.accentBg,
              color: colors.accent,
              border: `1px solid ${colors.accentBorder}`,
              padding: "6px 14px",
              borderRadius: radius.full,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              transition: `all 0.18s ${spring.gentle}`,
            }}
          >Hoje</button>
        )}
      </div>

      {/* Date navigator */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        marginBottom: 28,
        padding: "12px 16px",
        background: colors.surface,
        borderRadius: radius.lg,
        border: `1px solid ${colors.border}`,
      }}>
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, -1))}
          style={arrowBtnStyle}
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{
          fontSize: 15,
          fontWeight: 600,
          minWidth: 300,
          textAlign: "center",
          color: isToday ? colors.accent : colors.text,
          textTransform: "capitalize",
          letterSpacing: "-0.01em",
        }}>
          {formatDateLabel(selectedDate)}
          {isToday && (
            <span style={{
              fontSize: 10,
              color: colors.accent,
              marginLeft: 8,
              opacity: 0.7,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}>
              · Hoje
            </span>
          )}
        </span>
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          style={arrowBtnStyle}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Project grid */}
      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 14 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{
              height: 130,
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.lg,
              opacity: 0.5,
            }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 14, alignItems: "start" }}>
          {active.map((project) => {
            const ptasks = tasksByProject[project.id] ?? [];
            const doneCt = ptasks.filter((t) => t.status === "done").length;
            const pct = ptasks.length > 0 ? Math.round((doneCt / ptasks.length) * 100) : 0;
            const allDone = ptasks.length > 0 && doneCt === ptasks.length;
            const isAdding = quickAddId === project.id;

            return (
              <div
                key={project.id}
                className="slide-in"
                style={{
                  background: "rgba(28,28,30,0.85)",
                  backdropFilter: "blur(20px) saturate(1.6)",
                  WebkitBackdropFilter: "blur(20px) saturate(1.6)",
                  border: `1px solid rgba(255,255,255,0.07)`,
                  borderRadius: radius.lg,
                  overflow: "hidden",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                {/* Card header */}
                <div style={{
                  padding: "12px 14px",
                  borderBottom: `1px solid rgba(84,84,88,0.3)`,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}>
                  <span style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    background: project.color,
                    flexShrink: 0,
                    boxShadow: `0 0 8px ${project.color}80`,
                  }} />
                  <span style={{
                    flex: 1,
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {project.name}
                  </span>
                  <span style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: radius.full,
                    background: allDone ? "rgba(48,209,88,0.15)" : "rgba(84,84,88,0.3)",
                    color: allDone ? colors.success : colors.textSecondary,
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 500,
                  }}>
                    {doneCt}/{ptasks.length}
                  </span>
                  <button
                    onClick={() => setQuickAddId(isAdding ? null : project.id)}
                    title="Adicionar tarefa"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: colors.textMuted,
                      cursor: "pointer",
                      padding: 3,
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      transition: `color 0.15s ${spring.gentle}`,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = colors.text)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = colors.textMuted)}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Progress bar */}
                {ptasks.length > 0 && (
                  <div style={{ height: 2, background: "rgba(84,84,88,0.25)" }}>
                    <div style={{
                      height: "100%",
                      background: pct === 100 ? colors.success : project.color,
                      width: `${pct}%`,
                      transition: `width 0.5s ${spring.default}`,
                      boxShadow: pct === 100 ? `0 0 6px ${colors.success}` : `0 0 6px ${project.color}80`,
                    }} />
                  </div>
                )}

                {/* Task list */}
                <div style={{ padding: "4px 0", maxHeight: 280, overflowY: "auto" }}>
                  {ptasks.length === 0 && !isAdding && (
                    <div style={{ padding: 16, color: colors.textMuted, fontSize: 12, fontStyle: "italic" }}>
                      Nenhuma tarefa para este dia
                    </div>
                  )}
                  {ptasks.map((task) => (
                    <TaskRowSimple
                      key={task.id}
                      task={task}
                      onToggle={() => cycleStatus.mutate({ id: task.id, currentStatus: task.status })}
                    />
                  ))}
                </div>

                {/* Quick add form */}
                {isAdding && (
                  <QuickAdd
                    projectId={project.id}
                    dueDate={selectedIso}
                    onDone={() => setQuickAddId(null)}
                    onCreate={async (title: string) => {
                      await createTask.mutateAsync({
                        title, project_id: project.id, due_date: selectedIso, status: "todo", priority: 2,
                      });
                      toast.success("Tarefa criada");
                      setQuickAddId(null);
                    }}
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

// ── sub-components ────────────────────────────────────────────────────────────

function TaskRowSimple({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const done = task.status === "done";
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      padding: "8px 14px",
      transition: `background 0.15s ${spring.gentle}`,
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <button
        onClick={onToggle}
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          flexShrink: 0,
          marginTop: 1,
          border: `1.5px solid ${done ? colors.success : "rgba(84,84,88,0.65)"}`,
          background: done ? colors.success : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: `all 0.25s ${spring.bounce}`,
          boxShadow: done ? `0 0 8px ${colors.success}60` : "none",
        }}
      >
        {done && <Check size={10} color="#000" strokeWidth={3} className="check-pop" />}
      </button>
      <span style={{
        flex: 1,
        fontSize: 13,
        lineHeight: 1.45,
        color: done ? colors.textMuted : colors.text,
        textDecoration: done ? "line-through" : "none",
        transition: `all 0.2s ${spring.gentle}`,
      }}>
        {task.title}
      </span>
      {task.priority === 1 && (
        <span style={{
          fontSize: 9,
          color: colors.p1,
          flexShrink: 0,
          marginTop: 2,
          fontWeight: 600,
          letterSpacing: "0.04em",
        }}>
          P1
        </span>
      )}
    </div>
  );
}

function QuickAdd({
  projectId: _pid, dueDate: _due, onDone, onCreate,
}: {
  projectId: string; dueDate: string; onDone: () => void; onCreate: (title: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await onCreate(title.trim());
      setTitle("");
    } catch {
      toast.error("Erro ao criar tarefa");
    }
  }

  return (
    <form onSubmit={submit} style={{
      padding: "8px 12px 12px",
      borderTop: `1px solid rgba(84,84,88,0.3)`,
    }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") onDone(); }}
          placeholder="Nova tarefa..."
          style={{
            flex: 1,
            background: colors.surfaceRaised,
            border: `1px solid ${colors.separator}`,
            color: colors.text,
            padding: "7px 10px",
            borderRadius: radius.sm,
            fontSize: 13,
          }}
        />
        <button type="submit" style={{
          background: colors.accent,
          color: "#000",
          border: "none",
          padding: "7px 12px",
          borderRadius: radius.sm,
          cursor: "pointer",
          fontSize: 15,
          fontWeight: 700,
        }}>+</button>
        <button type="button" onClick={onDone} style={{
          background: "transparent",
          border: `1px solid ${colors.separator}`,
          color: colors.textSecondary,
          padding: "7px 10px",
          borderRadius: radius.sm,
          cursor: "pointer",
          fontSize: 12,
        }}>✕</button>
      </div>
    </form>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const arrowBtnStyle: React.CSSProperties = {
  background: colors.surfaceRaised,
  border: `1px solid ${colors.border}`,
  color: colors.text,
  padding: "6px 10px",
  borderRadius: "8px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  transition: `background 0.15s cubic-bezier(0.4,0,0.2,1)`,
};
