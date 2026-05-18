import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, CalendarDays, ExternalLink, MapPin } from "lucide-react";
import { fetchCalendarEvents } from "@/lib/calendar-ics.server";
import type { CalendarEvent } from "@/lib/calendar-ics.server";
import { colors, spring, radius } from "@/lib/tokens";

// ── constants ─────────────────────────────────────────────────────────────────

const HOUR_PX = 64;           // height of one hour in px
const TOTAL_PX = 24 * HOUR_PX;
const LABEL_W = 44;           // width of the hour label column
const START_HOUR = 0;         // show from hour 0

// ── helpers ───────────────────────────────────────────────────────────────────

function minutesOfDay(isoString: string): number {
  const d = new Date(isoString);
  const sp = new Date(d.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return sp.getHours() * 60 + sp.getMinutes();
}

function nowMinutes(): number {
  return minutesOfDay(new Date().toISOString());
}

function fmtTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function minutesToPx(min: number): number {
  return (min / (24 * 60)) * TOTAL_PX;
}

// ── overlap layout ────────────────────────────────────────────────────────────

interface LayoutEvent extends CalendarEvent {
  col: number;
  cols: number;
}

function layoutEvents(events: CalendarEvent[]): LayoutEvent[] {
  const timed = events.filter((e) => !e.isAllDay);
  const result: LayoutEvent[] = [];
  const groups: CalendarEvent[][] = [];

  for (const ev of timed) {
    const startMin = minutesOfDay(ev.start);
    const endMin = minutesOfDay(ev.end);
    let placed = false;

    for (const group of groups) {
      const lastEnd = Math.max(...group.map((g) => minutesOfDay(g.end)));
      if (startMin < lastEnd) {
        group.push(ev);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([ev]);

    void startMin; void endMin;
  }

  for (const group of groups) {
    const cols = group.length;
    group.forEach((ev, i) => {
      result.push({ ...ev, col: i, cols });
    });
  }

  return result;
}

// ── event card ────────────────────────────────────────────────────────────────

const EVENT_COLORS = [
  { bg: "rgba(255,107,0,0.18)", border: "#FF6B00", text: "#FF6B00" },
  { bg: "rgba(10,132,255,0.18)", border: "#0A84FF", text: "#0A84FF" },
  { bg: "rgba(48,209,88,0.18)", border: "#30D158", text: "#30D158" },
  { bg: "rgba(191,90,242,0.18)", border: "#BF5AF2", text: "#BF5AF2" },
  { bg: "rgba(255,159,10,0.18)", border: "#FF9F0A", text: "#FF9F0A" },
];

function EventCard({ ev, idx }: { ev: LayoutEvent; idx: number }) {
  const startMin = minutesOfDay(ev.start);
  const endMin = minutesOfDay(ev.end);
  const top = minutesToPx(startMin);
  const height = Math.max(minutesToPx(Math.max(endMin - startMin, 15)), 22);

  const colW = `calc((100% - ${LABEL_W + 8}px) / ${ev.cols})`;
  const left = `calc(${LABEL_W + 8}px + ${ev.col} * ${colW})`;
  const c = EVENT_COLORS[idx % EVENT_COLORS.length];
  const compact = height < 40;

  return (
    <a
      href={ev.url}
      target="_blank"
      rel="noopener noreferrer"
      title={ev.title}
      style={{
        position: "absolute",
        top: top + 1,
        left,
        width: colW,
        height: height - 2,
        background: c.bg,
        border: `1px solid ${c.border}40`,
        borderLeft: `3px solid ${c.border}`,
        borderRadius: radius.sm,
        padding: compact ? "2px 6px" : "4px 8px",
        overflow: "hidden",
        textDecoration: "none",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        cursor: "pointer",
        transition: `filter 0.15s ${spring.gentle}`,
        boxSizing: "border-box",
        zIndex: 2,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.filter = "brightness(1.2)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = ""; }}
    >
      <div style={{
        fontSize: compact ? 11 : 12,
        fontWeight: 600,
        color: colors.text,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        lineHeight: 1.3,
      }}>
        {ev.title}
      </div>
      {!compact && (
        <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 1, whiteSpace: "nowrap" }}>
          {fmtTime(ev.start)} – {fmtTime(ev.end)}
          {ev.location && (
            <span style={{ marginLeft: 6, display: "inline-flex", alignItems: "center", gap: 2 }}>
              <MapPin size={9} /> {ev.location}
            </span>
          )}
        </div>
      )}
      <ExternalLink
        size={9}
        style={{
          position: "absolute", top: 4, right: 5,
          color: c.text, opacity: 0.6,
        }}
      />
    </a>
  );
}

// ── main component ────────────────────────────────────────────────────────────

interface DayCalendarProps {
  isoDate: string;   // "2026-05-17"
  isToday: boolean;
}

export function DayCalendar({ isoDate, isToday }: DayCalendarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentMin, setCurrentMin] = useState(nowMinutes);

  // Update current time every minute
  useEffect(() => {
    const id = setInterval(() => setCurrentMin(nowMinutes()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Scroll to current time (today) or first event (other days)
  const { data: events = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["calendar-events", isoDate],
    queryFn: () => fetchCalendarEvents({ date: isoDate }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isLoading) return;

    let scrollTo = 0;
    if (isToday) {
      scrollTo = Math.max(minutesToPx(currentMin) - 120, 0);
    } else if (events.length > 0) {
      const firstMin = minutesOfDay(events[0].start);
      scrollTo = Math.max(minutesToPx(firstMin) - 80, 0);
    } else {
      scrollTo = HOUR_PX * 8; // default to 8am
    }
    el.scrollTop = scrollTo;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isoDate]);

  const allDay = events.filter((e) => e.isAllDay);
  const timed = layoutEvents(events);
  const currentPx = minutesToPx(currentMin);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "rgba(28,28,30,0.6)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: `1px solid ${colors.separator}`,
      borderRadius: radius.lg,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: `1px solid ${colors.separator}`,
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
      }}>
        <CalendarDays size={15} color={colors.accent} />
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>
          Agenda
        </span>
        {events.length > 0 && (
          <span style={{
            fontSize: 11,
            padding: "2px 8px",
            background: colors.accentBg,
            color: colors.accent,
            borderRadius: radius.full,
            fontWeight: 500,
          }}>
            {events.length} {events.length === 1 ? "evento" : "eventos"}
          </span>
        )}
        <button
          onClick={() => refetch()}
          disabled={isFetching}
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
          title="Atualizar"
        >
          <RefreshCw size={13} style={{ animation: isFetching ? "spin 1s linear infinite" : "none" }} />
        </button>
      </div>

      {/* All-day events */}
      {allDay.length > 0 && (
        <div style={{
          padding: "6px 8px 6px 12px",
          borderBottom: `1px solid ${colors.separator}`,
          display: "flex",
          flexDirection: "column",
          gap: 3,
          flexShrink: 0,
        }}>
          {allDay.map((ev) => (
            <a
              key={ev.id}
              href={ev.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                padding: "3px 8px",
                background: colors.accentBg,
                border: `1px solid ${colors.accentBorder}`,
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                color: colors.accent,
                textDecoration: "none",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {ev.title}
            </a>
          ))}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: colors.textMuted, fontSize: 13 }}>
          <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
          Carregando...
        </div>
      )}

      {/* Time grid */}
      {!isLoading && (
        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: "auto", position: "relative" }}
        >
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

          {/* Empty state */}
          {events.length === 0 && (
            <div style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              color: colors.textMuted,
              fontSize: 13,
              pointerEvents: "none",
            }}>
              <CalendarDays size={28} strokeWidth={1.2} />
              <span>Sem eventos neste dia</span>
            </div>
          )}

          {/* Grid */}
          <div style={{ position: "relative", height: TOTAL_PX, marginTop: 4, marginBottom: 16 }}>

            {/* Hour rows */}
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                style={{
                  position: "absolute",
                  top: h * HOUR_PX,
                  left: 0,
                  right: 0,
                  height: HOUR_PX,
                  display: "flex",
                  alignItems: "flex-start",
                  pointerEvents: "none",
                }}
              >
                <span style={{
                  width: LABEL_W,
                  fontSize: 10,
                  color: h === START_HOUR ? "transparent" : colors.textMuted,
                  textAlign: "right",
                  paddingRight: 8,
                  paddingTop: 0,
                  userSelect: "none",
                  lineHeight: "1",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 400,
                  flexShrink: 0,
                }}>
                  {String(h).padStart(2, "0")}:00
                </span>
                <div style={{
                  flex: 1,
                  borderTop: h === 0 ? "none" : `1px solid rgba(84,84,88,0.25)`,
                  height: "100%",
                }} />
              </div>
            ))}

            {/* Half-hour faint lines */}
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={`h-${h}`}
                style={{
                  position: "absolute",
                  top: h * HOUR_PX + HOUR_PX / 2,
                  left: LABEL_W + 8,
                  right: 0,
                  borderTop: `1px solid rgba(84,84,88,0.10)`,
                  pointerEvents: "none",
                }}
              />
            ))}

            {/* Current time indicator */}
            {isToday && (
              <div
                style={{
                  position: "absolute",
                  top: currentPx,
                  left: LABEL_W - 4,
                  right: 0,
                  zIndex: 10,
                  display: "flex",
                  alignItems: "center",
                  pointerEvents: "none",
                }}
              >
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: colors.danger,
                  flexShrink: 0,
                  boxShadow: `0 0 6px ${colors.danger}`,
                }} />
                <div style={{
                  flex: 1,
                  height: 2,
                  background: colors.danger,
                  boxShadow: `0 0 4px ${colors.danger}80`,
                }} />
              </div>
            )}

            {/* Timed events */}
            {timed.map((ev, i) => (
              <EventCard key={ev.id} ev={ev} idx={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
