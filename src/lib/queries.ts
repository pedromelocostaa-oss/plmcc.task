import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Project, Task, ProjectLink, ProjectNote, Bookmark } from "./types";

const QK = {
  projects: ["projects"] as const,
  tasks: ["tasks"] as const,
  links: ["links"] as const,
  notes: ["notes"] as const,
  bookmarks: ["bookmarks"] as const,
};

export function useProjects() {
  return useQuery({
    queryKey: QK.projects,
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase.from("projects").select("*").order("position").order("created_at");
      if (error) throw error;
      return (data ?? []) as Project[];
    },
  });
}

export function useTasks() {
  return useQuery({
    queryKey: QK.tasks,
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });
}

export function useLinks() {
  return useQuery({
    queryKey: QK.links,
    queryFn: async (): Promise<ProjectLink[]> => {
      const { data, error } = await supabase.from("project_links").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProjectLink[];
    },
  });
}

export function useNotes() {
  return useQuery({
    queryKey: QK.notes,
    queryFn: async (): Promise<ProjectNote[]> => {
      const { data, error } = await supabase.from("project_notes").select("*");
      if (error) throw error;
      return (data ?? []) as ProjectNote[];
    },
  });
}

export function useBookmarks() {
  return useQuery({
    queryKey: QK.bookmarks,
    queryFn: async (): Promise<Bookmark[]> => {
      const { data, error } = await supabase.from("bookmarks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Bookmark[];
    },
  });
}

// Generic mutation helper
function useTableMutation<T extends { id?: string }>(table: string, qk: readonly string[]) {
  const qc = useQueryClient();
  return {
    create: useMutation({
      mutationFn: async (row: Partial<T>): Promise<T> => {
        const { data, error } = await supabase.from(table).insert(row as any).select().single();
        if (error) throw error;
        return data as T;
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: qk }),
    }),
    update: useMutation({
      mutationFn: async ({ id, patch }: { id: string; patch: Partial<T> }): Promise<T> => {
        const { data, error } = await supabase.from(table).update(patch as any).eq("id", id).select().single();
        if (error) throw error;
        return data as T;
      },
      onMutate: async ({ id, patch }) => {
        await qc.cancelQueries({ queryKey: qk });
        const prev = qc.getQueryData<any[]>(qk as any);
        if (prev) qc.setQueryData(qk as any, prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
        return { prev };
      },
      onError: (_e, _v, ctx: any) => { if (ctx?.prev) qc.setQueryData(qk as any, ctx.prev); },
      onSettled: () => qc.invalidateQueries({ queryKey: qk }),
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (error) throw error;
      },
      onMutate: async (id) => {
        await qc.cancelQueries({ queryKey: qk });
        const prev = qc.getQueryData<any[]>(qk as any);
        if (prev) qc.setQueryData(qk as any, prev.filter((r) => r.id !== id));
        return { prev };
      },
      onError: (_e, _v, ctx: any) => { if (ctx?.prev) qc.setQueryData(qk as any, ctx.prev); },
      onSettled: () => qc.invalidateQueries({ queryKey: qk }),
    }),
  };
}

export const useProjectMut = () => useTableMutation<Project>("projects", QK.projects);
export const useTaskMut = () => useTableMutation<Task>("tasks", QK.tasks);
export const useLinkMut = () => useTableMutation<ProjectLink>("project_links", QK.links);
export const useBookmarkMut = () => useTableMutation<Bookmark>("bookmarks", QK.bookmarks);

export function useUpsertNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ project_id, user_id, content }: { project_id: string; user_id: string; content: string }) => {
      const { data, error } = await supabase
        .from("project_notes")
        .upsert({ project_id, user_id, content, updated_at: new Date().toISOString() }, { onConflict: "project_id" })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.notes }),
  });
}
