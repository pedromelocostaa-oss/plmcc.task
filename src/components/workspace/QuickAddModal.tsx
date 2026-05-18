import { useState, useEffect } from "react";
import { X, CheckSquare, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { useProjects, useCreateTask, useCreateBookmark } from "@/lib/queries";
import { colors, spring, radius } from "@/lib/tokens";

interface Props { onClose: () => void; }

type Tab = "task" | "bookmark";

const PRIORITIES = [
  { value: 1, label: "P1", color: "#FF453A", bg: "rgba(255,69,58,0.14)", desc: "Urgente" },
  { value: 2, label: "P2", color: "#FF9F0A", bg: "rgba(255,159,10,0.14)", desc: "Normal" },
  { value: 3, label: "P3", color: "#0A84FF", bg: "rgba(10,132,255,0.14)", desc: "Baixa" },
];

function todayIso(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function QuickAddModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>("task");
  const { data: projects = [] } = useProjects();
  const createTask = useCreateTask();
  const createBookmark = useCreateBookmark();

  // Task form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskProject, setTaskProject] = useState(projects[0]?.id ?? "");
  const [taskDate, setTaskDate] = useState(todayIso());
  const [taskPriority, setTaskPriority] = useState<1 | 2 | 3>(2);
  const [taskDesc, setTaskDesc] = useState("");

  // Bookmark form
  const [bmUrl, setBmUrl] = useState("");
  const [bmTitle, setBmTitle] = useState("");
  const [bmTag, setBmTag] = useState("");

  // Set default project when projects load
  useEffect(() => {
    if (!taskProject && projects.length > 0) setTaskProject(projects[0].id);
  }, [projects, taskProject]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submitTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim() || !taskProject) return;
    try {
      await createTask.mutateAsync({
        title: taskTitle.trim(),
        project_id: taskProject,
        due_date: taskDate || null,
        priority: taskPriority,
        description: taskDesc.trim() || null,
        status: "todo",
      });
      toast.success("Tarefa criada!");
      onClose();
    } catch {
      toast.error("Erro ao criar tarefa");
    }
  }

  async function submitBookmark(e: React.FormEvent) {
    e.preventDefault();
    if (!bmUrl.trim()) return;
    try {
      let url = bmUrl.trim();
      if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
      const autoTitle = bmTitle.trim() || new URL(url).hostname;
      await createBookmark.mutateAsync({ url, title: autoTitle, tag: bmTag.trim() });
      toast.success("Link salvo!");
      onClose();
    } catch {
      toast.error("Erro ao salvar link");
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 440,
          background: "rgba(28,28,30,0.96)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: radius.xl,
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
          overflow: "hidden",
          animation: "modalIn 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.94) translateY(-10px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "16px 18px 0",
        }}>
          <h2 style={{ flex: 1, fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
            Adicionar
          </h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: colors.textMuted, cursor: "pointer", padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "12px 18px 0" }}>
          {(["task", "bookmark"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px",
                background: tab === t ? colors.accentBg : "transparent",
                border: tab === t ? `1px solid ${colors.accentBorder}` : `1px solid transparent`,
                borderRadius: radius.sm,
                color: tab === t ? colors.accent : colors.textSecondary,
                cursor: "pointer",
                fontSize: 13, fontWeight: tab === t ? 600 : 400,
                transition: `all 0.15s ${spring.gentle}`,
              }}
            >
              {t === "task" ? <CheckSquare size={13} /> : <LinkIcon size={13} />}
              {t === "task" ? "Tarefa" : "Link útil"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: "16px 18px 20px" }}>

          {tab === "task" && (
            <form onSubmit={submitTask} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Title */}
              <div>
                <label style={labelStyle}>Título *</label>
                <input
                  autoFocus
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="O que precisa ser feito?"
                  required
                  style={inputStyle}
                />
              </div>

              {/* Project */}
              <div>
                <label style={labelStyle}>Projeto *</label>
                <select
                  value={taskProject}
                  onChange={(e) => setTaskProject(e.target.value)}
                  required
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Date + Priority row */}
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Data de vencimento</label>
                  <input
                    type="date"
                    value={taskDate}
                    onChange={(e) => setTaskDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Prioridade</label>
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    {PRIORITIES.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setTaskPriority(p.value as 1 | 2 | 3)}
                        title={p.desc}
                        style={{
                          padding: "5px 10px",
                          background: taskPriority === p.value ? p.bg : "transparent",
                          border: taskPriority === p.value ? `1px solid ${p.color}50` : `1px solid ${colors.separator}`,
                          borderRadius: radius.sm,
                          color: taskPriority === p.value ? p.color : colors.textSecondary,
                          cursor: "pointer",
                          fontSize: 11, fontWeight: 700,
                          transition: `all 0.15s ${spring.gentle}`,
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Descrição (opcional)</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Detalhes, contexto..."
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!taskTitle.trim() || !taskProject || createTask.isPending}
                style={submitBtnStyle}
              >
                {createTask.isPending ? "Criando..." : "Criar tarefa"}
              </button>
            </form>
          )}

          {tab === "bookmark" && (
            <form onSubmit={submitBookmark} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* URL */}
              <div>
                <label style={labelStyle}>URL *</label>
                <input
                  autoFocus
                  type="url"
                  value={bmUrl}
                  onChange={(e) => setBmUrl(e.target.value)}
                  placeholder="https://..."
                  required
                  style={inputStyle}
                />
              </div>

              {/* Title */}
              <div>
                <label style={labelStyle}>Título (opcional)</label>
                <input
                  value={bmTitle}
                  onChange={(e) => setBmTitle(e.target.value)}
                  placeholder="Ex: Documentação React"
                  style={inputStyle}
                />
              </div>

              {/* Tag */}
              <div>
                <label style={labelStyle}>Tag / Categoria</label>
                <input
                  value={bmTag}
                  onChange={(e) => setBmTag(e.target.value)}
                  placeholder="Ex: dev, design, artigos..."
                  style={inputStyle}
                />
              </div>

              <button
                type="submit"
                disabled={!bmUrl.trim() || createBookmark.isPending}
                style={submitBtnStyle}
              >
                {createBookmark.isPending ? "Salvando..." : "Salvar link"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 500,
  color: colors.textSecondary,
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: colors.surfaceRaised,
  border: `1px solid ${colors.separator}`,
  color: colors.text,
  padding: "8px 10px",
  borderRadius: "8px",
  fontSize: 13,
  boxSizing: "border-box",
};

const submitBtnStyle: React.CSSProperties = {
  width: "100%",
  background: colors.accent,
  color: "#000",
  border: "none",
  padding: "10px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
  marginTop: 4,
};
