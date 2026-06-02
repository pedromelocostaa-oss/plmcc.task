import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useStats, useProjects } from "@/lib/queries";
import { colors } from "@/lib/tokens";

export function DashboardView() {
  const { data: stats, isLoading } = useStats();
  const { data: projects = [] } = useProjects();
  const [period, setPeriod] = useState<"weeks" | "months">("weeks");
  const [projFilter, setProjFilter] = useState<string>("all");

  if (isLoading || !stats) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{ height: 32, width: 160, background: colors.surface, borderRadius: 6, marginBottom: 24 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 80, background: colors.surface, borderRadius: 10 }} />
          ))}
        </div>
        <div style={{ height: 220, background: colors.surface, borderRadius: 10 }} />
      </div>
    );
  }

  const chartData = period === "weeks" ? stats.byWeek.map((w) => ({ label: w.week, Criadas: w.created, Concluídas: w.done })) : stats.byMonth.map((m) => ({ label: m.month, Criadas: m.created, Concluídas: m.done }));

  const filteredByProject = projFilter === "all"
    ? stats.byProject
    : stats.byProject.filter((p) => p.id === projFilter);

  return (
    <div style={{ padding: 32, minHeight: "100%" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Dashboard</h1>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatCard label="Projetos ativos" value={String(stats.totalActiveProjects)} color={colors.accent} />
        <StatCard label="Tarefas pendentes" value={String(stats.totalOpenTasks)} color={colors.info} />
        <StatCard label="Concluídas" value={String(stats.totalDoneTasks)} color={colors.success} />
        <StatCard label="Atrasadas" value={String(stats.totalOverdueTasks)} color={colors.danger} />
      </div>

      {/* Activity chart */}
      <div style={{
        background: colors.surface, border: `1px solid ${colors.border}`,
        borderRadius: 10, padding: 20, marginBottom: 24,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Atividade</div>
          <div style={{ display: "flex", gap: 4 }}>
            {(["weeks", "months"] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                background: period === p ? colors.accentBg : "transparent",
                color: period === p ? colors.accent : colors.textSecondary,
                border: `1px solid ${period === p ? colors.accent : colors.border}`,
                padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                fontSize: 11, fontFamily: "JetBrains Mono, monospace",
              }}>{p === "weeks" ? "Semanas" : "Meses"}</button>
            ))}
          </div>
        </div>
        <div style={{ height: 200 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid stroke={colors.borderLight} vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: colors.textMuted, fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: colors.textMuted, fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: colors.surface, border: `1px solid ${colors.border}`,
                  borderRadius: 8, color: colors.text, fontSize: 12,
                }}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Bar dataKey="Criadas" fill={colors.borderLight} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Concluídas" fill={colors.success} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Project breakdown */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: colors.textMuted }}>
          PROGRESSO POR PROJETO
        </div>
        <select
          value={projFilter}
          onChange={(e) => setProjFilter(e.target.value)}
          style={{
            background: colors.surface, border: `1px solid ${colors.border}`,
            color: colors.text, padding: "5px 8px", borderRadius: 6, fontSize: 12,
          }}
        >
          <option value="all">Todos os projetos</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {filteredByProject.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: colors.textMuted }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Crie tarefas para ver estatísticas</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredByProject.map((p) => (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
              background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: p.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.name}
              </span>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: colors.textSecondary }}>
                {p.done}/{p.total}
              </span>
              <span style={{
                fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700,
                color: p.pct === 100 ? colors.success : colors.textSecondary, minWidth: 36, textAlign: "right",
              }}>
                {p.pct}%
              </span>
              <div style={{ width: 100, height: 4, background: colors.borderLight, borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  background: p.pct === 100 ? colors.success : p.color,
                  width: `${p.pct}%`,
                  transition: "width 0.4s",
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: colors.surface, border: `1px solid ${colors.border}`,
      borderRadius: 10, padding: "14px 16px",
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: colors.textSecondary }}>{label}</div>
    </div>
  );
}
