import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  Project,
  Task,
  Subtask,
  TaskTag,
  TaskComment,
  ProjectLink,
  ProjectNote,
  Bookmark,
} from "./types";

// ─── helpers ─────────────────────────────────────────────────────────────────

function todayBrasilia(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

// ─── query keys ──────────────────────────────────────────────────────────────

export const QK = {
  projects: ["projects"] as const,
  projectsArchived: ["projects", "archived"] as const,
  project: (id: string) => ["project", id] as const,
  tasks: ["tasks"] as const,
  tasksByProject: (id: string) => ["tasks", "project", id] as const,
  tasksToday: ["tasks", "today"] as const,
  tasksOverdue: ["tasks", "overdue"] as const,
  allTasks: (filters?: Record<string, unknown>) => ["tasks", "all", filters ?? {}] as const,
  comments: (taskId: string) => ["comments", taskId] as const,
  links: (projectId: string) => ["links", projectId] as const,
  note: (projectId: string) => ["note", projectId] as const,
  bookmarks: (search?: string) => ["bookmarks", search ?? ""] as const,
  stats: ["stats"] as const,
} as const;

// ─── projects ─────────────────────────────────────────────────────────────────

export function useProjects() {
  return useQuery({
    queryKey: QK.projects,
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("archived", false)
        .order("position")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as Project[];
    },
  });
}

export function useArchivedProjects() {
  return useQuery({
    queryKey: QK.projectsArchived,
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("archived", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Project[];
    },
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: QK.project(id),
    queryFn: async (): Promise<Project | null> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as Project;
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; color: string; description?: string | null; position?: number }): Promise<Project> => {
      const { data: result, error } = await supabase
        .from("projects")
        .insert({ name: data.name, color: data.color, description: data.description ?? null, position: data.position ?? 0 })
        .select()
        .single();
      if (error) throw error;
      return result as unknown as Project;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.projects });
      qc.invalidateQueries({ queryKey: QK.stats });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>> }): Promise<Project> => {
      const { data: result, error } = await supabase
        .from("projects")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result as unknown as Project;
    },
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: QK.projects });
      qc.invalidateQueries({ queryKey: QK.projectsArchived });
      qc.invalidateQueries({ queryKey: QK.project(vars.id) });
      qc.invalidateQueries({ queryKey: QK.stats });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.projects });
      qc.invalidateQueries({ queryKey: QK.projectsArchived });
      qc.invalidateQueries({ queryKey: QK.stats });
    },
  });
}

export function useArchiveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").update({ archived: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.projects });
      qc.invalidateQueries({ queryKey: QK.projectsArchived });
    },
  });
}

export function useUnarchiveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").update({ archived: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.projects });
      qc.invalidateQueries({ queryKey: QK.projectsArchived });
    },
  });
}

// ─── tasks ────────────────────────────────────────────────────────────────────

export function useTasksByProject(projectId: string) {
  return useQuery({
    queryKey: QK.tasksByProject(projectId),
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, subtasks(*), task_tags(*)")
        .eq("project_id", projectId)
        .order("priority")
        .order("position");
      if (error) throw error;
      return (data ?? []) as unknown as Task[];
    },
    enabled: !!projectId,
  });
}

export function useTasksForToday() {
  const today = todayBrasilia();
  return useQuery({
    queryKey: QK.tasksToday,
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, subtasks(*), task_tags(*), project:projects(name, color)")
        .eq("due_date", today)
        .order("priority")
        .order("position");
      if (error) throw error;
      return (data ?? []) as unknown as Task[];
    },
  });
}

export function useOverdueTasks() {
  const today = todayBrasilia();
  return useQuery({
    queryKey: QK.tasksOverdue,
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, subtasks(*), task_tags(*), project:projects(name, color)")
        .lt("due_date", today)
        .neq("status", "done")
        .order("due_date")
        .order("priority");
      if (error) throw error;
      return (data ?? []) as unknown as Task[];
    },
  });
}

export type TaskFilters = {
  status?: 'todo' | 'doing' | 'done';
  priority?: 1 | 2 | 3;
  project_id?: string;
  tag?: string;
  due_start?: string;
  due_end?: string;
};

