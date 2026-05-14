import { useEffect, useMemo, useState } from "react";
import { Archive, Trash2, Plus, ArrowUpDown, Tag as TagIcon, ExternalLink, Link as LinkIcon, Pencil } from "lucide-react";
import { useProjects, useTasks, useLinks, useNotes, useTaskMut, useProjectMut, useLinkMut, useUpsertNote } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { PROJECT_COLORS, type Task } from "@/lib/types";
import { isOverdue, isToday, isThisWeek, hostname, tagColor } from "@/lib/format";
import { TaskCard } from "./TaskCard";
import { TaskForm } from "./TaskForm";
import type { View } from "./Sidebar";

export function ProjectView({ projectId, setView, newTaskTrigger }: { projectId: string; setView: (v: View) => void; newTaskTrigger: number }) {
  const { user } = useAuth();
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: links = [] } = useLinks();
  const { data: notes = [] } = useNotes();
  const taskMut = useTaskMut();
  const projectMut = useProjectMut();
  const linkMut = useLinkMut();
  const noteMut = useUpsertNote();

  const project = projects.find((p) => p.id === projectId);
  const projTasks = useMemo(() => tasks.filter((t) => t.project_id === projectId), [tasks, projectId]);
  const projLinks = useMemo(() => links.filter((l) => l.project_id === projectId), [links, projectId]);
  const note = notes.find((n) => n.project_id === projectId);

  const [tab, setTab] = useState<"tasks" | "links" | "notes">("tasks");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [sortByPriority, setSortByPriority] = useState(false);
  const [dueFilter, setDueFilter] = useState<"all" | "today" | "week" | "overdue">("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // open form when N pressed (handled by parent setting newTaskTrigger)
  useEffect(() => { if (newTaskTrigger > 0 && tab === "tasks") { setShowForm(true); setEditing(null); } }, [newTaskTrigger]);

  if (!project) return <div style={{ padding: 32, color: "#8b949e" }}>Projeto não encontrado.</div>;
  const color = PROJECT_COLORS[project.color] || project.color;

  const allTags = useMemo(() => Array.from(new Set(projTasks.flatMap((t) => t.tags))).sort(), [projTasks]);

  const filtered = useMemo(() => {
    return projTasks.filter((t) => {
      if (tagFilter && !t.tags.includes(tagFilter)) return false;
      if (dueFilter === "today" && !isToday(t.due_date)) return false;
      if (dueFilter === "week" && !isThisWeek(t.due_date)) return false;
      if (dueFilter === "overdue" && !isOverdue(t.due_date, t.status)) return false;
      return true;
    });
  }, [projTasks, dueFilter, tagFilter]);

  const done = projTasks.filter((t) => t.status === "done").length;
  const pct = projTasks.length === 0 ? 0 : Math.round((done / projTasks.length) * 100);
  const barColor = pct === 100 ? "#3fb950" : color;

  async function saveTask(d: Partial<Task>) {
    if (editing) {
      await taskMut.update.mutateAsync({ id: editing.id, patch: d });
    } else {
      if (!user) return;
      await taskMut.create.mutateAsync({ ...d, project_id: projectId, user_id: user.id, status: "todo" } as any);
    }
    setShowForm(false); setEditing(null);
  }

  function archiveProject() {
    projectMut.update.mutate({ id: projectId, patch: { archived: !project.archived } as any });
  }
  function deleteProject() {
    if (confirm(`Excluir o projeto "${project.name}"? Esta ação é irreversível.`)) {
      projectMut.remove.mutate(projectId);
      setView({ kind: "home" });
    }
  }

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 32 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <span style={{ width: 12, height: 12, borderRadius: 6, background: color }} />
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>{project.name}</h1>
        <div style={{ width: 80, height: 4, background: "#21262d", borderRadius: 2, overflow: "hidden", marginLeft: 8 }}>
          <div style={{ height: "100%", background: barColor, width: `${pct}%`, transition: "width 0.4s" }} />
        </div>
        <span style={{ fontFamily: "DM Mono", fontSize: 11, color: "#8b949e" }}>{pct}%</span>
        <div style={{ flex: 1 }} />
        <button onClick={archiveProject} style={subtle} title={project.archived ? "Desarquivar" : "Arquivar"}><Archive size={14} /></button>
        <button onClick={deleteProject} style={subtle} title="Excluir"><Trash2 size={14} /></button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #21262d", marginBottom: 20 }}>
        {([
          { id: "tasks", label: "TAREFAS", count: projTasks.length },
          { id: "links", label: "LINKS", count: projLinks.length },
          { id: "notes", label: "NOTAS", count: null },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "transparent", border: "none", color: tab === t.id ? "#f97316" : "#8b949e",
            fontFamily: "DM Mono", fontSize: 11, padding: "10px 14px", cursor: "pointer",
            borderBottom: "2px solid " + (tab === t.id ? "#f97316" : "transparent"), marginBottom: -1,
          }}>
            {t.label}{t.count !== null && ` · ${t.count}`}
          </button>
        ))}
      </div>

      {tab === "tasks" && (
        <TasksTab
          tasks={filtered} allTags={allTags} tagFilter={tagFilter} setTagFilter={setTagFilter}
          dueFilter={dueFilter} setDueFilter={setDueFilter}
          sortByPriority={sortByPriority} setSortByPriority={setSortByPriority}
          showForm={showForm} setShowForm={setShowForm} editing={editing} setEditing={setEditing}
          onSave={saveTask}
        />
      )}
      {tab === "links" && (
        <LinksTab links={projLinks} onAdd={(t, u) => user && linkMut.create.mutate({ project_id: projectId, user_id: user.id, title: t, url: u } as any)}
          onDelete={(id) => linkMut.remove.mutate(id)} />
      )}
      {tab === "notes" && (
        <NotesTab content={note?.content || ""} onSave={(c) => user && noteMut.mutate({ project_id: projectId, user_id: user.id, content: c })} />
      )}
    </div>
  );
}

