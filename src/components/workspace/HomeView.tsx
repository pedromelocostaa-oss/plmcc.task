import { useState, useMemo } from "react";
import { TaskCardSkeleton } from "@/components/ui/skeleton-card";
import { useLongPress } from "@/hooks/use-long-press";
import { SwipeableCard } from "@/components/workspace/SwipeableCard";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { haptics } from "@/lib/haptics";
import { ChevronLeft, ChevronRight, Check, ChevronDown, ChevronUp, ArrowRight, Calendar, Tag, AlignLeft, Maximize2, Minimize2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { showUndoToast } from "@/components/ui/undo-toast";
import { useProjects, useTasksForDate, useSetTaskStatus, useCreateTask, useDeleteTask } from "@/lib/queries";
import type { Task } from "@/lib/types";
import { tagColor } from "@/lib/types";
import { TaskDetailPanel } from "@/components/workspace/TaskDetailPanel";
import { colors, spring, radius } from "@/lib/tokens";
import { DayCalendar, fetchCalendarEvents } from "@/components/workspace/DayCalendar";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useResizable } from "@/hooks/use-resizable";
import type { CalendarEvent } from "@/lib/calendar-api";
import { Route } from "@/routes/index";

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

function getWeekDays(referenceDate: Date): Date[] {
  // Get Mon–Sun of the week containing referenceDate
  const d = new Date(referenceDate);
  // getDay(): 0=Sun,1=Mon,...,6=Sat
  const dow = d.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMon);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day;
  });
}

// ── greeting ─────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

// ── ProgressRing ──────────────────────────────────────────────────────────────

function ProgressRing({ value, size = 52 }: { value: number; size?: number }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(1, value)));
  const done = value >= 1;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--hq-border)" strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={r}
          stroke={done ? "var(--hq-success)" : "var(--hq-accent)"}
          strokeWidth={stroke} fill="none"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 480ms cubic-bezier(0.2,0.85,0.25,1), stroke 240ms" }}
        />
      </svg>
      <span style={{
        position: "absolute", inset: 0, display: "grid", placeItems: "center",
        fontSize: size <= 44 ? 11 : 12, fontWeight: 700,
        fontFamily: '"SF Mono", ui-monospace, monospace',
        color: done ? "var(--hq-success)" : "var(--hq-text)",
        fontVariantNumeric: "tabular-nums",
      }}>
        {Math.round(Math.max(0, Math.min(1, value)) * 100)}%
      </span>
    </div>
  );
}

const DAY_ABBR = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const EVENT_COLORS_WEEK = [
  { bg: "rgba(255,107,0,0.18)", border: "#FF6B00", text: "#FF6B00" },
  { bg: "rgba(10,132,255,0.18)", border: "#0A84FF", text: "#0A84FF" },
  { bg: "rgba(48,209,88,0.18)", border: "#30D158", text: "#30D158" },
  { bg: "rgba(191,90,242,0.18)", border: "#BF5AF2", text: "#BF5AF2" },
  { bg: "rgba(255,159,10,0.18)", border: "#FF9F0A", text: "#FF9F0A" },
];

// ── WeekDayColumn ─────────────────────────────────────────────────────────────

