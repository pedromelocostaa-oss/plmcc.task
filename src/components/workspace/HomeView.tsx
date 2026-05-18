import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Check, ChevronDown, ChevronUp, ArrowRight, Calendar, Tag, CalendarDays, AlignLeft } from "lucide-react";
import { toast } from "sonner";
import { useProjects, useTasksForDate, useSetTaskStatus } from "@/lib/queries";
import type { Task } from "@/lib/types";
import { colors, spring, radius } from "@/lib/tokens";
import { DayCalendar } from "@/components/workspace/DayCalendar";
import { useIsMobile } from "@/hooks/use-is-mobile";

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
    weekday: "long", day: "numeric", month: "long",
    timeZone: "America/Sao_Paulo",
  });
}

// ── column config ────────────────────────────────────────────────────────────

const COLUMNS: { status: Task["status"]; label: string; accent: string; accentBg: string }[] = [
  { status: "todo",  label: "A Fazer",   accent: colors.textSecondary, accentBg: "rgba(84,84,88,0.18)" },
  { status: "doing", label: "Fazendo",   accent: colors.warning,       accentBg: "rgba(255,159,10,0.12)" },
  { status: "done",  label: "Concluído", accent: colors.success,       accentBg: "rgba(48,209,88,0.12)" },
];

// ── KanbanCard ────────────────────────────────────────────────────────────────

