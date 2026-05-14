import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, AreaChart, Area,
} from "recharts";
import { useProjects, useTasks } from "@/lib/queries";
import { isOverdue } from "@/lib/format";
import { PROJECT_COLORS } from "@/lib/types";

// ── date helpers ─────────────────────────────────────────────────────────────

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function mondayOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function firstOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function lastOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function daysBetween(start: Date, end: Date): number {
  return Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000) + 1;
}

function fmtShort(isoDate: string): string {
  const [, m, d] = isoDate.split("-");
  return `${d}/${m}`;
}

// ── types ─────────────────────────────────────────────────────────────────────

type Preset = "today" | "week" | "month" | "custom";

interface DateRange {
  start: Date;
  end: Date;
}

// ── main component ────────────────────────────────────────────────────────────

export function DashboardView() {
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const active = projects.filter((p) => !p.archived);

  // ── date range state ──────────────────────────────────────────────────────
  const [preset, setPreset] = useState<Preset>("week");
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return toIso(d);
  });
  const [customEnd, setCustomEnd] = useState<string>(() => toIso(new Date()));

  const range = useMemo<DateRange>(() => {
    const now = new Date();
    switch (preset) {
      case "today":
        return { start: startOfDay(now), end: startOfDay(now) };
      case "week": {
        const mon = mondayOfWeek(now);
        return { start: mon, end: addDays(mon, 6) };
      }
      case "month":
        return { start: firstOfMonth(now), end: lastOfMonth(now) };
      case "custom":
        return {
          start: new Date(customStart + "T00:00:00"),
          end: new Date(customEnd + "T00:00:00"),
        };
    }
  }, [preset, customStart, customEnd]);

  const rangeLabel = useMemo(() => {
    const s = fmtShort(toIso(range.start));
    const e = fmtShort(toIso(range.end));
    return s === e ? s : `${s} → ${e}`;
  }, [range]);

  // ── task filtering ────────────────────────────────────────────────────────
  const completedInPeriod = useMemo(() =>
    tasks.filter((t) => {
      if (t.status !== "done" || !t.completed_at) return false;
      const d = startOfDay(new Date(t.completed_at));
      return d >= startOfDay(range.start) && d <= startOfDay(range.end);
    }),
    [tasks, range],
  );

  const totalWithDueInPeriod = useMemo(() =>
    tasks.filter((t) => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date + "T00:00:00");
      return d >= startOfDay(range.start) && d <= startOfDay(range.end);
    }),
    [tasks, range],
  );

  // ── stats cards ───────────────────────────────────────────────────────────
  const totalCompleted = completedInPeriod.length;
  const completionRate = totalWithDueInPeriod.length > 0
    ? Math.round((totalCompleted / totalWithDueInPeriod.length) * 100)
    : 0;

  const days = Math.max(1, daysBetween(range.start, range.end));
  const dailyAvg = totalCompleted > 0 ? (totalCompleted / days).toFixed(1) : "0";

  const completedByProject = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of completedInPeriod) {
      map[t.project_id] = (map[t.project_id] ?? 0) + 1;
    }
    return map;
  }, [completedInPeriod]);

  const topProject = useMemo(() => {
    let best: { name: string; count: number } | null = null;
    for (const [pid, count] of Object.entries(completedByProject)) {
      if (!best || count > best.count) {
        const p = projects.find((x) => x.id === pid);
        if (p) best = { name: p.name, count };
      }
    }
    return best;
  }, [completedByProject, projects]);

  // ── bar chart data (by project) ───────────────────────────────────────────
  const projectChartData = useMemo(() =>
    active
      .map((p) => ({
        name: p.name,
        count: completedByProject[p.id] ?? 0,
        color: PROJECT_COLORS[p.color] || p.color,
      }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count),
    [active, completedByProject],
  );

  // ── area chart data (daily) ───────────────────────────────────────────────
  const dailyChartData = useMemo(() => {
    const result: { date: string; label: string; count: number }[] = [];
    const d = new Date(range.start);
    const endIso = toIso(range.end);
    while (toIso(d) <= endIso) {
      const iso = toIso(d);
      const count = completedInPeriod.filter(
        (t) => t.completed_at && t.completed_at.slice(0, 10) === iso,
      ).length;
      result.push({ date: iso, label: fmtShort(iso), count });
      d.setDate(d.getDate() + 1);
    }
    return result;
  }, [completedInPeriod, range]);

  // ── existing activity chart (created vs completed) ────────────────────────
  const [period, setPeriod] = useState<"weeks" | "months">("weeks");
  const activityData = useMemo(() => {
    const buckets: { label: string; start: Date; end: Date }[] = [];
    const now = new Date();
    if (period === "weeks") {
      for (let i = 7; i >= 0; i--) {
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        end.setDate(end.getDate() - i * 7);
        const start = new Date(end);
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        buckets.push({ label: `${start.getDate()}/${start.getMonth() + 1}`, start, end });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        buckets.push({ label: start.toLocaleString("pt-BR", { month: "short" }), start, end });
      }
    }
    return buckets.map((b) => ({
      label: b.label,
      Criadas: tasks.filter((t) => { const d = new Date(t.created_at); return d >= b.start && d <= b.end; }).length,
      Concluídas: tasks.filter((t) => t.completed_at && new Date(t.completed_at) >= b.start && new Date(t.completed_at) <= b.end).length,
    }));
  }, [tasks, period]);

  // ── existing per-project stats ────────────────────────────────────────────
  const [projFilter, setProjFilter] = useState<string>("all");
  const filtered = useMemo(() =>
    projFilter === "all" ? tasks : tasks.filter((t) => t.project_id === projFilter),
    [tasks, projFilter],
  );
  const open = filtered.filter((t) => t.status !== "done");
  const done = filtered.filter((t) => t.status === "done");
  const overdueCount = open.filter((t) => isOverdue(t.due_date, t.status)).length;

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 32, height: "100%", overflowY: "auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Dashboard</h1>

      {/* ── Date range filter ── */}
      <div style={{
        background: "#161b22", border: "1px solid #30363d", borderRadius: 10,
        padding: "14px 16px", marginBottom: 20,
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", gap: 4 }}>
          {(["today", "week", "month", "custom"] as Preset[]).map((p) => {
            const labels: Record<Preset, string> = {
              today: "Hoje", week: "Esta Semana", month: "Este Mês", custom: "Personalizado",
            };
            return (
              <button key={p} onClick={() => setPreset(p)} style={{
                background: preset === p ? "rgba(249,115,22,0.13)" : "transparent",
                color: preset === p ? "#f97316" : "#8b949e",
                border: "1px solid " + (preset === p ? "rgba(249,115,22,0.4)" : "#30363d"),
                padding: "5px 11px", borderRadius: 6, cursor: "pointer",
                fontSize: 12, fontFamily: "DM Mono",
              }}>{labels[p]}</button>
            );
          })}
        </div>
        {preset === "custom" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
              style={dateInputStyle} />
            <span style={{ color: "#6e7681", fontSize: 12 }}>→</span>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
              style={dateInputStyle} />
          </div>
        ) : (
          <span style={{ fontFamily: "DM Mono", fontSize: 11, color: "#6e7681" }}>{rangeLabel}</span>
        )}
      </div>

      {/* ── Productivity stats cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Concluídas" value={String(totalCompleted)} color="#3fb950" />
        <StatCard label="Taxa de conclusão" value={`${completionRate}%`} color="#f97316" />
        <StatCard
          label="Projeto + produtivo"
          value={topProject ? topProject.name : "—"}
          color="#a855f7"
          small={!!topProject}
        />
        <StatCard label="Média diária" value={`${dailyAvg}/dia`} color="#3b82f6" />
      </div>

      {/* ── Two charts side by side ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Horizontal bar chart by project */}
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Concluídas por projeto</div>
          {projectChartData.length === 0 ? (
            <div style={{ color: "#6e7681", fontSize: 12, padding: "20px 0" }}>
              Nenhuma tarefa concluída no período
            </div>
          ) : (
            <div style={{ height: Math.max(160, projectChartData.length * 44) }}>
              <ResponsiveContainer>
                <BarChart data={projectChartData} layout="vertical" margin={{ left: 4, right: 20 }}>
                  <CartesianGrid stroke="#21262d" horizontal={false} />
                  <XAxis type="number" axisLine={false} tickLine={false}
                    tick={{ fill: "#6e7681", fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false}
                    tick={{ fill: "#8b949e", fontSize: 11 }} width={90} />
                  <Tooltip
                    contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", fontSize: 12 }}
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  />
                  <Bar dataKey="count" name="Concluídas" radius={[0, 3, 3, 0]}>
                    {projectChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Daily area chart */}
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Evolução diária</div>
          <div style={{ height: Math.max(160, projectChartData.length * 44) }}>
            <ResponsiveContainer>
              <AreaChart data={dailyChartData} margin={{ left: -10, right: 8 }}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#21262d" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false}
                  tick={{ fill: "#6e7681", fontSize: 10 }}
                  interval={dailyChartData.length > 14 ? Math.floor(dailyChartData.length / 7) : 0}
                />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fill: "#6e7681", fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", fontSize: 12 }}
                  cursor={{ stroke: "rgba(249,115,22,0.3)" }}
                />
                <Area
                  type="monotone" dataKey="count" name="Concluídas"
                  stroke="#f97316" strokeWidth={2}
                  fill="url(#areaGradient)" dot={false} activeDot={{ r: 4, fill: "#f97316" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Activity chart (existing) ── */}
      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Atividade geral</div>
          <div style={{ display: "flex", gap: 4 }}>
            {(["weeks", "months"] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                background: period === p ? "rgba(249,115,22,0.13)" : "transparent",
                color: period === p ? "#f97316" : "#8b949e",
                border: "1px solid " + (period === p ? "#f97316" : "#30363d"),
                padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "DM Mono",
              }}>{p === "weeks" ? "semanas" : "meses"}</button>
            ))}
          </div>
        </div>
        <div style={{ height: 200 }}>
          <ResponsiveContainer>
            <BarChart data={activityData}>
              <CartesianGrid stroke="#21262d" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#6e7681", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6e7681", fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", fontSize: 12 }}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Bar dataKey="Criadas" fill="#30363d" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Concluídas" fill="#3fb950" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Per-project breakdown (existing) ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontFamily: "DM Mono", fontSize: 11, color: "#6e7681" }}>VISÃO GERAL POR PROJETO</div>
        <select value={projFilter} onChange={(e) => setProjFilter(e.target.value)} style={{
          background: "#161b22", border: "1px solid #30363d", color: "#e6edf3",
          padding: "5px 8px", borderRadius: 6, fontSize: 12,
        }}>
          <option value="all">Todos os projetos</option>
          {active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <MiniStat label="Total" value={filtered.length} color="#e6edf3" />
        <MiniStat label="Pendentes" value={open.length} color="#3b82f6" />
        <MiniStat label="Concluídas" value={done.length} color="#3fb950" />
        <MiniStat label="Atrasadas" value={overdueCount} color="#ef4444" />
      </div>
      {projFilter === "all" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {active.filter((p) => tasks.some((t) => t.project_id === p.id)).map((p) => {
            const pt = tasks.filter((t) => t.project_id === p.id);
            const pd = pt.filter((t) => t.status === "done").length;
            const pct = Math.round((pd / pt.length) * 100);
            const color = PROJECT_COLORS[p.color] || p.color;
            const bar = pct === 100 ? "#3fb950" : color;
            return (
              <div key={p.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                background: "#161b22", border: "1px solid #30363d", borderRadius: 8,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: color }} />
                <span style={{ flex: 1, fontSize: 13 }}>{p.name}</span>
                <span style={{ fontFamily: "DM Mono", fontSize: 11, color: "#8b949e" }}>{pd}/{pt.length}</span>
                <span style={{ fontFamily: "DM Mono", fontSize: 11, color: "#8b949e", minWidth: 36, textAlign: "right" }}>{pct}%</span>
                <div style={{ width: 100, height: 4, background: "#21262d", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: bar, width: `${pct}%`, transition: "width 0.4s" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, color, small }: {
  label: string; value: string; color: string; small?: boolean;
}) {
  return (
    <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: "14px 16px" }}>
      <div style={{
        fontSize: small ? 15 : 26, fontWeight: 700, color,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        marginBottom: 4,
      }}>{value}</div>
      <div style={{ fontSize: 11, color: "#8b949e" }}>{label}</div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "#8b949e", marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const dateInputStyle: React.CSSProperties = {
  background: "#0d1117", border: "1px solid #30363d", color: "#e6edf3",
  padding: "5px 8px", borderRadius: 6, fontSize: 12,
};