function WeekDayColumn({ day, isRef }: { day: Date; isRef: boolean }) {
  const iso = toIso(day);
  const todayIso = toIso(new Date());
  const isToday = iso === todayIso;
  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["calendar-events", iso],
    queryFn: () => fetchCalendarEvents(iso),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const dowLabel = DAY_ABBR[day.getDay()];
  const dayNum = day.getDate();

  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      borderRight: `1px solid ${colors.separator}`,
    }}>
      {/* Day header */}
      <div style={{
        padding: "6px 4px",
        textAlign: "center",
        borderBottom: `1px solid ${colors.separator}`,
        flexShrink: 0,
        background: isToday ? "rgba(229,132,48,0.10)" : "transparent",
      }}>
        <div style={{ fontSize: 9, color: isToday ? colors.accent : colors.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {dowLabel}
        </div>
        <div style={{
          fontSize: 15, fontWeight: isToday ? 700 : 500,
          color: isToday ? colors.accent : (isRef ? colors.text : colors.textSecondary),
          lineHeight: 1.2,
        }}>
          {dayNum}
        </div>
        {isToday && (
          <div style={{ fontSize: 8, color: colors.accent, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            hoje
          </div>
        )}
      </div>

      {/* Events */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 3px", display: "flex", flexDirection: "column", gap: 2 }}>
        {events.map((ev, i) => {
          const c = EVENT_COLORS_WEEK[i % EVENT_COLORS_WEEK.length];
          return (
            <a
              key={ev.id}
              href={ev.url}
              target="_blank"
              rel="noopener noreferrer"
              title={ev.title}
              style={{
                display: "block",
                padding: "2px 5px",
                borderRadius: 4,
                background: c.bg,
                borderLeft: `2px solid ${c.border}`,
                fontSize: 10,
                color: colors.text,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              {ev.title}
            </a>
          );
        })}
        {events.length === 0 && (
          <div style={{ flex: 1 }} />
        )}
      </div>
    </div>
  );
}

// ── WeekCalendarInline ────────────────────────────────────────────────────────

function WeekCalendarInline({ referenceDate }: { referenceDate: Date }) {
  const weekDays = getWeekDays(referenceDate);
  const refIso = toIso(referenceDate);

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "row",
      overflow: "hidden",
      minHeight: 0,
    }}>
      {weekDays.map((day) => (
        <WeekDayColumn key={toIso(day)} day={day} isRef={toIso(day) === refIso} />
      ))}
    </div>
  );
}

// ── column config ────────────────────────────────────────────────────────────

const COLUMNS: { status: Task["status"]; label: string; accent: string; accentBg: string }[] = [
  { status: "todo",  label: "A Fazer",   accent: colors.textSecondary, accentBg: "rgba(84,84,88,0.18)" },
  { status: "doing", label: "Fazendo",   accent: colors.warning,       accentBg: "rgba(255,159,10,0.12)" },
  { status: "done",  label: "Concluído", accent: colors.success,       accentBg: "rgba(48,209,88,0.12)" },
];

// ── InlineAdd ─────────────────────────────────────────────────────────────────

function InlineAdd({ status, columnAccent, selectedDate }: { status: string; columnAccent: string; selectedDate: string }) {
  const [focused, setFocused] = useState(false);
  const [val, setVal] = useState("");
  const { data: projects = [] } = useProjects();
  const createTask = useCreateTask();

  const defaultProject = useMemo(() => {
    const blis = projects.find((p: any) => p.name.toLowerCase().includes("blis"));
    return (blis ?? projects[0])?.id;
  }, [projects]);

  function submit() {
    if (!val.trim() || !defaultProject) return;
    createTask.mutate({ project_id: defaultProject, title: val.trim(), status: status as any, priority: 2, due_date: selectedDate });
    setVal("");
    setFocused(false);
  }

  return (
    <div style={{
      margin: "4px 0 8px",
      borderRadius: 8,
      border: `1px dashed ${focused ? columnAccent : "var(--hq-border)"}`,
      background: focused ? "var(--hq-bg-elevated)" : "transparent",
      transition: "all 120ms",
      overflow: "hidden",
    }}>
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { if (!val.trim()) setFocused(false); }}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setVal(""); setFocused(false); } }}
        placeholder="+ Adicionar tarefa"
        style={{
          width: "100%", border: "none", background: "transparent",
          padding: "7px 10px", fontSize: 12.5,
          color: "var(--hq-text)", outline: "none", boxSizing: "border-box",
        }}
      />
      {focused && val.trim() && (
        <div style={{ fontSize: 10, color: "var(--hq-text-muted)", padding: "0 10px 5px" }}>
          ↵ criar · Esc cancelar
        </div>
      )}
    </div>
  );
}