function KanbanCard({
  task,
  onMove,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  task: Task;
  onMove: (status: Task["status"]) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const project = task.project as { name: string; color: string } | undefined;
  const tags = task.task_tags ?? [];
  const subtasks = task.subtasks ?? [];
  const doneSubs = subtasks.filter((s) => s.done).length;

  const priorityMap: Record<number, { label: string; color: string }> = {
    1: { label: "P1", color: colors.p1 },
    2: { label: "P2", color: colors.p2 },
    3: { label: "P3", color: colors.p3 },
  };
  const p = priorityMap[task.priority] ?? priorityMap[2];

  const nextStatuses = COLUMNS
    .filter((c) => c.status !== task.status)
    .map((c) => ({ ...c }));

  const hasDetails = !!(task.description || subtasks.length > 0 || tags.length > 0 || task.due_date);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", task.id);
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
      style={{
        background: expanded ? colors.surfaceRaised : colors.cardBg,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: expanded
          ? `1px solid ${p.color}30`
          : `1px solid ${colors.cardBorder}`,
        borderRadius: radius.md,
        overflow: "hidden",
        boxShadow: expanded
          ? `0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px ${p.color}18`
          : "0 2px 8px rgba(0,0,0,0.15)",
        marginBottom: 8,
        transition: `background 0.2s ${spring.gentle}, border-color 0.2s ${spring.gentle}, box-shadow 0.2s ${spring.gentle}, opacity 0.15s`,
        cursor: "grab",
        opacity: isDragging ? 0.4 : 1,
        transform: isDragging ? "scale(0.97)" : "none",
      }}
      onClick={() => hasDetails && setExpanded((v) => !v)}
    >
      {/* Card body */}
      <div style={{ padding: "10px 12px" }}>
        {/* Project + priority row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
          {project && (
            <>
              <span style={{ width: 7, height: 7, borderRadius: 4, background: project.color, flexShrink: 0, boxShadow: `0 0 5px ${project.color}80` }} />
              <span style={{ fontSize: 11, color: colors.textSecondary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {project.name}
              </span>
            </>
          )}
          <span style={{
            fontSize: 9, fontWeight: 700, color: p.color,
            background: `${p.color}15`,
            padding: "1px 5px", borderRadius: 4,
            flexShrink: 0, letterSpacing: "0.04em",
          }}>{p.label}</span>
        </div>

        {/* Title */}
        <div style={{
          fontSize: 13, fontWeight: 500, lineHeight: 1.4,
          color: task.status === "done" ? colors.textMuted : colors.text,
          textDecoration: task.status === "done" ? "line-through" : "none",
          marginBottom: 6,
        }}>
          {task.title}
        </div>

        {/* Footer: date + tags + subtasks + expand hint */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {task.due_date && (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: colors.textMuted }}>
              <Calendar size={9} />
              {new Date(task.due_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
            </span>
          )}
          {subtasks.length > 0 && (
            <span style={{
              display: "flex", alignItems: "center", gap: 3,
              fontSize: 10, color: doneSubs === subtasks.length ? colors.success : colors.textMuted,
            }}>
              <Check size={9} />
              {doneSubs}/{subtasks.length}
            </span>
          )}
          {task.description && (
            <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10, color: colors.textMuted }}>
              <AlignLeft size={9} />
            </span>
          )}
          {tags.slice(0, 2).map((t) => (
            <span key={t.id} style={{
              fontSize: 9, padding: "1px 5px", borderRadius: "99px",
              background: "rgba(191,90,242,0.15)", color: "#BF5AF2",
            }}>{t.tag}</span>
          ))}
          {hasDetails && (
            <span style={{ marginLeft: "auto", color: expanded ? p.color : colors.textMuted, transition: `color 0.2s` }}>
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </span>
          )}
        </div>
      </div>

      {/* ── Expanded detail panel ─────────────────────────────────── */}
      {expanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            borderTop: `1px solid ${p.color}20`,
            animation: `cardExpand 0.18s ease-out`,
          }}
        >
          <style>{`
            @keyframes cardExpand {
              from { opacity: 0; transform: translateY(-6px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* Description block */}
          {task.description && (
            <div style={{
              padding: "12px 14px",
              borderBottom: subtasks.length > 0 || tags.length > 0
                ? "1px solid rgba(84,84,88,0.18)"
                : "none",
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                marginBottom: 6,
              }}>
                <AlignLeft size={11} color={colors.textMuted} />
                <span style={{ fontSize: 10, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
                  Descrição
                </span>
              </div>
              <p style={{
                fontSize: 13, color: colors.textSecondary,
                lineHeight: 1.65, margin: 0,
                whiteSpace: "pre-wrap",
              }}>
                {task.description}
              </p>
            </div>
          )}

          {/* Subtasks */}
          {subtasks.length > 0 && (
            <div style={{
              padding: "12px 14px",
              borderBottom: tags.length > 0
                ? "1px solid rgba(84,84,88,0.18)"
                : "none",
            }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 8,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Check size={11} color={colors.textMuted} />
                  <span style={{ fontSize: 10, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
                    Subtarefas
                  </span>
                </div>
                <span style={{ fontSize: 10, color: doneSubs === subtasks.length ? colors.success : colors.textMuted, fontWeight: 600 }}>
                  {doneSubs}/{subtasks.length}
                </span>
              </div>
              {/* Progress bar */}
              <div style={{
                height: 3, borderRadius: 2,
                background: "rgba(84,84,88,0.25)",
                marginBottom: 10, overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  width: `${subtasks.length ? (doneSubs / subtasks.length) * 100 : 0}%`,
                  background: doneSubs === subtasks.length ? colors.success : colors.accent,
                  borderRadius: 2,
                  transition: "width 0.3s ease",
                }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {subtasks.map((s) => (
                  <div key={s.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{
                      width: 16, height: 16, borderRadius: 8,
                      border: `1.5px solid ${s.done ? colors.success : colors.separator}`,
                      background: s.done ? colors.success : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, marginTop: 1,
                    }}>
                      {s.done && <Check size={9} color="#000" strokeWidth={3} />}
                    </span>
                    <span style={{
                      fontSize: 13, lineHeight: 1.4,
                      color: s.done ? colors.textMuted : colors.text,
                      textDecoration: s.done ? "line-through" : "none",
                    }}>
                      {s.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(84,84,88,0.18)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                <Tag size={11} color={colors.textMuted} />
                <span style={{ fontSize: 10, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
                  Tags
                </span>
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {tags.map((t) => (
                  <span key={t.id} style={{
                    fontSize: 11, padding: "3px 8px", borderRadius: "99px",
                    background: "rgba(191,90,242,0.15)",
                    border: "1px solid rgba(191,90,242,0.25)",
                    color: "#BF5AF2",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <Tag size={8} />{t.tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Move buttons */}
          <div style={{ padding: "10px 14px", display: "flex", gap: 6 }}>
            {nextStatuses.map((col) => (
              <button
                key={col.status}
                onClick={() => { onMove(col.status); setExpanded(false); }}
                style={{
                  flex: 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  padding: "7px 8px",
                  background: col.accentBg,
                  border: `1px solid ${col.accent}35`,
                  borderRadius: radius.sm,
                  color: col.accent,
                  cursor: "pointer",
                  fontSize: 11, fontWeight: 600,
                  transition: `filter 0.15s`,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.filter = "brightness(1.2)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = ""; }}
              >
                <ArrowRight size={11} />
                {col.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── KanbanColumn ──────────────────────────────────────────────────────────────

function KanbanColumn({
  config, tasks, onMove, draggedTaskId,
  onDragOver, onDrop, onDragLeave, isDragOver,
  onCardDragStart, onCardDragEnd,
}: {
  config: typeof COLUMNS[number];
  tasks: Task[];
  onMove: (id: string, status: Task["status"]) => void;
  draggedTaskId: string | null;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  isDragOver: boolean;
  onCardDragStart: (id: string) => void;
  onCardDragEnd: () => void;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        background: isDragOver ? config.accentBg : colors.columnBg,
        borderRadius: radius.lg,
        border: isDragOver
          ? `1px solid ${config.accent}60`
          : `1px solid ${colors.cardBorder}`,
        overflow: "hidden",
        transition: `background 0.15s ${spring.gentle}, border-color 0.15s ${spring.gentle}`,
        boxShadow: isDragOver ? `0 0 0 2px ${config.accent}30` : "none",
      }}
    >
      {/* Column header */}
      <div style={{
        padding: "11px 14px",
        borderBottom: "1px solid rgba(84,84,88,0.25)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: 4, background: config.accent, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, flex: 1, letterSpacing: "-0.01em" }}>
          {config.label}
        </span>
        <span style={{
          fontSize: 10, padding: "2px 7px", borderRadius: "99px",
          background: config.accentBg,
          color: config.accent,
          fontVariantNumeric: "tabular-nums",
          fontWeight: 600,
        }}>
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px 12px" }}>
        {tasks.length === 0 && (
          <div style={{
            textAlign: "center", padding: "24px 8px",
            color: colors.textMuted, fontSize: 12,
            fontStyle: "italic",
          }}>
            {config.status === "done" ? "Nenhuma tarefa concluída" : "Vazio"}
          </div>
        )}
        {tasks.map((t) => (
          <KanbanCard
            key={t.id}
            task={t}
            onMove={(status) => onMove(t.id, status)}
            isDragging={draggedTaskId === t.id}
            onDragStart={() => onCardDragStart(t.id)}
            onDragEnd={onCardDragEnd}
          />
        ))}
      </div>
    </div>
  );
}

// ── HomeView ──────────────────────────────────────────────────────────────────

export function HomeView() {
  const { data: projects = [] } = useProjects();
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [sortByPriority, setSortByPriority] = useState(false);
  const [mobileColumn, setMobileColumn] = useState<Task["status"]>("todo");
  const [showCalendar, setShowCalendar] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Task["status"] | null>(null);
  const isMobile = useIsMobile();
  const setStatus = useSetTaskStatus();

  const selectedIso = toIso(selectedDate);
  const isToday = isTodayDate(selectedDate);

  const { data: allTasks = [], isLoading } = useTasksForDate(selectedIso);

  // Apply filters
  const filtered = useMemo(() => {
    let tasks = allTasks;
    if (projectFilter) tasks = tasks.filter((t) => t.project_id === projectFilter);
    if (sortByPriority) tasks = [...tasks].sort((a, b) => a.priority - b.priority);
    return tasks;
  }, [allTasks, projectFilter, sortByPriority]);

  const columns = useMemo(() => {
    return COLUMNS.map((col) => ({
      ...col,
      tasks: filtered.filter((t) => t.status === col.status),
    }));
  }, [filtered]);

  const totalCount = allTasks.length;
  const doneCount = allTasks.filter((t) => t.status === "done").length;

  function handleMove(id: string, status: Task["status"]) {
    const task = allTasks.find((t) => t.id === id);
    if (!task) return;
    setStatus.mutate(
      { id, status, projectId: task.project_id },
      { onError: () => toast.error("Erro ao mover tarefa") }
    );
  }

  function handleDrop(targetStatus: Task["status"]) {
    if (!draggedTaskId) return;
    const task = allTasks.find((t) => t.id === draggedTaskId);
    if (!task || task.status === targetStatus) return;
    handleMove(draggedTaskId, targetStatus);
    setDraggedTaskId(null);
    setDragOverColumn(null);
  }

  const activeProjects = projects.filter((p) => !p.archived);

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100dvh", background: colors.bg, overflow: "hidden",
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: isMobile ? "12px 16px 10px" : "18px 20px 14px",
        borderBottom: `1px solid ${colors.separator}`,
        flexShrink: 0,
        paddingTop: isMobile ? "calc(12px + env(safe-area-inset-top, 0px))" : "18px",
      }}>
        {/* Title row */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: 10,
          gap: 8,
        }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{
              fontSize: isMobile ? 20 : 22,
              fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 1,
            }}>Meu dia</h1>
            <p style={{ color: colors.textSecondary, fontSize: 11, margin: 0 }}>
              {isLoading ? "Carregando..." :
                totalCount === 0 ? "Nenhuma tarefa neste dia" :
                `${doneCount}/${totalCount} concluída${doneCount !== 1 ? "s" : ""}`
              }
            </p>
          </div>

          {/* Date navigator */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {!isToday && (
              <button onClick={() => setSelectedDate(new Date())} style={{
                background: colors.accentBg, color: colors.accent,
                border: `1px solid ${colors.accentBorder}`,
                padding: "4px 10px", borderRadius: radius.full,
                cursor: "pointer", fontSize: 12, fontWeight: 600,
                minHeight: 32,
              }}>Hoje</button>
            )}
            <button onClick={() => setSelectedDate(addDays(selectedDate, -1))} style={arrowBtn}>
              <ChevronLeft size={14} />
            </button>
            <span style={{
              fontSize: isMobile ? 12 : 13, fontWeight: 600,
              color: isToday ? colors.accent : colors.text,
              textTransform: "capitalize", letterSpacing: "-0.01em",
              minWidth: isMobile ? 100 : 240, textAlign: "center",
            }}>
              {isMobile
                ? selectedDate.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Sao_Paulo" })
                : formatDateLabel(selectedDate)
              }
              {isToday && <span style={{ fontSize: 9, color: colors.accent, marginLeft: 4, opacity: 0.7, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em" }}>· Hoje</span>}
            </span>
            <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} style={arrowBtn}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Filter bar — horizontal scroll on mobile */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          overflowX: "auto", WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"],
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          paddingBottom: 2,
        }}>
          <button onClick={() => setProjectFilter(null)} style={filterPill(projectFilter === null)}>Todos</button>
          {activeProjects.map((p) => (
            <button
              key={p.id}
              onClick={() => setProjectFilter(projectFilter === p.id ? null : p.id)}
              style={filterPill(projectFilter === p.id)}
            >
              <span style={{ width: 6, height: 6, borderRadius: 3, background: p.color, flexShrink: 0 }} />
              {p.name}
            </button>
          ))}

          {/* Priority sort — always at the right, flex-shrink 0 */}
          <div style={{ marginLeft: "auto", flexShrink: 0 }}>
            <button
              onClick={() => setSortByPriority((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px",
                background: sortByPriority ? colors.accentBg : "transparent",
                border: sortByPriority ? `1px solid ${colors.accentBorder}` : `1px solid ${colors.separator}`,
                borderRadius: radius.sm,
                color: sortByPriority ? colors.accent : colors.textSecondary,
                cursor: "pointer", fontSize: 12, fontWeight: sortByPriority ? 600 : 400,
                whiteSpace: "nowrap",
              }}
            >
              ↑ Prioridade
            </button>
          </div>

          {/* Calendar toggle — mobile only */}
          {isMobile && (
            <button
              onClick={() => setShowCalendar((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "4px 10px",
                background: showCalendar ? colors.accentBg : "transparent",
                border: showCalendar ? `1px solid ${colors.accentBorder}` : `1px solid ${colors.separator}`,
                borderRadius: radius.sm,
                color: showCalendar ? colors.accent : colors.textSecondary,
                cursor: "pointer", fontSize: 12, fontWeight: showCalendar ? 600 : 400,
                flexShrink: 0,
              }}
            >
              <CalendarDays size={12} />
              Agenda
            </button>
          )}
        </div>

        {/* Mobile — segmented column switcher */}
        {isMobile && !showCalendar && (
          <div style={{
            display: "flex", gap: 0, marginTop: 10,
            background: colors.surface,
            borderRadius: radius.md,
            padding: 3,
            border: `1px solid ${colors.separator}`,
          }}>
            {COLUMNS.map((col) => {
              const active = mobileColumn === col.status;
              const count = columns.find((c) => c.status === col.status)?.tasks.length ?? 0;
              return (
                <button
                  key={col.status}
                  onClick={() => setMobileColumn(col.status)}
                  style={{
                    flex: 1,
                    padding: "7px 4px",
                    borderRadius: radius.sm,
                    border: "none",
                    background: active ? col.accentBg : "transparent",
                    color: active ? col.accent : colors.textMuted,
                    cursor: "pointer",
                    fontSize: 12, fontWeight: active ? 700 : 400,
                    transition: `all 0.15s ${spring.gentle}`,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  }}
                >
                  {col.label}
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    background: active ? col.accent + "25" : "rgba(84,84,88,0.25)",
                    color: active ? col.accent : colors.textMuted,
                    borderRadius: "99px", padding: "0px 5px",
                    lineHeight: "16px",
                  }}>{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      {isMobile ? (
        /* ── MOBILE: single column or calendar ── */
        showCalendar ? (
          <div style={{ flex: 1, padding: "12px 12px 80px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <DayCalendar isoDate={selectedIso} isToday={isToday} />
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "12px 12px 80px" }}>
            {isLoading ? (
              <div style={{ background: colors.surface, borderRadius: radius.lg, height: 200, opacity: 0.4 }} />
            ) : (
              (() => {
                const col = columns.find((c) => c.status === mobileColumn);
                if (!col) return null;
                return (
                  <>
                    {col.tasks.length === 0 && (
                      <div style={{ textAlign: "center", padding: "40px 8px", color: colors.textMuted, fontSize: 13 }}>
                        {col.status === "done" ? "Nenhuma tarefa concluída" : "Vazio"}
                      </div>
                    )}
                    {col.tasks.map((t) => (
                      <KanbanCard key={t.id} task={t} onMove={(status) => handleMove(t.id, status)} />
                    ))}
                  </>
                );
              })()
            )}
          </div>
        )
      ) : (
        /* ── DESKTOP: 3-column kanban + calendar panel ── */
        <div style={{ flex: 1, display: "flex", gap: 0, overflow: "hidden" }}>
          <div style={{
            flex: 1, display: "flex", gap: 10,
            padding: "14px 14px 14px",
            overflow: "hidden",
            minWidth: 0,
          }}>
            {isLoading ? (
              Array.from({ length: 3 }, (_, i) => (
                <div key={i} style={{
                  flex: 1, background: colors.surface, borderRadius: radius.lg,
                  border: `1px solid ${colors.border}`, opacity: 0.4,
                }} />
              ))
            ) : (
              columns.map((col) => (
                <KanbanColumn
                  key={col.status}
                  config={col}
                  tasks={col.tasks}
                  onMove={handleMove}
                  draggedTaskId={draggedTaskId}
                  isDragOver={dragOverColumn === col.status}
                  onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col.status); }}
                  onDrop={(e) => { e.preventDefault(); handleDrop(col.status); }}
                  onDragLeave={() => setDragOverColumn(null)}
                  onCardDragStart={(id) => setDraggedTaskId(id)}
                  onCardDragEnd={() => { setDraggedTaskId(null); setDragOverColumn(null); }}
                />
              ))
            )}
          </div>

          <div style={{
            width: 320, flexShrink: 0,
            padding: "14px 14px 14px 0",
            display: "flex", flexDirection: "column",
          }}>
            <DayCalendar isoDate={selectedIso} isToday={isToday} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const arrowBtn: React.CSSProperties = {
  background: colors.surfaceRaised,
  border: `1px solid ${colors.border}`,
  color: colors.text,
  padding: "4px 8px", borderRadius: "7px",
  cursor: "pointer", display: "flex", alignItems: "center",
};

const filterPill = (active: boolean): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 5,
  padding: "3px 10px",
  background: active ? colors.accentBg : "transparent",
  border: active ? `1px solid ${colors.accentBorder}` : `1px solid ${colors.separator}`,
  borderRadius: radius.full,
  color: active ? colors.accent : colors.textSecondary,
  cursor: "pointer", fontSize: 12,
  fontWeight: active ? 600 : 400,
  transition: `all 0.15s ${spring.gentle}`,
});
