import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { useProjects, useTasksForToday, useCreateTask, useCycleTaskStatus } from "@/lib/queries";
import type { Task } from "@/lib/types";
import { colors, spring, radius } from "@/lib/tokens";
import { DayCalendar } from "@/components/workspace/DayCalendar";

// ── date helpers ─────────────────────────────────────────────────────────────

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

// ── main view ─────────────────────────────────────────────────────────────────

export function HomeView() {
  const { data: projects = [] } = useProjects();
  const { data: tasks = [], isLoading } = useTasksForToday();
  const createTask = useCreateTask();
  const cycleStatus = useCycleTaskStatus();
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [quickAddId, setQuickAddId] = useState<string | null>(null);

  const active = projects.filter((p) => !p.archived);
  const selectedIso = toIso(selectedDate);
  const isToday = isTodayDate(selectedDate);

  const tasksByProject = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const p of active) {
      map[p.id] = tasks
        .filter((t) => t.project_id === p.id && t.due_date === selectedIso)
        .sort((a, b) => a.priority - b.priority);
    }
    return map;
  }, [tasks, active, selectedIso]);

  const totalTasks = Object.values(tasksByProject).flat().length;
  const doneTasks = Object.values(tasksByProject).flat().filter((t) => t.status === "done").length;

  if (active.length === 0 && !isLoading) {
    return (
      <div style={{
        height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 12, padding: 32,
        background: colors.bg,
      }}>
        <div style={{ fontSize: 56 }}>🚀</div>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>Bem-vindo ao Pedro's HQ</div>
        <div style={{ color: colors.textSecondary, fontSize: 14, textAlign: "center", maxWidth: 320 }}>
          Crie seu primeiro projeto na barra lateral para começar.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      background: colors.bg,
      overflow: "hidden",
    }}>
      {/* ── Top bar: header + date navigator ── */}
      <div style={{
        padding: "20px 24px 16px",
        flexShrink: 0,
        borderBottom: `1px solid ${colors.separator}`,
      }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <h1 style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              marginBottom: 3,
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
              }}
            >
              Hoje
            </button>
          )}
        </div>

        {/* Date navigator */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setSelectedDate(addDays(selectedDate, -1))} style={arrowBtnStyle}>
            <ChevronLeft size={15} />
          </button>
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            color: isToday ? colors.accent : colors.text,
            textTransform: "capitalize",
            letterSpacing: "-0.01em",
          }}>
            {formatDateLabel(selectedDate)}
            {isToday && (
              <span style={{
                fontSize: 9,
                color: colors.accent,
                marginLeft: 8,
                opacity: 0.7,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}>· Hoje</span>
            )}
          </span>
          <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} style={arrowBtnStyle}>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* ── Body: tasks (left) + calendar (right) ── */}
      <div style={{
        flex: 1,
        display: "flex",
        gap: 0,
        overflow: "hidden",
      }}>
        {/* Tasks column */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 20px 32px",
          minWidth: 0,
        }}>
          {isLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{
                  height: 120,
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.lg,
                  opacity: 0.4,
                }} />
              ))}
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 12,
              alignItems: "start",
            }}>
              {active.map((project) => {
                const ptasks = tasksByProject[project.id] ?? [];
                const doneCt = ptasks.filter((t) => t.status === "done").length;
                const pct = ptasks.length > 0 ? Math.round((doneCt / ptasks.length) * 100) : 0;
                const allDone = ptasks.length > 0 && doneCt === ptasks.length;
                const isAdding = quickAddId === project.id;

                return (
                  <div
                    key={project.id}
                    style={{
                      background: "rgba(28,28,30,0.85)",
                      backdropFilter: "blur(20px)",
                      WebkitBackdropFilter: "blur(20px)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: radius.lg,
                      overflow: "hidden",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
                    }}
                  >
                    {/* Card header */}
                    <div style={{
                      padding: "11px 13px",
                      borderBottom: "1px solid rgba(84,84,88,0.28)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}>
                      <span style={{
                        width: 9, height: 9, borderRadius: 5,
                        background: project.color, flexShrink: 0,
                        boxShadow: `0 0 8px ${project.color}80`,
                      }} />
                      <span style={{
                        flex: 1, fontSize: 13, fontWeight: 600,
                        letterSpacing: "-0.01em",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {project.name}
                      </span>
                      <span style={{
                        fontSize: 10,
                        padding: "2px 7px",
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
                        style={{
                          background: "transparent", border: "none",
                          color: colors.textMuted, cursor: "pointer",
                          padding: 3, borderRadius: 5,
                          display: "flex", alignItems: "center",
                        }}
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    {/* Progress bar */}
                    {ptasks.length > 0 && (
                      <div style={{ height: 2, background: "rgba(84,84,88,0.22)" }}>
                        <div style={{
                          height: "100%",
                          background: pct === 100 ? colors.success : project.color,
                          width: `${pct}%`,
                          transition: `width 0.5s ${spring.default}`,
                          boxShadow: pct === 100 ? `0 0 6px ${colors.success}` : `0 0 6px ${project.color}60`,
                        }} />
                      </div>
                    )}

                    {/* Tasks */}
                    <div style={{ padding: "4px 0", maxHeight: 260, overflowY: "auto" }}>
                      {ptasks.length === 0 && !isAdding && (
                        <div style={{ padding: 14, color: colors.textMuted, fontSize: 12, fontStyle: "italic" }}>
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

                    {/* Quick add */}
                    {isAdding && (
                      <QuickAdd
                        projectId={project.id}
                        dueDate={selectedIso}
                        onDone={() => setQuickAddId(null)}
                        onCreate={async (title) => {
                          await createTask.mutateAsync({
                            title, project_id: project.id,
                            due_date: selectedIso, status: "todo", priority: 2,
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

        {/* Calendar column */}
        <div style={{
          width: 340,
          flexShrink: 0,
          padding: "16px 16px 16px 0",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}>
          <DayCalendar isoDate={selectedIso} isToday={isToday} />
        </div>
      </div>
    </div>
  );
}

// ── TaskRowSimple ─────────────────────────────────────────────────────────────

function TaskRowSimple({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const done = task.status === "done";
  return (
    <div
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "8px 13px",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <button
        onClick={onToggle}
        style={{
          width: 18, height: 18, borderRadius: 9,
          flexShrink: 0, marginTop: 1,
          border: `1.5px solid ${done ? colors.success : "rgba(84,84,88,0.65)"}`,
          background: done ? colors.success : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          transition: `all 0.25s ${spring.bounce}`,
          boxShadow: done ? `0 0 8px ${colors.success}60` : "none",
        }}
      >
        {done && <Check size={10} color="#000" strokeWidth={3} />}
      </button>
      <span style={{
        flex: 1, fontSize: 13, lineHeight: 1.45,
        color: done ? colors.textMuted : colors.text,
        textDecoration: done ? "line-through" : "none",
      }}>
        {task.title}
      </span>
      {task.priority === 1 && (
        <span style={{
          fontSize: 9, color: colors.p1, flexShrink: 0,
          marginTop: 2, fontWeight: 600, letterSpacing: "0.04em",
        }}>P1</span>
      )}
    </div>
  );
}

// ── QuickAdd ──────────────────────────────────────────────────────────────────

function QuickAdd({
  projectId: _pid, dueDate: _due, onDone, onCreate,
}: {
  projectId: string; dueDate: string;
  onDone: () => void; onCreate: (title: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try { await onCreate(title.trim()); setTitle(""); }
    catch { toast.error("Erro ao criar tarefa"); }
  }

  return (
    <form onSubmit={submit} style={{ padding: "7px 10px 10px", borderTop: `1px solid rgba(84,84,88,0.28)` }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") onDone(); }}
          placeholder="Nova tarefa..."
          style={{
            flex: 1, background: colors.surfaceRaised,
            border: `1px solid ${colors.separator}`,
            color: colors.text, padding: "6px 9px",
            borderRadius: radius.sm, fontSize: 12,
          }}
        />
        <button type="submit" style={{
          background: colors.accent, color: "#000",
          border: "none", padding: "6px 11px",
          borderRadius: radius.sm, cursor: "pointer",
          fontSize: 14, fontWeight: 700,
        }}>+</button>
        <button type="button" onClick={onDone} style={{
          background: "transparent", border: `1px solid ${colors.separator}`,
          color: colors.textSecondary, padding: "6px 9px",
          borderRadius: radius.sm, cursor: "pointer", fontSize: 12,
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
  padding: "5px 9px",
  borderRadius: "8px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
};
