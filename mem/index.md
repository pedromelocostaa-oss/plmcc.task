# Project Memory

## Core
App pessoal — ZERO autenticação. Não usar supabase.auth, uid(), user_id em inserts/updates. Nada de AuthProvider, useAuth, ou rota /login.
Banco Supabase externo (emzrnfranahhiuauoqkd). NUNCA modificar .env nem trocar projeto.
Schema: subtasks, task_tags, task_comments são TABELAS SEPARADAS (não JSON). Tabelas SEM coluna user_id.