function TasksTab(props: any) {
  const { tasks, allTags, tagFilter, setTagFilter, dueFilter, setDueFilter, sortByPriority, setSortByPriority, showForm, setShowForm, editing, setEditing, onSave } = props;

  let groups: { label: string; items: Task[] }[];
  if (sortByPriority) {
    groups = [
      { label: "P1", items: tasks.filter((t: Task) => t.priority === 1) },
      { label: "P2", items: tasks.filter((t: Task) => t.priority === 2) },
      { label: "P3", items: tasks.filter((t: Task) => t.priority === 3) },
    ];
  } else {
    groups = [
      { label: "A FAZER", items: tasks.filter((t: Task) => t.status === "todo") },
      { label: "EM ANDAMENTO", items: tasks.filter((t: Task) => t.status === "doing") },
      { label: "CONCLUÍDA", items: tasks.filter((t: Task) => t.status === "done") },
    ];
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={() => { setShowForm(true); setEditing(null); }} style={accentBtn}>
          <Plus size={14} /> Nova tarefa <span className="kbd" style={{ marginLeft: 4 }}>N</span>
        </button>
        <button onClick={() => setSortByPriority(!sortByPriority)} style={{ ...ghostBtn, color: sortByPriority ? "#f97316" : "#8b949e" }}>
          <ArrowUpDown size={12} /> {sortByPriority ? "Por prioridade" : "Ordenar"}
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "today", "week", "overdue"] as const).map((f) => (
            <button key={f} onClick={() => setDueFilter(f)} style={{
              background: dueFilter === f ? "rgba(249,115,22,0.13)" : "transparent",
              color: dueFilter === f ? "#f97316" : "#8b949e",
              border: "1px solid " + (dueFilter === f ? "#f97316" : "#30363d"),
              padding: "4px 10px", borderRadius: 12, cursor: "pointer", fontSize: 11, fontFamily: "DM Mono",
            }}>
              {f === "all" ? "Todos" : f === "today" ? "Hoje" : f === "week" ? "Semana" : "Atrasadas"}
            </button>
          ))}
        </div>
      </div>

      {allTags.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          <TagIcon size={12} color="#6e7681" />
          {allTags.map((t: string) => {
            const active = tagFilter === t;
            const c = tagColor(t);
            return (
              <button key={t} onClick={() => setTagFilter(active ? null : t)} style={{
                fontFamily: "DM Mono", fontSize: 10, padding: "2px 8px", borderRadius: 10,
                background: active ? c + "33" : "#21262d",
                color: active ? c : "#8b949e",
                border: "1px solid " + (active ? c : "#30363d"), cursor: "pointer",
              }}>{t}</button>
            );
          })}
        </div>
      )}

      {(showForm || editing) && (
        <div style={{ marginBottom: 14 }}>
          <TaskForm initial={editing} onCancel={() => { setShowForm(false); setEditing(null); }} onSave={onSave} />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {groups.map((g) => g.items.length > 0 && (
          <div key={g.label}>
            <div style={{ fontFamily: "DM Mono", fontSize: 10, color: "#6e7681", marginBottom: 6, letterSpacing: 1 }}>
              {g.label} · {g.items.length}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {g.items.map((t) => <TaskCard key={t.id} task={t} onEdit={() => { setEditing(t); setShowForm(false); }} />)}
            </div>
          </div>
        ))}
        {tasks.length === 0 && <div style={{ color: "#6e7681", fontSize: 13, padding: 24, textAlign: "center" }}>Nenhuma tarefa.</div>}
      </div>
    </div>
  );
}

