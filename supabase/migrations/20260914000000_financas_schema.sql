-- =========================================
-- CONTAS (carteira, banco, cartão de crédito)
-- =========================================
create table financas_contas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  nome text not null,
  tipo text not null check (tipo in ('conta_corrente','poupanca','dinheiro','investimento','cartao_credito')),
  saldo_inicial numeric(14,2) default 0,
  cor text,
  icone text,
  ativa boolean default true,
  ordem int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Cartões de crédito têm campos extras
create table financas_cartoes (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid references financas_contas(id) on delete cascade not null unique,
  user_id uuid references auth.users not null,
  limite numeric(14,2),
  dia_fechamento int not null check (dia_fechamento between 1 and 31),
  dia_vencimento int not null check (dia_vencimento between 1 and 31),
  bandeira text,
  ultimos_digitos text,
  created_at timestamptz default now()
);

-- =========================================
-- CATEGORIAS (com hierarquia opcional)
-- =========================================
create table financas_categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  nome text not null,
  tipo text not null check (tipo in ('receita','despesa')),
  categoria_pai_id uuid references financas_categorias(id) on delete set null,
  cor text,
  icone text,
  ativa boolean default true,
  created_at timestamptz default now()
);

-- =========================================
-- LANÇAMENTOS
-- =========================================
create table financas_lancamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  conta_id uuid references financas_contas(id) not null,
  categoria_id uuid references financas_categorias(id) on delete set null,
  descricao text not null,
  valor numeric(14,2) not null check (valor > 0),
  tipo text not null check (tipo in ('receita','despesa','transferencia')),
  data date not null,
  data_pagamento date,
  pago boolean default false,
  observacao text,

  -- Transferência entre contas
  conta_destino_id uuid references financas_contas(id),

  -- Cartão de crédito: lançamento vinculado a fatura
  fatura_id uuid,
  parcela_atual int,
  parcela_total int,
  compra_pai_id uuid references financas_lancamentos(id) on delete cascade,

  -- Recorrência
  recorrencia_id uuid,

  -- Cross-link com tarefa
  tarefa_id uuid references tasks(id) on delete set null,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_lancamentos_data on financas_lancamentos(user_id, data desc);
create index idx_lancamentos_conta on financas_lancamentos(conta_id);
create index idx_lancamentos_categoria on financas_lancamentos(categoria_id);

-- =========================================
-- FATURAS DE CARTÃO
-- =========================================
create table financas_faturas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  cartao_id uuid references financas_cartoes(id) on delete cascade not null,
  mes_referencia date not null,
  data_fechamento date not null,
  data_vencimento date not null,
  valor_total numeric(14,2) default 0,
  paga boolean default false,
  data_pagamento date,
  created_at timestamptz default now(),
  unique (cartao_id, mes_referencia)
);

alter table financas_lancamentos
  add constraint fk_lancamento_fatura
  foreign key (fatura_id) references financas_faturas(id) on delete set null;

-- =========================================
-- RECORRÊNCIAS
-- =========================================
create table financas_recorrencias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  conta_id uuid references financas_contas(id) not null,
  categoria_id uuid references financas_categorias(id),
  descricao text not null,
  valor numeric(14,2) not null,
  tipo text not null check (tipo in ('receita','despesa')),
  frequencia text not null check (frequencia in ('diaria','semanal','quinzenal','mensal','bimestral','trimestral','semestral','anual')),
  dia_do_mes int check (dia_do_mes between 1 and 31),
  data_inicio date not null,
  data_fim date,
  proxima_geracao date not null,
  ativa boolean default true,
  gerar_como_pago boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table financas_lancamentos
  add constraint fk_lancamento_recorrencia
  foreign key (recorrencia_id) references financas_recorrencias(id) on delete set null;

-- =========================================
-- TAGS
-- =========================================
create table financas_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  nome text not null,
  cor text,
  created_at timestamptz default now(),
  unique (user_id, nome)
);

create table financas_lancamento_tags (
  lancamento_id uuid references financas_lancamentos(id) on delete cascade,
  tag_id uuid references financas_tags(id) on delete cascade,
  primary key (lancamento_id, tag_id)
);

-- =========================================
-- ORÇAMENTOS
-- =========================================
create table financas_orcamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  categoria_id uuid references financas_categorias(id) on delete cascade,
  mes_referencia date not null,
  valor_planejado numeric(14,2) not null,
  created_at timestamptz default now(),
  unique (user_id, categoria_id, mes_referencia)
);

-- =========================================
-- ROW LEVEL SECURITY
-- =========================================
alter table financas_contas enable row level security;
alter table financas_cartoes enable row level security;
alter table financas_categorias enable row level security;
alter table financas_lancamentos enable row level security;
alter table financas_faturas enable row level security;
alter table financas_recorrencias enable row level security;
alter table financas_tags enable row level security;
alter table financas_lancamento_tags enable row level security;
alter table financas_orcamentos enable row level security;

create policy "own_contas" on financas_contas for all using (auth.uid() = user_id);
create policy "own_cartoes" on financas_cartoes for all using (auth.uid() = user_id);
create policy "own_categorias" on financas_categorias for all using (auth.uid() = user_id);
create policy "own_lancamentos" on financas_lancamentos for all using (auth.uid() = user_id);
create policy "own_faturas" on financas_faturas for all using (auth.uid() = user_id);
create policy "own_recorrencias" on financas_recorrencias for all using (auth.uid() = user_id);
create policy "own_tags" on financas_tags for all using (auth.uid() = user_id);
create policy "own_orcamentos" on financas_orcamentos for all using (auth.uid() = user_id);
create policy "own_lancamento_tags" on financas_lancamento_tags for all using (
  exists (select 1 from financas_lancamentos l where l.id = lancamento_id and l.user_id = auth.uid())
);