export function useAllTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: QK.allTasks(filters as Record<string, unknown>),
    queryFn: async (): Promise<Task[]> => {
      let q = supabase
        .from("tasks")
        .select("*, subtasks(*), task_tags(*), project:projects(name, color)");

      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.priority) q = q.eq("priority", filters.priority);
      if (filters?.project_id) q = q.eq("project_id", filters.project_id);
      if (filters?.due_start) q = q.gte("due_date", filters.due_start);
      if (filters?.due_end) q = q.lte("due_date", filters.due_end);

      const { data, error } = await q.order("priority").order("due_date", { nullsFirst: false }).order("position");
      if (error) throw error;

      let tasks = (data ?? []) as unknown as Task[];
      if (filters?.tag) {
        tasks = tasks.filter((t) => t.task_tags?.some((tt) => tt.tag === filters.tag));
      }
      return tasks;
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      project_id: string;
      title: string;
      description?: string | null;
      status?: Task['status'];
      priority?: Task['priority'];
      due_date?: string | null;
      position?: number;
    }): Promise<Task> => {
      const { data: result, error } = await supabase
        .from("tasks")
        .insert({
          project_id: data.project_id,
          title: data.title,
          description: data.description ?? null,
          status: data.status ?? 'todo',
          priority: data.priority ?? 2,
          due_date: data.due_date ?? null,
          position: data.position ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      return result as unknown as Task;
    },
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: QK.tasksByProject(vars.project_id) });
      qc.invalidateQueries({ queryKey: QK.tasksToday });
      qc.invalidateQueries({ queryKey: QK.tasksOverdue });
      qc.invalidateQueries({ queryKey: QK.allTasks() });
      qc.invalidateQueries({ queryKey: QK.stats });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at' | 'subtasks' | 'task_tags' | 'task_comments' | 'project'>> }): Promise<Task> => {
      const { data: result, error } = await supabase
        .from("tasks")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result as unknown as Task;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: QK.tasksByProject(result.project_id) });
      qc.invalidateQueries({ queryKey: QK.tasksToday });
      qc.invalidateQueries({ queryKey: QK.tasksOverdue });
      qc.invalidateQueries({ queryKey: QK.allTasks() });
      qc.invalidateQueries({ queryKey: QK.stats });
    },
  });
}

export function useCycleTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, currentStatus, projectId }: { id: string; currentStatus: Task['status']; projectId: string }): Promise<Task> => {
      const next: Task['status'] = currentStatus === 'todo' ? 'doing' : currentStatus === 'doing' ? 'done' : 'todo';
      const completed_at = next === 'done' ? new Date().toISOString() : null;
      const { data: result, error } = await supabase
        .from("tasks")
        .update({ status: next, completed_at })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result as unknown as Task;
    },
    onMutate: async ({ id, currentStatus, projectId }) => {
      const next: Task['status'] = currentStatus === 'todo' ? 'doing' : currentStatus === 'doing' ? 'done' : 'todo';
      const qk = QK.tasksByProject(projectId);
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<Task[]>(qk);
      if (prev) {
        qc.setQueryData<Task[]>(qk, prev.map((t) =>
          t.id === id ? { ...t, status: next, completed_at: next === 'done' ? new Date().toISOString() : null } : t
        ));
      }
      return { prev, qk };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(ctx.qk, ctx.prev);
    },
    onSettled: (_result, _error, vars) => {
      qc.invalidateQueries({ queryKey: QK.tasksByProject(vars.projectId) });
      qc.invalidateQueries({ queryKey: QK.tasksToday });
      qc.invalidateQueries({ queryKey: QK.tasksOverdue });
      qc.invalidateQueries({ queryKey: QK.allTasks() });
      qc.invalidateQueries({ queryKey: QK.stats });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: QK.tasksByProject(vars.projectId) });
      qc.invalidateQueries({ queryKey: QK.tasksToday });
      qc.invalidateQueries({ queryKey: QK.tasksOverdue });
      qc.invalidateQueries({ queryKey: QK.allTasks() });
      qc.invalidateQueries({ queryKey: QK.stats });
    },
  });
}

// ─── subtasks ─────────────────────────────────────────────────────────────────