// ── KanbanCard ────────────────────────────────────────────────────────────────

function KanbanCard({
  task,
  onMove,
  onOpenDetail,
  onDragStart,
  onDragEnd,
  isDragging,
  isMobile: isMobileProp,
}: {
  task: Task;
  onMove: (status: Task["status"]) => void;
  onOpenDetail?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  isMobile?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [cardHovered, setCardHovered] = useState(false);

  const longPressHandlers = useLongPress({
    threshold: 450,
    onLongPress: () => { if (onOpenDetail) onOpenDetail(); },
  });
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
      draggable={!isMobileProp}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", task.id);
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
      {...(isMobileProp && onOpenDetail ? longPressHandlers : {})}
      style={{
        position: "relative",
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
      {/* Quick complete button */}
      <button
        onClick={(e) => { e.stopPropagation(); haptics.success(); onMove(task.status === "done" ? "todo" : "done"); }}
        style={{
          position: "absolute", top: 8, right: 8,
          width: 20, height: 20, borderRadius: "50%",
          border: `1.5px solid ${task.status === "done" ? "var(--hq-success)" : "var(--hq-border)"}`,
          background: task.status === "done" ? "var(--hq-success)" : "transparent",
          cursor: "pointer", padding: 0,
          display: "grid", placeItems: "center",
          opacity: cardHovered || task.status === "done" ? 1 : 0,
          transition: "opacity 120ms",
          zIndex: 2,
        }}
      >
        {task.status === "done" && <Check size={11} color="#fff" strokeWidth={3} />}
      </button>

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
          {onOpenDetail && cardHovered && (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenDetail(); }}
              title="Abrir detalhes"
              style={{
                background: "var(--hq-inlay-bg)", border: `1px solid var(--hq-border)`,
                borderRadius: 4, color: colors.textSecondary, cursor: "pointer",
                padding: "1px 4px", display: "inline-flex", alignItems: "center",
                flexShrink: 0,
              }}
            >
              <ArrowRight size={10} />
            </button>
          )}
          <span style={{ flex: 1 }} />
          <span style={{ width: 24 }} />{/* space for quick-complete button */}
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
          {tags.slice(0, 2).map((t) => {
            const tc = tagColor(t.tag);
            return (
              <span key={t.id} style={{
                fontSize: 9, padding: "1px 5px", borderRadius: "99px",
                background: `${tc}22`, color: tc,
              }}>{t.tag}</span>
            );
          })}
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
                {tags.map((t) => {
                  const tc = tagColor(t.tag);
                  return (
                    <span key={t.id} style={{
                      fontSize: 11, padding: "3px 8px", borderRadius: "99px",
                      background: `${tc}22`,
                      border: `1px solid ${tc}40`,
                      color: tc,
                      display: "flex", alignItems: "center", gap: 4,
                    }}>
                      <Tag size={8} />{t.tag}
                    </span>
                  );
                })}
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
  onCardDragStart, onCardDragEnd, selectedDate, onOpenDetail,
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
  selectedDate: string;
  onOpenDetail?: (id: string) => void;
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
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px 4px" }}>
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
            onOpenDetail={onOpenDetail ? () => onOpenDetail(t.id) : undefined}
            isDragging={draggedTaskId === t.id}
            onDragStart={() => onCardDragStart(t.id)}
            onDragEnd={onCardDragEnd}
          />
        ))}

        {/* Inline add at bottom of column */}
        <InlineAdd status={config.status} columnAccent={config.accent} selectedDate={selectedDate} />
      </div>
    </div>
  );
}

// ── HomeView ──────────────────────────────────────────────────────────────────

