export type Project = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  archived: boolean;
  position: number;
  created_at: string;
};

export type Subtask = { id: string; title: string; done: boolean };
export type Comment = { id: string; text: string; created_at: string };

export type Task = {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string;
  status: "todo" | "doing" | "done";
  priority: 1 | 2 | 3;
  due_date: string | null;
  subtasks: Subtask[];
  tags: string[];
  comments: Comment[];
  created_at: string;
  completed_at: string | null;
};

export type ProjectLink = {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  url: string;
  created_at: string;
};

export type ProjectNote = {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  updated_at: string;
};

export type Bookmark = {
  id: string;
  user_id: string;
  title: string;
  url: string;
  tag: string;
  created_at: string;
};

export const PROJECT_COLORS: Record<string, string> = {
  orange: "#f97316",
  yellow: "#eab308",
  green: "#3fb950",
  blue: "#3b82f6",
  purple: "#a855f7",
  pink: "#ec4899",
  cyan: "#06b6d4",
  red: "#ef4444",
  lime: "#84cc16",
};

export const PROJECT_COLOR_KEYS = Object.keys(PROJECT_COLORS);

export const TAG_PALETTE = [
  "#f97316", "#eab308", "#3fb950", "#3b82f6",
  "#a855f7", "#ec4899", "#06b6d4", "#84cc16",
];
