export type ContaTipo = "conta_corrente" | "poupanca" | "dinheiro" | "investimento" | "cartao_credito";

export type Conta = {
  id: string;
  user_id: string;
  nome: string;
  tipo: ContaTipo;
  saldo_inicial: number;
  cor: string | null;
  icone: string | null;
  ativa: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
};

export type Cartao = {
  id: string;
  conta_id: string;
  user_id: string;
  limite: number | null;
  dia_fechamento: number;
  dia_vencimento: number;
  bandeira: string | null;
  ultimos_digitos: string | null;
  created_at: string;
};

export type CategoriaTipo = "receita" | "despesa";

export type Categoria = {
  id: string;
  user_id: string;
  nome: string;
  tipo: CategoriaTipo;
  categoria_pai_id: string | null;
  cor: string | null;
  icone: string | null;
  ativa: boolean;
  created_at: string;
};

export type LancamentoTipo = "receita" | "despesa" | "transferencia";

export type Lancamento = {
  id: string;
  user_id: string;
  conta_id: string;
  categoria_id: string | null;
  descricao: string;
  valor: number;
  tipo: LancamentoTipo;
  data: string;
  data_pagamento: string | null;
  pago: boolean;
  observacao: string | null;
  conta_destino_id: string | null;
  fatura_id: string | null;
  parcela_atual: number | null;
  parcela_total: number | null;
  compra_pai_id: string | null;
  recorrencia_id: string | null;
  tarefa_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Fatura = {
  id: string;
  user_id: string;
  cartao_id: string;
  mes_referencia: string;
  data_fechamento: string;
  data_vencimento: string;
  valor_total: number;
  paga: boolean;
  data_pagamento: string | null;
  created_at: string;
};

export type RecorrenciaFrequencia =
  | "diaria" | "semanal" | "quinzenal" | "mensal"
  | "bimestral" | "trimestral" | "semestral" | "anual";

export type Recorrencia = {
  id: string;
  user_id: string;
  conta_id: string;
  categoria_id: string | null;
  descricao: string;
  valor: number;
  tipo: "receita" | "despesa";
  frequencia: RecorrenciaFrequencia;
  dia_do_mes: number | null;
  data_inicio: string;
  data_fim: string | null;
  proxima_geracao: string;
  ativa: boolean;
  gerar_como_pago: boolean;
  created_at: string;
  updated_at: string;
};

export type FinancaTag = {
  id: string;
  user_id: string;
  nome: string;
  cor: string | null;
  created_at: string;
};