export function HomeView() {
  const { date: searchDate } = Route.useSearch();
  const { data: projects = [] } = useProjects();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (searchDate) {
      const d = new Date(searchDate + "T12:00:00");
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [sortByPriority, setSortByPriority] = useState(false);
  const [mobileColumn, setMobileColumn] = useState<Task["status"]>("todo");
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarView, setCalendarView] = useState<"day" | "week">("day");
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Task["status"] | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const setStatus = useSetTaskStatus();
  const deleteTask = useDeleteTask();
  const qc = useQueryClient();

  const { width: agendaWidth, startResize, resetWidth } = useResizable({
    min: 280, max: 700, defaultValue: 340, storageKey: "hq-agenda-width",
  });

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
  const progressValue = totalCount > 0 ? doneCount / totalCount : 0;

  function handleMove(id: string, status: Task["status"]) {
    const task = allTasks.find((t) => t.id === id);
    if (!task) return;
    const previousStatus = task.status;
    setStatus.mutate(
      { id, status, projectId: task.project_id },
      {
        onSuccess: () => {
          const labels: Record<Task["status"], string> = { todo: "A Fazer", doing: "Fazendo", done: "Concluído" };
          showUndoToast({
            title: `Movida para ${labels[status]}`,
            description: task.title.length > 45 ? task.title.slice(0, 45) + "…" : task.title,
            iconBg: status === "done" ? "rgba(48,209,88,0.4)" : "rgba(229,132,48,0.4)",
            undo: () => setStatus.mutate({ id, status: previousStatus, projectId: task.project_id }),
          });
        },
        onError: () => toast.error("Erro ao mover tarefa"),
      }
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

  // Calendar panel (shared between mobile and desktop)
  const calendarPanel = (
    <div style={{
      width: isMobile ? "100%" : calendarExpanded ? "100%" : agendaWidth,
      flexShrink: 0,
      borderLeft: isMobile ? "none" : `1px solid ${colors.separator}`,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      height: "100%",
    }}>
      {/* Calendar panel header */}
      <div style={{
        padding: "10px 14px",
        borderBottom: `1px solid ${colors.separator}`,
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
      }}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em" }}>Agenda</span>

        {/* Day / Week segmented toggle */}
        <div style={{
          display: "flex",
          background: colors.surface,
          borderRadius: radius.sm,
          padding: 2,
          border: `1px solid ${colors.separator}`,
          gap: 0,
        }}>
          {(["day", "week"] as const).map((v) => {
            const active = calendarView === v;
            return (
              <button
                key={v}
                onClick={() => setCalendarView(v)}
                style={{
                  padding: "3px 10px",
                  borderRadius: 5,
                  border: "none",
                  background: active ? colors.accentBg : "transparent",
                  color: active ? colors.accent : colors.textMuted,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: active ? 700 : 400,
                  transition: `all 0.15s ${spring.gentle}`,
                }}
              >
                {v === "day" ? "Dia" : "Semana"}
              </button>
            );
          })}
        </div>

        {/* Expand/collapse button — desktop only */}
        {!isMobile && (
          <button
            onClick={() => setCalendarExpanded((v) => !v)}
            title={calendarExpanded ? "Minimizar" : "Expandir"}
            style={{
              background: "transparent",
              border: "none",
              color: colors.textMuted,
              cursor: "pointer",
              padding: 4,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              transition: `color 0.15s ${spring.gentle}`,
            }}
          >
            {calendarExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        )}
      </div>

      {/* Calendar content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
        {calendarView === "day"
          ? <DayCalendar isoDate={selectedIso} isToday={isToday} />
          : <WeekCalendarInline referenceDate={selectedDate} />
        }
      </div>
    </div>
  );

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
          <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}>
            {!isMobile && totalCount > 0 && (
              <ProgressRing value={progressValue} size={48} />
            )}
            <div>
              <h1 style={{
                fontSize: isMobile ? 20 : 22,
                fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 1,
              }}>
                {isToday ? greeting() : "Meu dia"}
              </h1>
              <p style={{ color: colors.textSecondary, fontSize: 11, margin: 0 }}>
                {isLoading ? "Carregando..." :
                  totalCount === 0 ? "Nenhuma tarefa neste dia" :
                  `${doneCount}/${totalCount} concluída${doneCount !== 1 ? "s" : ""}`
                }
              </p>
            </div>
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
              <Calendar size={12} />
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
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {calendarPanel}
          </div>
        ) : (
          <PullToRefresh onRefresh={() => qc.invalidateQueries({ queryKey: ["tasks"] })}>
            <div style={{ padding: "12px 12px 80px" }}>
              {isLoading ? (
                <>
                  {Array.from({ length: 4 }, (_, i) => <TaskCardSkeleton key={i} />)}
                </>
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
                        <SwipeableCard
                          key={t.id}
                          onSwipeRight={() => handleMove(t.id, "done")}
                          onSwipeLeft={() => {
                            deleteTask.mutate(
                              { id: t.id, projectId: t.project_id },
                              {
                                onSuccess: () => showUndoToast({
                                  title: "Tarefa deletada",
                                  description: t.title.length > 45 ? t.title.slice(0, 45) + "…" : t.title,
                                  iconBg: "rgba(255,69,58,0.4)",
                                  undo: () => {},
                                }),
                              }
                            );
                          }}
                        >
                          <KanbanCard task={t} onMove={(status) => handleMove(t.id, status)} onOpenDetail={() => setDetailTaskId(t.id)} isMobile={isMobile} />
                        </SwipeableCard>
                      ))}
                    </>
                  );
                })()
              )}
            </div>
          </PullToRefresh>
        )
      ) : (
        /* ── DESKTOP: kanban + calendar panel side by side ── */
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
          {/* Kanban side — hidden when calendar is expanded */}
          {!calendarExpanded && (
            <div style={{
              flex: 1,
              display: "flex",
              gap: 10,
              padding: "14px 14px 14px",
              overflow: "hidden",
              minWidth: 0,
            }}>
              {isLoading ? (
                Array.from({ length: 3 }, (_, i) => (
                  <div key={i} style={{
                    flex: 1, background: colors.surface, borderRadius: radius.lg,
                    border: `1px solid ${colors.border}`,
                    padding: "10px 8px",
                  }}>
                    {Array.from({ length: 3 }, (_, j) => <TaskCardSkeleton key={j} />)}
                  </div>
                ))
              ) : (
                columns.map((col) => (
                  <KanbanColumn
                    key={col.status}
                    config={col}
                    tasks={col.tasks}
                    onMove={handleMove}
                    onOpenDetail={(id) => setDetailTaskId(id)}
                    draggedTaskId={draggedTaskId}
                    isDragOver={dragOverColumn === col.status}
                    onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col.status); }}
                    onDrop={(e) => { e.preventDefault(); handleDrop(col.status); }}
                    onDragLeave={() => setDragOverColumn(null)}
                    onCardDragStart={(id) => setDraggedTaskId(id)}
                    onCardDragEnd={() => { setDraggedTaskId(null); setDragOverColumn(null); }}
                    selectedDate={selectedIso}
                  />
                ))
              )}
            </div>
          )}

          {/* Resize handle — between kanban and calendar, desktop only, not expanded */}
          {!calendarExpanded && (
            <div
              onMouseDown={startResize}
              onDoubleClick={resetWidth}
              title="Arraste · 2× pra resetar"
              style={{ width: 7, flexShrink: 0, cursor: "col-resize", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent" }}
            >
              <div style={{ width: 3, height: 36, borderRadius: 2, background: "rgba(120,120,128,0.20)" }} />
            </div>
          )}

          {/* Calendar panel — desktop always visible */}
          {calendarPanel}
        </div>
      )}

      {/* Task detail panel (slide-over) */}
      {detailTaskId && (() => {
        const detailTask = allTasks.find((t) => t.id === detailTaskId);
        if (!detailTask) return null;
        return (
          <TaskDetailPanel
            task={detailTask}
            onClose={() => setDetailTaskId(null)}
          />
        );
      })()}
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
