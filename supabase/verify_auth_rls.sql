-- Rode DEPOIS do passo 2. Cada consulta deve voltar o que esta no comentario.

-- 1) tabelas SEM RLS -> esperado: 0 linhas
select tablename as sem_rls from pg_tables
where schemaname = 'public' and not rowsecurity;

-- 2) tabelas com RLS e ZERO politicas (ficam bloqueadas) -> so login_attempts deve aparecer
select c.relname as bloqueada
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname);

-- 3) politicas que nao sao a de dono -> esperado: 0 linhas
select tablename, policyname from pg_policies where schemaname = 'public' and policyname <> 'owner_all';

-- 4) privilegios do anon nas tabelas -> esperado: 0 linhas
select table_name, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and grantee = 'anon';

-- 5) usuarios cadastrados -> esperado: 1 (pedromelocostaa@gmail.com)
select count(*) as usuarios, min(email) as email from auth.users;
