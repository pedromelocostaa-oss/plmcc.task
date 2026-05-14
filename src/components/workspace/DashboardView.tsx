import { useMemo, useState } from "react";
import { useProjects, useTasks } from "@/lib/queries";
import { isOverdue } from "@/lib/format";
import { PROJECT_COLORS } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

export function DashboardView() {
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const active = projects.filter((p) => !p.archived);
  const [filter, setFilter] = useState<string>("all");
  const [period, setPeriod] = useState<"weeks" | "months">("weeks");

  const filtered = useMemo(() =>
    filter === "all" ? tasks : tasks.filter((t) => t.project_id === filter), [tasks, filter]);
  const open = filtered.filter((t) => t.status !== "done");
  const done = filtered.filter((t) => t.status === "done");
  const overdue = open.filter((t) => isOverdue(t.due_date, t.status));

  const chartData = useMemo(() => {
    const buckets: { label: string; start: Date; end: Date }[] = [];
    const now = new Date();
    if (period === "weeks") {
      for (let i = 7; i >= 0; i--) {
        const end = new Date(now); end.setHours(23, 59, 59, 999); end.setDate(end.getDate() - i * 7);
        const start = new Date(end); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
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
      Criadas: filtered.filter((t) => { const d = new Date(t.created_at); return d >= b.start && d <= b.end; }).length,
      Concluídas: filtered.filter((t) => t.completed_at && new Date(t.completed_at) >= b.start && new Date(t.completed_at) <= b.end).length,
    }));
  }, [filtered, period]);

  return (
    <div style={{ padding: 32, height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Dashboard</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{
          background: "#161b22", border: "1px solid #30363d", color: "#e6edf3",
          padding: "6px 10px", borderRadius: 6, fontSize: 12,
        }}>
          <option value="all">Todos os projetos</option>
          {active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <Stat label="Total" value={filtered.length} color="#e6edf3" />
        <Stat label="Pendentes" value={open.length} color="#3b82f6" />
        <Stat label="Concluídas" value={done.length} color="#3fb950" />
        <Stat label="Atrasadas" value={overdue.length} color="#ef4444" />
      </div>

      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Atividade</div>
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
        <div style={{ height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid stroke="#21262d" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#6e7681", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6e7681", fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", fontSize: 12 }}
                cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#8b949e" }} />
              <Bar dataKey="Criadas" fill="#30363d" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Concluídas" fill="#3fb950" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {filter === "all" && (
        <>
          <div style={{ fontFamily: "DM Mono", fontSize: 11, color: "#6e7681", marginBottom: 10 }}>POR PROJETO</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {active.filter((p) => tasks.some((t) => t.project_id === p.id)).map((p) => {
              const pt = tasks.filter((t) => t.project_id === p.id);
              const pd = pt.filter((t) => t.status === "done").length;
              const pct = Math.round((pd / pt.length) * 100);
              const color = PROJECT_COLORS[p.color] || p.color;
              const bar = pct === 100 ? "#3fb950" : color;
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                  background: "#161b22", border: "1px solid #30363d", borderRadius: 8 }}>
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
        </>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "#8b949e", marginTop: 4 }}>{label}</div>
    </div>
  );
}
