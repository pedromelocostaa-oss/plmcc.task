import type { SupabaseClient } from "@supabase/supabase-js";

type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export const TOOLS: Tool[] = [
  {
    name: "list_projects",
    description: "Lista todos os projetos ativos do Pedro's HQ",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_tasks",
    description:
      "Lista tarefas, com filtros opcionais por projeto, status e prioridade",
    inputSchema: {
      type: "object",
      properties: {
        project_name: {
          type: "string",
          description: "Filtrar por nome do projeto (busca parcial, case-insensitive)",
        },
        status: {
          type: "string",
          enum: ["backlog", "todo", "doing", "waiting", "done"],
          description: "Filtrar por status",
        },
        priority: {
          type: "number",
          enum: [1, 2, 3],
          description: "Filtrar por prioridade (1=urgente, 2=normal, 3=baixa)",
        },
        limit: {
          type: "number",
          description: "Limite de resultados (default 50)",
        },
      },
    },
  },
  {
    name: "create_task",
    description:
      "Cria uma nova tarefa no Pedro's HQ. Requer titulo e nome do projeto.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Titulo da tarefa" },
        project_name: {
          type: "string",
          description: "Nome do projeto (ex: Blis, E-proc, pessoal / dia a dia)",
        },
        description: { type: "string", description: "Descricao (opcional)" },
        status: {
          type: "string",
          enum: ["backlog", "todo", "doing", "waiting", "done"],
          description: "Status inicial (default: backlog)",
        },
        priority: {
          type: "number",
          enum: [1, 2, 3],
          description: "Prioridade: 1=urgente, 2=normal, 3=baixa (default: 2)",
        },
        due_date: {
          type: "string",
          description: "Data limite no formato YYYY-MM-DD (opcional)",
        },
      },
      required: ["title", "project_name"],
    },
  },
  {
    name: "create_tasks_batch",
    description:
      "Cria multiplas tarefas de uma vez no Pedro's HQ. Ideal para quando o usuario manda uma lista.",
    inputSchema: {
      type: "object",
      properties: {
        project_name: {
          type: "string",
          description: "Nome do projeto para todas as tarefas",
        },
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              priority: { type: "number", enum: [1, 2, 3] },
              status: {
                type: "string",
                enum: ["backlog", "todo", "doing", "waiting", "done"],
              },
              due_date: { type: "string" },
            },
            required: ["title"],
          },
          description: "Array de tarefas para criar",
        },
      },
      required: ["project_name", "tasks"],
    },
  },
  {
    name: "update_task",
    description: "Atualiza uma tarefa existente (status, prioridade, titulo, etc)",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "ID da tarefa" },
        title: { type: "string" },
        description: { type: "string" },
        status: {
          type: "string",
          enum: ["backlog", "todo", "doing", "waiting", "done"],
        },
        priority: { type: "number", enum: [1, 2, 3] },
        due_date: { type: "string", description: "YYYY-MM-DD ou null" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "delete_task",
    description: "Remove uma tarefa permanentemente",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "ID da tarefa" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "search_tasks",
    description: "Busca tarefas pelo titulo (busca parcial)",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Texto para buscar no titulo" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_stats",
    description:
      "Retorna estatisticas gerais: total de tarefas por status, por projeto, por prioridade",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

async function resolveProjectId(
  db: SupabaseClient,
  name: string
): Promise<string | null> {
  const { data } = await db
    .from("projects")
    .select("id, name")
    .ilike("name", `%${name}%`)
    .limit(1)
    .single();
  return data?.id ?? null;
}

export async function executeTool(
  db: SupabaseClient,
  name: string,
  args: Record<string, unknown>
): Promise<{ content: { type: string; text: string }[] }> {
  switch (name) {
    case "list_projects": {
      const { data, error } = await db
        .from("projects")
        .select("id, name, color, archived, created_at")
        .eq("archived", false)
        .order("name");
      if (error) return err(error.message);
      return ok(data);
    }

    case "list_tasks": {
      let q = db
        .from("tasks")
        .select("id, title, description, status, priority, due_date, created_at, project:projects(name, color)")
        .order("created_at", { ascending: false })
        .limit((args.limit as number) || 50);

      if (args.status) q = q.eq("status", args.status);
      if (args.priority) q = q.eq("priority", args.priority);
      if (args.project_name) {
        const pid = await resolveProjectId(db, args.project_name as string);
        if (!pid) return err(`Projeto "${args.project_name}" nao encontrado`);
        q = q.eq("project_id", pid);
      }

      const { data, error } = await q;
      if (error) return err(error.message);
      return ok(data);
    }

    case "create_task": {
      const pid = await resolveProjectId(db, args.project_name as string);
      if (!pid) return err(`Projeto "${args.project_name}" nao encontrado`);
      const { data, error } = await db
        .from("tasks")
        .insert({
          project_id: pid,
          title: args.title,
          description: (args.description as string) || "",
          status: (args.status as string) || "backlog",
          priority: (args.priority as number) || 2,
          due_date: args.due_date || null,
          position: 0,
        })
        .select("id, title, status, priority")
        .single();
      if (error) return err(error.message);
      return ok({ message: "Tarefa criada com sucesso", task: data });
    }

    case "create_tasks_batch": {
      const pid = await resolveProjectId(db, args.project_name as string);
      if (!pid)
        return err(`Projeto "${args.project_name}" nao encontrado`);
      const tasks = args.tasks as {
        title: string;
        description?: string;
        priority?: number;
        status?: string;
        due_date?: string;
      }[];
      const rows = tasks.map((t) => ({
        project_id: pid,
        title: t.title,
        description: t.description || "",
        status: t.status || "backlog",
        priority: t.priority || 2,
        due_date: t.due_date || null,
        position: 0,
      }));

      let created = 0;
      const errors: string[] = [];
      for (const row of rows) {
        const { error } = await db.from("tasks").insert(row);
        if (error) errors.push(`"${row.title}": ${error.message}`);
        else created++;
      }

      return ok({
        message: `${created}/${rows.length} tarefas criadas`,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    case "update_task": {
      const update: Record<string, unknown> = {};
      for (const key of ["title", "description", "status", "priority", "due_date"]) {
        if (args[key] !== undefined) update[key] = args[key];
      }
      const { data, error } = await db
        .from("tasks")
        .update(update)
        .eq("id", args.task_id)
        .select("id, title, status, priority")
        .single();
      if (error) return err(error.message);
      return ok({ message: "Tarefa atualizada", task: data });
    }

    case "delete_task": {
      const { error } = await db.from("tasks").delete().eq("id", args.task_id);
      if (error) return err(error.message);
      return ok({ message: "Tarefa removida" });
    }

    case "search_tasks": {
      const { data, error } = await db
        .from("tasks")
        .select("id, title, status, priority, due_date, project:projects(name)")
        .ilike("title", `%${args.query}%`)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) return err(error.message);
      return ok(data);
    }

    case "get_stats": {
      const { data: tasks } = await db
        .from("tasks")
        .select("status, priority, project:projects(name)");
      if (!tasks) return ok({ total: 0 });

      const byStatus: Record<string, number> = {};
      const byPriority: Record<string, number> = {};
      const byProject: Record<string, number> = {};

      for (const t of tasks as { status: string; priority: number; project: { name: string } | null }[]) {
        byStatus[t.status] = (byStatus[t.status] || 0) + 1;
        byPriority[`P${t.priority}`] = (byPriority[`P${t.priority}`] || 0) + 1;
        const pn = t.project?.name || "Sem projeto";
        byProject[pn] = (byProject[pn] || 0) + 1;
      }

      return ok({ total: tasks.length, byStatus, byPriority, byProject });
    }

    default:
      return err(`Tool "${name}" nao encontrada`);
  }
}

function ok(data: unknown) {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

function err(msg: string) {
  return {
    content: [{ type: "text", text: `Erro: ${msg}` }],
    isError: true,
  };
}
