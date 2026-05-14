import { useProjects, useTasks } from "@/lib/queries";
import { formatDue, isOverdue } from "@/lib/format";
import { PROJECT_COLORS } from "@/lib/types";
import type { View } from "./Sidebar";

export function HomeView({ setView }: { setView: (v: View) => void }) {
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const active = projects.filter((p) => !p.archived);
  const open = tasks.filter((t) => t.status !== "done" && active.some((p) => p.id === t.project_id));
  const done = tasks.filter((t) => t.status === "done");
  const overdue = open.filter((t) => isOverdue(t.due_date, t.status));

  const upcoming = [...open]
    .sort((a, b) => a.priority - b.priority || ((a.due_date || "9") < (b.due_date || "9") ? -1 : 1))
    .slice(0, 6);

  if (projects.length === 0) {
    return (
      <Empty icon="🚀" title="Bem-vindo ao Pedro's HQ"
        sub="Crie seu primeiro projeto na barra lateral para começar." />
    );
  }

  return (
    <div style={{ padding: 32, height: "100%", overflowY: "auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Início</h1>
      <p style={{ color: "#8b949e", marginBottom: 24, fontSize: 13 }}>Visão geral do seu workspace</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        <Stat label="Projetos ativos" value={active.length} color="#f97316" />
        <Stat label="Tarefas abertas" value={open.length} color="#3b82f6" />
        <Stat label="Concluídas" value={done.length} color="#3fb950" />
        <Stat label="Atrasadas" value={overdue.length} color="#ef4444" />
      </div>

      <div style={{ fontFamily: "DM Mono", fontSize: 11, color: "#6e7681", letterSpacing: 1, marginBottom: 10 }}>PRÓXIMAS</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {upcoming.length === 0 && <div style={{ color: "#6e7681", fontSize: 13 }}>Nada pendente. </div>}
        {upcoming.map((t) => {
          const p = projects.find((x) => x.id === t.project_id);
          const due = formatDue(t.due_date, t.status);
          return (
            <button key={t.id} onClick={() => p && setView({ kind: "project", id: p.id })} style={{
              background: "#161b22", border: "1px solid #30363d", borderRadius: 8,
              padding: "10px 14px", display: "flex", alignItems: "center", gap: 12,
              cursor: "pointer", color: "#e6edf3", textAlign: "left",
            }}>
              <span style={{
                fontFamily: "DM Mono", fontSize: 10, padding: "1px 6px", borderRadius: 4,
                background: t.priority === 1 ? "rgba(239,68,68,0.13)" : t.priority === 2 ? "rgba(249,115,22,0.13)" : "rgba(59,130,246,0.13)",
                color: t.priority === 1 ? "#ef4444" : t.priority === 2 ? "#f97316" : "#3b82f6",
              }}>P{t.priority}</span>
              <span style={{ flex: 1, fontSize: 13 }}>{t.title}</span>
              {due.label && <span style={{ fontSize: 11, color: due.color, fontFamily: "DM Mono" }}>{due.label}</span>}
              {p && (
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#8b949e",
                  padding: "2px 8px", background: "#21262d", borderRadius: 10 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: PROJECT_COLORS[p.color] || p.color }} />
                  {p.name}
                </span>
              )}
            </button>
          );
        })}
      </div>
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

function Empty({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <div style={{ fontSize: 48 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>{title}</div>
      <div style={{ color: "#8b949e", fontSize: 13 }}>{sub}</div>
    </div>
  );
}
