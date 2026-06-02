import { useMemo } from "react";
import { CalendarDays, Check } from "lucide-react";
import { useAllTasks, useSetTaskStatus } from "@/lib/queries";
import type { Task } from "@/lib/types";
import { tagColor } from "@/lib/types";
import { toIso } from "@/lib/format";
import { colors, radius, spring } from "@/lib/tokens";
import { useIsMobile } from "@/hooks/use-is-mobile";

function formatDayLabel(iso: string): string {
  const date = new Date(iso + "T12:00:00");
  const todayIso = toIso(new Date());
  const tomorrowIso = toIso(new Date(Date.now() + 86400000));
  if (iso === todayIso) return "Hoje";
  if (iso === tomorrowIso) return "Amanhã";
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

function get7Days(): string[] {
  const today = toIso(new Date());
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(toIso(d));
  }
  return days;
}

const priorityMap: Record<number, { label: string; color: string }> = {
  1: { label: "P1", color: "var(--hq-p1)" },
  2: { label: "P2", color: "var(--hq-p2)" },
  3: { label: "P3", color: "var(--hq-p3)" },
};

function TaskRow({ task, onToggleDone }: { task: Task; onToggleDone: (t: Task) => void }) {
  const tags = task.task_tags ?? [];
  const subtasks = task.subtasks ?? [];
  const doneSubs = subtasks.filter((s) => s.done).length;
  const p = priorityMap[task.priority] ?? priorityMap[2];
  const project = task.project as { name: string; color: string } | undefined;
  const isDone = task.status === "done";

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "10px 14px",
      background: "var(--hq-card-bg)",
      borderRadius: radius.md,
      border: `1px solid var(--hq-card-border)`,
      marginBottom: 6,
      opacity: isDone ? 0.55 : 1,
      transition: `opacity 0.2s ${spring.gentle}`,
    }}>
      {/* Checkbox interativo */}
      <button
        onClick={() => onToggleDone(task)}
        title={isDone ? "Reabrir tarefa" : "Marcar como concluída"}
        style={{
          width: 18, height: 18, borderRadius: 9, flexShrink: 0, marginTop: 2,
          border: `1.5px solid ${isDone ? "var(--hq-success)" : "var(--hq-border)"}`,
          background: isDone ? "var(--hq-success)" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", padding: 0,
          transition: `all 0.15s ${spring.gentle}`,
        }}
      >
        {isDone && <Check size={10} color="#000" strokeWidth={3} />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Project + priority */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          {project && (
            <>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: project.color, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: colors.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {project.name}
              </span>
            </>
          )}
          <span style={{
            fontSize: 9, fontWeight: 700, color: p.color,
            background: `${p.color}15`,
            padding: "1px 5px", borderRadius: 3,
            flexShrink: 0, letterSpacing: "0.04em", marginLeft: "auto",
          }}>{p.label}</span>
        </div>

        {/* Title */}
        <div style={{
          fontSize: 13, fontWeight: 500, lineHeight: 1.4,
          color: task.status === "done" ? colors.textMuted : colors.text,
          textDecoration: task.status === "done" ? "line-through" : "none",
          marginBottom: tags.length > 0 || subtasks.length > 0 ? 5 : 0,
        }}>
          {task.title}
        </div>

        {/* Footer */}
        {(tags.length > 0 || subtasks.length > 0) && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {subtasks.length > 0 && (
              <span style={{
                display: "flex", alignItems: "center", gap: 3,
                fontSize: 10, color: doneSubs === subtasks.length ? colors.success : colors.textMuted,
              }}>
                <Check size={9} />
                {doneSubs}/{subtasks.length}
              </span>
            )}
            {tags.slice(0, 3).map((t) => {
              const tc = tagColor(t.tag);
              return (
                <span key={t.id} style={{
                  fontSize: 9, padding: "1px 5px", borderRadius: "99px",
                  background: `${tc}22`, color: tc,
                }}>{t.tag}</span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function UpcomingView() {
  const isMobile = useIsMobile();
  const setStatus = useSetTaskStatus();
  const days = useMemo(() => get7Days(), []);
  const todayIso = toIso(new Date());
  const lastIso = days[days.length - 1];

  function handleToggleDone(task: Task) {
    const newStatus = task.status === "done" ? "todo" : "done";
    setStatus.mutate({ id: task.id, status: newStatus, projectId: task.project_id });
  }

  const { data: allTasks = [], isLoading } = useAllTasks({ due_start: todayIso, due_end: lastIso });

  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const day of days) map[day] = [];
    for (const task of allTasks) {
      if (task.due_date && map[task.due_date]) {
        map[task.due_date].push(task);
      }
    }
    return map;
  }, [allTasks, days]);

  const totalCount = allTasks.length;
  const doneCount = allTasks.filter((t) => t.status === "done").length;
  const pendingCount = totalCount - doneCount;

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100dvh", background: colors.bg, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? "14px 16px 12px" : "20px 24px 14px",
        borderBottom: `1px solid ${colors.separator}`,
        flexShrink: 0,
        paddingTop: isMobile ? "calc(14px + env(safe-area-inset-top, 0px))" : "20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #5856D6, #3d3bbf)",
            display: "grid", placeItems: "center",
            boxShadow: "0 2px 8px rgba(88,86,214,0.35)",
          }}>
            <CalendarDays size={18} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", margin: 0 }}>
              Próximos 7 dias
            </h1>
            <p style={{ fontSize: 11, color: colors.textSecondary, margin: 0, marginTop: 2 }}>
              {isLoading ? "Carregando..." : `${pendingCount} tarefa${pendingCount !== 1 ? "s" : ""} pendente${pendingCount !== 1 ? "s" : ""} · ${doneCount} concluída${doneCount !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: isMobile ? "12px 12px 80px" : "16px 24px 32px" }}>
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} style={{ background: colors.surface, borderRadius: radius.lg, height: 80, opacity: 0.4 }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {days.map((iso) => {
              const dayTasks = tasksByDay[iso] ?? [];
              const isToday = iso === todayIso;
              return (
                <div key={iso}>
                  {/* Day header */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    marginBottom: 8,
                  }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700,
                      color: isToday ? colors.accent : colors.textSecondary,
                      textTransform: "capitalize",
                      letterSpacing: "-0.01em",
                    }}>
                      {formatDayLabel(iso)}
                    </div>
                    <div style={{ flex: 1, height: 1, background: colors.separator }} />
                    <span style={{
                      fontSize: 10, color: dayTasks.length > 0 ? colors.textSecondary : colors.textMuted,
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {dayTasks.length} tarefa{dayTasks.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Tasks */}
                  {dayTasks.length === 0 ? (
                    <div style={{
                      padding: "12px 14px",
                      border: `1px dashed var(--hq-border)`,
                      borderRadius: radius.md,
                      color: colors.textMuted,
                      fontSize: 12, fontStyle: "italic", textAlign: "center",
                    }}>
                      Nenhuma tarefa
                    </div>
                  ) : (
                    dayTasks.map((task) => <TaskRow key={task.id} task={task} onToggleDone={handleToggleDone} />)
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