export function useCreateSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, title, projectId, position }: { taskId: string; title: string; projectId: string; position?: number }): Promise<Subtask> => {
      const { data, error } = await supabase
        .from("subtasks")
        .insert({ task_id: taskId, title, done: false, position: position ?? 0 })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Subtask;
    },
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: QK.tasksByProject(vars.projectId) });
      qc.invalidateQueries({ queryKey: QK.tasksToday });
      qc.invalidateQueries({ queryKey: QK.allTasks() });
    },
  });
}

export function useToggleSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, currentDone, projectId }: { id: string; currentDone: boolean; projectId: string }): Promise<Subtask> => {
      const { data, error } = await supabase
        .from("subtasks")
        .update({ done: !currentDone })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Subtask;
    },
    onMutate: async ({ id, currentDone, projectId }) => {
      const qk = QK.tasksByProject(projectId);
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<Task[]>(qk);
      if (prev) {
        qc.setQueryData<Task[]>(qk, prev.map((t) => ({
          ...t,
          subtasks: t.subtasks?.map((s) => s.id === id ? { ...s, done: !currentDone } : s),
        })));
      }
      return { prev, qk };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(ctx.qk, ctx.prev);
    },
    onSettled: (_result, _error, vars) => {
      qc.invalidateQueries({ queryKey: QK.tasksByProject(vars.projectId) });
      qc.invalidateQueries({ queryKey: QK.tasksToday });
      qc.invalidateQueries({ queryKey: QK.allTasks() });
    },
  });
}

export function useDeleteSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("subtasks").delete().eq("id", id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: QK.tasksByProject(vars.projectId) });
      qc.invalidateQueries({ queryKey: QK.tasksToday });
      qc.invalidateQueries({ queryKey: QK.allTasks() });
    },
  });
}

// ─── tags ─────────────────────────────────────────────────────────────────────

export function useAddTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, tag, projectId }: { taskId: string; tag: string; projectId: string }): Promise<TaskTag> => {
      const { data, error } = await supabase
        .from("task_tags")
        .insert({ task_id: taskId, tag })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TaskTag;
    },
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: QK.tasksByProject(vars.projectId) });
      qc.invalidateQueries({ queryKey: QK.allTasks() });
    },
  });
}

export function useRemoveTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, tag, projectId }: { taskId: string; tag: string; projectId: string }) => {
      const { error } = await supabase
        .from("task_tags")
        .delete()
        .eq("task_id", taskId)
        .eq("tag", tag);
      if (error) throw error;
    },
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: QK.tasksByProject(vars.projectId) });
      qc.invalidateQueries({ queryKey: QK.allTasks() });
    },
  });
}

// ─── comments ─────────────────────────────────────────────────────────────────

export function useTaskComments(taskId: string) {
  return useQuery({
    queryKey: QK.comments(taskId),
    queryFn: async (): Promise<TaskComment[]> => {
      const { data, error } = await supabase
        .from("task_comments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as TaskComment[];
    },
    enabled: !!taskId,
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, content }: { taskId: string; content: string }): Promise<TaskComment> => {
      const { data, error } = await supabase
        .from("task_comments")
        .insert({ task_id: taskId, content })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TaskComment;
    },
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: QK.comments(vars.taskId) });
    },
  });
}

// ─── project links ────────────────────────────────────────────────────────────

export function useLinksByProject(projectId: string) {
  return useQuery({
    queryKey: QK.links(projectId),
    queryFn: async (): Promise<ProjectLink[]> => {
      const { data, error } = await supabase
        .from("project_links")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProjectLink[];
    },
    enabled: !!projectId,
  });
}

export function useCreateLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, title, url }: { projectId: string; title: string; url: string }): Promise<ProjectLink> => {
      const { data, error } = await supabase
        .from("project_links")
        .insert({ project_id: projectId, title, url })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ProjectLink;
    },
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: QK.links(vars.projectId) });
    },
  });
}

export function useDeleteLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("project_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: QK.links(vars.projectId) });
    },
  });
}

// ─── notes ────────────────────────────────────────────────────────────────────

export function useNote(projectId: string) {
  return useQuery({
    queryKey: QK.note(projectId),
    queryFn: async (): Promise<ProjectNote | null> => {
      const { data, error } = await supabase
        .from("project_notes")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ProjectNote | null;
    },
    enabled: !!projectId,
  });
}