function LinksTab({ links, onAdd, onDelete }: any) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (opcional)"
          style={{ ...inp, width: 220 }} />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..."
          style={{ ...inp, flex: 1 }} />
        <button onClick={() => { if (url.trim()) { onAdd(title.trim(), url.trim()); setTitle(""); setUrl(""); } }} style={accentBtn}>
          <Plus size={14} /> Adicionar
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {links.map((l: any) => <LinkRow key={l.id} l={l} onDelete={() => onDelete(l.id)} />)}
        {links.length === 0 && <div style={{ color: "#6e7681", fontSize: 13 }}>Nenhum link.</div>}
      </div>
    </div>
  );
}

function LinkRow({ l, onDelete }: any) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      background: hov ? "#1c2128" : "#161b22", border: "1px solid #30363d", borderRadius: 8,
      padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
    }}>
      <LinkIcon size={14} color="#8b949e" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13 }}>{l.title || hostname(l.url)}</div>
        <div style={{ fontSize: 11, color: "#6e7681" }}>{hostname(l.url)}</div>
      </div>
      {hov && <>
        <a href={l.url} target="_blank" rel="noreferrer" style={subtle}><ExternalLink size={14} /></a>
        <button onClick={onDelete} style={subtle}><Trash2 size={14} /></button>
      </>}
    </div>
  );
}

function NotesTab({ content, onSave }: { content: string; onSave: (c: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  useEffect(() => { setDraft(content); }, [content]);

  if (editing) {
    return (
      <div>
        <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} rows={20}
          style={{ ...inp, width: "100%", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <button onClick={() => { onSave(draft); setEditing(false); }} style={accentBtn}>Salvar</button>
          <button onClick={() => { setDraft(content); setEditing(false); }} style={ghostBtn}>Cancelar</button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button onClick={() => setEditing(true)} style={ghostBtn}><Pencil size={12} /> Editar</button>
      </div>
      <div style={{
        background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: 16,
        whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.7, color: content ? "#e6edf3" : "#6e7681", minHeight: 120,
      }}>
        {content || "Nenhuma nota ainda. Clique em Editar para começar."}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = { background: "#0d1117", border: "1px solid #30363d", color: "#e6edf3", padding: "8px 10px", borderRadius: 6, fontSize: 13 };
const accentBtn: React.CSSProperties = { background: "#f97316", color: "#0d1117", border: "none", padding: "7px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 };
const ghostBtn: React.CSSProperties = { background: "transparent", color: "#8b949e", border: "1px solid #30363d", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 };
const subtle: React.CSSProperties = { background: "transparent", border: "none", color: "#8b949e", cursor: "pointer", padding: 4, display: "inline-flex" };
