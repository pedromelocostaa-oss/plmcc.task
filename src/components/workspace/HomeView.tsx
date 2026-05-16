import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { useProjects, useTasksForToday, useCreateTask } from "@/lib/queries";
import type { Task } from "@/lib/types";
import { colors } from "@/lib/tokens";

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
        alignItems: "center", justifyContent: "center", gap: 8, padding: 32,
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🚀</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Bem-vindo ao Pedro's HQ</div>
        <div style={{ color: colors.textSecondary, fontSize: 13 }}>
          Crie seu primeiro projeto na barra lateral para começar.
        </div>
      </div>
    );
  }

  const isToday = isTodayDate(selectedDate);

  return (
    <div style={{ padding: 32, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Meu dia</h1>
          <p style={{ color: colors.textSecondary, fontSize: 13 }}>Tarefas por projeto no dia selecionado</p>
        </div>
        {!isToday && (
          <button onClick={() => setSelectedDate(new Date())} style={todayBtnStyle}>Hoje</button>
        )}
      </div>

      {/* Date navigator */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 28 }}>
        <button onClick={() => setSelectedDate(addDays(selectedDate, -1))} style={arrowBtnStyle}>
          <ChevronLeft size={16} />
        </button>
        <span style={{
          fontSize: 15, fontWeight: 600, minWidth: 300, textAlign: "center",
          color: isToday ? colors.accent : colors.text,
          textTransform: "capitalize",
        }}>
          {formatDateLabel(selectedDate)}
          {isToday && (
            <span style={{
              fontFamily: "JetBrains Mono, monospace", fontSize: 10,
              color: colors.accent, marginLeft: 8, opacity: 0.7,
            }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{
              height: 120, background: colors.surface, border: `1px solid ${colors.border}`,
              borderRadius: 10,
            }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, alignItems: "start" }}>
          {active.map((project) => {
            const ptasks = tasksByProject[project.id] ?? [];
            const doneCt = ptasks.filter((t) => t.status === "done").length;
            const pct = ptasks.length > 0 ? Math.round((doneCt / ptasks.length) * 100) : 0;
            const allDone = ptasks.length > 0 && doneCt === ptasks.length;
            const isAdding = quickAddId === project.id;

            return (
              <div key={project.id} style={{
                background: colors.surface, border: `1px solid ${colors.border}`,
                borderRadius: 10, overflow: "hidden",
              }}>
                <div style={{
                  padding: "11px 14px", borderBottom: `1px solid ${colors.borderLight}`,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: project.color, flexShrink: 0 }} />
                  <span style={{
                    flex: 1, fontSize: 13, fontWeight: 600,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {project.name}
                  </span>
                  <span style={{
                    fontFamily: "JetBrains Mono, monospace", fontSize: 10, padding: "1px 6px", borderRadius: 4,
                    background: allDone ? "rgba(63,185,80,0.13)" : colors.borderLight,
                    color: allDone ? colors.success : colors.textSecondary,
                  }}>
                    {doneCt}/{ptasks.length}
                  </span>
                  <button
                    onClick={() => setQuickAddId(isAdding ? null : project.id)}
                    title="Adicionar tarefa"
                    style={{
                      background: "transparent", border: "none", color: colors.textSecondary,
                      cursor: "pointer", padding: 3, borderRadius: 4, display: "flex", alignItems: "center",
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {ptasks.length > 0 && (
                  <div style={{ height: 2, background: colors.borderLight }}>
                    <div style={{
                      height: "100%",
                      background: pct === 100 ? colors.success : project.color,
                      width: `${pct}%`,
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                )}

                <div style={{ padding: "4px 0", maxHeight: 260, overflowY: "auto" }}>
                  {ptasks.length === 0 && !isAdding && (
                    <div style={{ padding: 14, color: colors.textMuted, fontSize: 12, fontStyle: "italic" }}>
                      Nenhuma tarefa para este dia
                    </div>
                  )}
                  {ptasks.map((task) => (
                    <TaskRowSimple key={task.id} task={task} />
                  ))}
                </div>

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

function TaskRowSimple({ task }: { task: Task }) {
  const done = task.status === "done";
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 14px" }}>
      <span style={{
        width: 15, height: 15, borderRadius: 4, flexShrink: 0, marginTop: 1,
        border: `1.5px solid ${done ? colors.success : colors.border}`,
        background: done ? colors.success : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {done && <Check size={9} color="#0d1117" strokeWidth={3} />}
      </span>
      <span style={{
        flex: 1, fontSize: 13, lineHeight: 1.45,
        color: done ? colors.textMuted : colors.text,
        textDecoration: done ? "line-through" : "none",
      }}>
        {task.title}
      </span>
      {task.priority === 1 && (
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: colors.p1, flexShrink: 0, marginTop: 2 }}>
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
    <form onSubmit={submit} style={{ padding: "8px 14px 12px", borderTop: `1px solid ${colors.borderLight}` }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") onDone(); }}
          placeholder="Nova tarefa..."
          style={{
            flex: 1, background: "#0d1117", border: `1px solid ${colors.border}`,
            color: colors.text, padding: "6px 8px", borderRadius: 6, fontSize: 12,
          }}
        />
        <button type="submit" style={{
          background: colors.accent, color: "#0d1117", border: "none",
          padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 700,
        }}>+</button>
        <button type="button" onClick={onDone} style={{
          background: "transparent", border: `1px solid ${colors.border}`,
          color: colors.textSecondary, padding: "6px 8px", borderRadius: 6, cursor: "pointer", fontSize: 12,
        }}>✕</button>
      </div>
    </form>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const arrowBtnStyle: React.CSSProperties = {
  background: colors.surface, border: `1px solid ${colors.border}`, color: colors.text,
  padding: "6px 10px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center",
};

const todayBtnStyle: React.CSSProperties = {
  background: colors.accentBg, color: colors.accent,
  border: `1px solid ${colors.accentBorder}`,
  padding: "5px 12px", borderRadius: 6, cursor: "pointer",
  fontSize: 12, fontFamily: "JetBrains Mono, monospace",
};
