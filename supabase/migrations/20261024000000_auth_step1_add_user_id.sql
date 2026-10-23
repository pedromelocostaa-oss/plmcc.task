-- PASSO 1/2 do login. Aditivo e seguro: so adiciona a coluna user_id (nullable) nas tabelas
-- de tarefas. NAO altera acesso nem dados. Pode rodar com o app no ar.
-- Depois: rode "npm run seed:user" (cria o usuario e preenche user_id) e so entao o passo 2.

begin;

do $$
declare t text;
begin
  foreach t in array array[
    'projects','tasks','subtasks','task_tags','task_comments',
    'project_links','project_notes','bookmarks','purchases','notes'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I add column if not exists user_id uuid', t);
    end if;
  end loop;
end $$;

commit;
