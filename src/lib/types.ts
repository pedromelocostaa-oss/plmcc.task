export type Project = {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  archived: boolean;
  position: number;
  created_at: string;
  updated_at?: string;
};

export type Subtask = {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  position: number;
  created_at: string;
};

export type TaskTag = {
  id: string;
  task_id: string;
  tag: string;
  created_at: string;
};

export type TaskComment = {
  id: string;
  task_id: string;
  content: string;
  created_at: string;
};

export type Task = {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: 'todo' | 'doing' | 'done';
  priority: 1 | 2 | 3;
  due_date: string | null;
  position?: number;
  completed_at: string | null;
  created_at: string;
  updated_at?: string;
  // optional joins
  subtasks?: Subtask[];
  task_tags?: TaskTag[];
  task_comments?: TaskComment[];
  project?: { name: string; color: string };
};

export type ProjectLink = {
  id: string;
  project_id: string;
  title: string;
  url: string;
  created_at: string;
};

export type ProjectNote = {
  id: string;
  project_id: string;
  content: string;
  updated_at: string;
};

export type Bookmark = {
  id: string;
  title: string;
  url: string;
  tag: string;
  created_at: string;
};

export const PROJECT_COLORS: string[] = [
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#06b6d4',
  '#ef4444',
  '#84cc16',
];

export const TAG_PALETTE = [
  '#f97316', '#eab308', '#3fb950', '#3b82f6',
  '#a855f7', '#ec4899', '#06b6d4', '#84cc16',
];

export function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash << 5) - hash + tag.charCodeAt(i);
    hash |= 0;
  }
  return TAG_PALETTE[Math.abs(hash) % TAG_PALETTE.length];
}