export function useSaveNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, content }: { projectId: string; content: string }): Promise<ProjectNote> => {
      const { data, error } = await supabase
        .from("project_notes")
        .upsert({ project_id: projectId, content, updated_at: new Date().toISOString() }, { onConflict: "project_id" })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ProjectNote;
    },
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: QK.note(vars.projectId) });
    },
  });
}

// ─── bookmarks ────────────────────────────────────────────────────────────────

export function useBookmarks(search?: string) {
  return useQuery({
    queryKey: QK.bookmarks(search),
    queryFn: async (): Promise<Bookmark[]> => {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("*")
        .order("tag")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const all = (data ?? []) as unknown as Bookmark[];
      if (!search || search.trim().length < 2) return all;
      const q = search.toLowerCase();
      return all.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.url.toLowerCase().includes(q) ||
          b.tag.toLowerCase().includes(q)
      );
    },
  });
}

export function useCreateBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, url, tag }: { title: string; url: string; tag: string }): Promise<Bookmark> => {
      const { data, error } = await supabase
        .from("bookmarks")
        .insert({ title, url, tag })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Bookmark;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
}

export function useDeleteBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookmarks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
}

// ─── stats (dashboard) ────────────────────────────────────────────────────────

type WeekStat = { week: string; created: number; done: number };
type MonthStat = { month: string; created: number; done: number };
type ProjectStat = { id: string; name: string; color: string; total: number; done: number; pct: number };

type Stats = {
  totalActiveProjects: number;
  totalOpenTasks: number;
  totalDoneTasks: number;
  totalOverdueTasks: number;
  byWeek: WeekStat[];
  byMonth: MonthStat[];
  byProject: ProjectStat[];
};

export function useStats() {
  return useQuery({
    queryKey: QK.stats,
    queryFn: async (): Promise<Stats> => {
      const today = todayBrasilia();

      const [{ data: projects }, { data: tasks }] = await Promise.all([
        supabase.from("projects").select("id, name, color, archived").eq("archived", false),
        supabase.from("tasks").select("id, project_id, status, due_date, completed_at, created_at"),
      ]);

      const activeProjects = projects ?? [];
      const allTasks = tasks ?? [];

      const totalActiveProjects = activeProjects.length;
      const totalOpenTasks = allTasks.filter((t) => t.status !== "done").length;
      const totalDoneTasks = allTasks.filter((t) => t.status === "done").length;
      const totalOverdueTasks = allTasks.filter((t) => t.due_date && t.due_date < today && t.status !== "done").length;

      // byWeek — last 8 weeks (Mon-based)
      const byWeek: WeekStat[] = [];
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - i * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const ws = weekStart.toISOString().slice(0, 10);
        const we = weekEnd.toISOString().slice(0, 10);
        const label = `S${weekStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
        const created = allTasks.filter((t) => t.created_at.slice(0, 10) >= ws && t.created_at.slice(0, 10) <= we).length;
        const done = allTasks.filter((t) => t.completed_at && t.completed_at.slice(0, 10) >= ws && t.completed_at.slice(0, 10) <= we).length;
        byWeek.push({ week: label, created, done });
      }

      // byMonth — last 6 months
      const byMonth: MonthStat[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i, 1);
        const ym = d.toISOString().slice(0, 7);
        const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
        const created = allTasks.filter((t) => t.created_at.slice(0, 7) === ym).length;
        const done = allTasks.filter((t) => t.completed_at && t.completed_at.slice(0, 7) === ym).length;
        byMonth.push({ month: label, created, done });
      }

      // byProject
      const byProject: ProjectStat[] = activeProjects.map((p) => {
        const ptasks = allTasks.filter((t) => t.project_id === p.id);
        const done = ptasks.filter((t) => t.status === "done").length;
        const total = ptasks.length;
        const pct = total === 0 ? 0 : Math.round((done / total) * 100);
        return { id: p.id, name: p.name, color: p.color, total, done, pct };
      });

      return { totalActiveProjects, totalOpenTasks, totalDoneTasks, totalOverdueTasks, byWeek, byMonth, byProject };
    },
  });
}

// ─── legacy exports (backward compat during migration) ───────────────────────

export { useProjects as useProjectsList };
