-- PASSO 2/2 do login. FECHA O ACESSO: so o usuario autenticado dono enxerga e altera os dados.
-- Pre-requisito: passo 1 + "npm run seed:user". Se sobrar linha sem dono, a migration aborta
-- inteira (nada e alterado) e diz qual tabela.

begin;

do $$
declare
  owned text[] := array[
    'projects','tasks','subtasks','task_tags','task_comments',
    'project_links','project_notes','bookmarks','purchases','notes',
    'financas_contas','financas_cartoes','financas_categorias','financas_lancamentos',
    'financas_faturas','financas_recorrencias','financas_tags','financas_orcamentos'
  ];
  t text;
  n bigint;
  r record;
begin
  -- 1) guarda: nenhuma linha pode ficar sem dono
  foreach t in array owned loop
    if to_regclass('public.' || t) is not null then
      execute format(
        'select count(*) from public.%I where user_id is null or user_id = %L',
        t, '00000000-0000-0000-0000-000000000000'
      ) into n;
      if n > 0 then
        raise exception 'Tabela % tem % linha(s) sem dono. Rode "npm run seed:user" e tente de novo.', t, n;
      end if;
    end if;
  end loop;

  -- 2) remove TODAS as politicas antigas (inclui os "allow all")
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;

  -- 3) RLS ligado em TODAS as tabelas do schema public (sem politica = bloqueado)
  for r in
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  loop
    execute format('alter table public.%I enable row level security', r.table_name);
  end loop;

  -- 4) tabelas com dono: NOT NULL, default = usuario logado, FK, indice e politica de dono
  foreach t in array owned loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I alter column user_id set not null', t);
      execute format('alter table public.%I alter column user_id set default auth.uid()', t);
      if not exists (
        select 1 from pg_constraint
        where conname = t || '_user_id_fkey' and conrelid = to_regclass('public.' || t)
      ) then
        execute format(
          'alter table public.%I add constraint %I foreign key (user_id) references auth.users(id) on delete cascade',
          t, t || '_user_id_fkey'
        );
      end if;
      execute format('create index if not exists %I on public.%I (user_id)', t || '_user_id_idx', t);
      execute format(
        'create policy owner_all on public.%I for all to authenticated
           using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t
      );
    end if;
  end loop;

  -- 5) tabela de juncao sem user_id: herda o dono do lancamento
  if to_regclass('public.financas_lancamento_tags') is not null then
    create policy owner_all on public.financas_lancamento_tags for all to authenticated
      using (exists (select 1 from public.financas_lancamentos l
                     where l.id = lancamento_id and l.user_id = (select auth.uid())))
      with check (exists (select 1 from public.financas_lancamentos l
                          where l.id = lancamento_id and l.user_id = (select auth.uid())));
  end if;
end $$;

-- 6) anon nao tem mais nenhum privilegio nas tabelas
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

-- 7) limite de tentativas de login (progressivo). Tabela fechada: so as funcoes mexem nela.
create table if not exists public.login_attempts (
  key text primary key,
  failures int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.login_attempts enable row level security;

create or replace function public.auth_throttle_check(p_key text)
returns int language plpgsql security definer set search_path = '' as $$
declare s int;
begin
  select greatest(ceil(extract(epoch from (locked_until - now())))::int, 0)
    into s from public.login_attempts where key = p_key;
  return coalesce(s, 0);
end $$;

create or replace function public.auth_throttle_record(p_key text, p_ok boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare f int;
begin
  if p_key is null or length(p_key) > 128 then return; end if;
  delete from public.login_attempts where updated_at < now() - interval '1 day';
  if p_ok then
    delete from public.login_attempts where key = p_key;
    return;
  end if;
  insert into public.login_attempts as la (key, failures, updated_at) values (p_key, 1, now())
  on conflict (key) do update set
    failures = case when la.updated_at < now() - interval '1 hour' then 1 else la.failures + 1 end,
    updated_at = now()
  returning la.failures into f;
  -- 5 erros: trava 30s; dobra a cada erro seguinte, ate 1h
  if f >= 5 then
    update public.login_attempts
       set locked_until = now() + make_interval(secs => least(30 * power(2, f - 5), 3600))
     where key = p_key;
  end if;
end $$;

revoke all on function public.auth_throttle_check(text) from public;
revoke all on function public.auth_throttle_record(text, boolean) from public;
grant execute on function public.auth_throttle_check(text) to anon, authenticated;
grant execute on function public.auth_throttle_record(text, boolean) to anon, authenticated;

commit;
