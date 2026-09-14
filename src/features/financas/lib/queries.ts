import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Conta, ContaTipo, Categoria, CategoriaTipo, Lancamento, Cartao, Fatura, Recorrencia, RecorrenciaFrequencia } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ── Query keys ──────────────────────────────────────────────────────────────

export const FQK = {
  contas: ["financas", "contas"] as const,
  categorias: ["financas", "categorias"] as const,
  lancamentos: (filters?: Record<string, unknown>) => ["financas", "lancamentos", filters ?? {}] as const,
  resumo: (mes?: string) => ["financas", "resumo", mes ?? ""] as const,
  cartoes: ["financas", "cartoes"] as const,
  faturas: (cartaoId?: string) => ["financas", "faturas", cartaoId ?? ""] as const,
  recorrencias: ["financas", "recorrencias"] as const,
} as const;

// ── Contas ──────────────────────────────────────────────────────────────────

export function useContas() {
  return useQuery({
    queryKey: FQK.contas,
    queryFn: async () => {
      const { data, error } = await db
        .from("financas_contas")
        .select("*")
        .eq("ativa", true)
        .order("ordem");
      if (error) throw error;
      return data as Conta[];
    },
  });
}

export function useCreateConta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { nome: string; tipo: ContaTipo; saldo_inicial?: number; cor?: string; icone?: string }) => {
      const { data, error } = await db
        .from("financas_contas")
        .insert({ ...input, saldo_inicial: input.saldo_inicial ?? 0 })
        .select()
        .single();
      if (error) throw error;
      return data as Conta;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FQK.contas }),
  });
}

export function useUpdateConta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Pick<Conta, "nome" | "tipo" | "saldo_inicial" | "cor" | "icone" | "ativa" | "ordem">> }) => {
      const { error } = await db
        .from("financas_contas")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FQK.contas }),
  });
}

export function useDeleteConta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("financas_contas").update({ ativa: false, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FQK.contas }),
  });
}

// ── Categorias ──────────────────────────────────────────────────────────────

export function useCategorias(tipo?: CategoriaTipo) {
  return useQuery({
    queryKey: [...FQK.categorias, tipo ?? "all"],
    queryFn: async () => {
      let q = db
        .from("financas_categorias")
        .select("*")
        .eq("ativa", true)
        .order("tipo")
        .order("nome");
      if (tipo) q = q.eq("tipo", tipo);
      const { data, error } = await q;
      if (error) throw error;
      return data as Categoria[];
    },
  });
}

export function useCreateCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { nome: string; tipo: CategoriaTipo; cor?: string; icone?: string; categoria_pai_id?: string }) => {
      const { data, error } = await db
        .from("financas_categorias")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Categoria;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FQK.categorias }),
  });
}

export function useUpdateCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Pick<Categoria, "nome" | "tipo" | "cor" | "icone" | "ativa" | "categoria_pai_id">> }) => {
      const { error } = await db
        .from("financas_categorias")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FQK.categorias }),
  });
}

export function useDeleteCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("financas_categorias").update({ ativa: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FQK.categorias }),
  });
}

export function useSeedCategorias() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const seed: { nome: string; tipo: CategoriaTipo; cor: string; icone: string }[] = [
        { nome: "Moradia", tipo: "despesa", cor: "#FF9500", icone: "🏠" },
        { nome: "Alimentação", tipo: "despesa", cor: "#FF6B35", icone: "🍽️" },
        { nome: "Transporte", tipo: "despesa", cor: "#5856D6", icone: "🚗" },
        { nome: "Saúde", tipo: "despesa", cor: "#FF3B30", icone: "💊" },
        { nome: "Educação", tipo: "despesa", cor: "#0A84FF", icone: "📚" },
        { nome: "Lazer", tipo: "despesa", cor: "#BF5AF2", icone: "🎮" },
        { nome: "Assinaturas", tipo: "despesa", cor: "#64D2FF", icone: "📱" },
        { nome: "Impostos", tipo: "despesa", cor: "#8E8E93", icone: "🏛️" },
        { nome: "Outros (despesa)", tipo: "despesa", cor: "#636366", icone: "📦" },
        { nome: "Salário", tipo: "receita", cor: "#30D158", icone: "💰" },
        { nome: "Freelance", tipo: "receita", cor: "#34C759", icone: "💻" },
        { nome: "Investimentos", tipo: "receita", cor: "#0A84FF", icone: "📈" },
        { nome: "Reembolso", tipo: "receita", cor: "#FF9F0A", icone: "🔄" },
        { nome: "Outros (receita)", tipo: "receita", cor: "#636366", icone: "📥" },
      ];
      const { error } = await db.from("financas_categorias").insert(seed);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FQK.categorias }),
  });
}

// ── Lançamentos ─────────────────────────────────────────────────────────────

export function useLancamentos(filters?: { mes?: string; conta_id?: string; categoria_id?: string; tipo?: string; pago?: boolean }) {
  return useQuery({
    queryKey: FQK.lancamentos(filters as Record<string, unknown>),
    queryFn: async () => {
      let q = db
        .from("financas_lancamentos")
        .select("*, categoria:financas_categorias(*), conta:financas_contas(*)")
        .order("data", { ascending: false })
        .limit(100);

      if (filters?.conta_id) q = q.eq("conta_id", filters.conta_id);
      if (filters?.categoria_id) q = q.eq("categoria_id", filters.categoria_id);
      if (filters?.tipo) q = q.eq("tipo", filters.tipo);
      if (filters?.pago !== undefined) q = q.eq("pago", filters.pago);
      if (filters?.mes) {
        const start = `${filters.mes}-01`;
        const [y, m] = filters.mes.split("-").map(Number);
        const end = new Date(y, m, 0).toISOString().slice(0, 10);
        q = q.gte("data", start).lte("data", end);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as (Lancamento & { categoria: Categoria | null; conta: Conta })[];
    },
  });
}

export function useCreateLancamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Lancamento, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { data, error } = await db
        .from("financas_lancamentos")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Lancamento;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financas", "lancamentos"] });
      qc.invalidateQueries({ queryKey: ["financas", "resumo"] });
    },
  });
}

export function useUpdateLancamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Lancamento> }) => {
      const { error } = await db
        .from("financas_lancamentos")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financas", "lancamentos"] });
      qc.invalidateQueries({ queryKey: ["financas", "resumo"] });
    },
  });
}

export function useDeleteLancamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("financas_lancamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financas", "lancamentos"] });
      qc.invalidateQueries({ queryKey: ["financas", "resumo"] });
    },
  });
}

// ── Resumo do mês ───────────────────────────────────────────────────────────

export function useResumoMes(mes?: string) {
  const mesAtual = mes ?? new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 7);
  return useQuery({
    queryKey: FQK.resumo(mesAtual),
    queryFn: async () => {
      const start = `${mesAtual}-01`;
      const [y, m] = mesAtual.split("-").map(Number);
      const end = new Date(y, m, 0).toISOString().slice(0, 10);

      const { data, error } = await db
        .from("financas_lancamentos")
        .select("tipo, valor, pago")
        .gte("data", start)
        .lte("data", end);
      if (error) throw error;

      const rows = data as { tipo: string; valor: number; pago: boolean }[];
      let receitas = 0, despesas = 0;
      for (const r of rows) {
        if (r.tipo === "receita") receitas += Number(r.valor);
        else if (r.tipo === "despesa") despesas += Number(r.valor);
      }
      return { receitas, despesas, saldo: receitas - despesas, total: rows.length };
    },
  });
}

// ── Cartões ────────────────────────────────────────────────────────────────

export function useCartoes() {
  return useQuery({
    queryKey: FQK.cartoes,
    queryFn: async () => {
      const { data, error } = await db
        .from("financas_cartoes")
        .select("*, conta:financas_contas(*)")
        .order("created_at");
      if (error) throw error;
      return data as (Cartao & { conta: Conta })[];
    },
  });
}

export function useCreateCartao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      conta_id: string; limite?: number; dia_fechamento: number;
      dia_vencimento: number; bandeira?: string; ultimos_digitos?: string;
    }) => {
      const { data, error } = await db
        .from("financas_cartoes")
        .insert(input)
        .select("*, conta:financas_contas(*)")
        .single();
      if (error) throw error;
      return data as Cartao & { conta: Conta };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FQK.cartoes }),
  });
}

export function useUpdateCartao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Pick<Cartao, "limite" | "dia_fechamento" | "dia_vencimento" | "bandeira" | "ultimos_digitos">> }) => {
      const { error } = await db.from("financas_cartoes").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FQK.cartoes }),
  });
}

export function useDeleteCartao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("financas_cartoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FQK.cartoes }),
  });
}

// ── Faturas ────────────────────────────────────────────────────────────────

export function useFaturas(cartaoId?: string) {
  return useQuery({
    queryKey: FQK.faturas(cartaoId),
    enabled: !!cartaoId,
    queryFn: async () => {
      const { data, error } = await db
        .from("financas_faturas")
        .select("*")
        .eq("cartao_id", cartaoId)
        .order("mes_referencia", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data as Fatura[];
    },
  });
}

export function useCreateFatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Fatura, "id" | "user_id" | "created_at">) => {
      const { data, error } = await db
        .from("financas_faturas")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Fatura;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["financas", "faturas"] }),
  });
}

export function useUpdateFatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Pick<Fatura, "paga" | "data_pagamento" | "valor_total">> }) => {
      const { error } = await db.from("financas_faturas").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["financas", "faturas"] }),
  });
}

// ── Recorrências ───────────────────────────────────────────────────────────

export function useRecorrencias() {
  return useQuery({
    queryKey: FQK.recorrencias,
    queryFn: async () => {
      const { data, error } = await db
        .from("financas_recorrencias")
        .select("*, conta:financas_contas(*), categoria:financas_categorias(*)")
        .eq("ativa", true)
        .order("proxima_geracao");
      if (error) throw error;
      return data as (Recorrencia & { conta: Conta; categoria: Categoria | null })[];
    },
  });
}

export function useCreateRecorrencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      conta_id: string; categoria_id?: string; descricao: string; valor: number;
      tipo: "receita" | "despesa"; frequencia: RecorrenciaFrequencia;
      dia_do_mes?: number; data_inicio: string; data_fim?: string; gerar_como_pago?: boolean;
    }) => {
      const proxima_geracao = input.data_inicio;
      const { data, error } = await db
        .from("financas_recorrencias")
        .insert({ ...input, proxima_geracao })
        .select("*, conta:financas_contas(*), categoria:financas_categorias(*)")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FQK.recorrencias }),
  });
}

export function useUpdateRecorrencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Recorrencia> }) => {
      const { error } = await db
        .from("financas_recorrencias")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FQK.recorrencias }),
  });
}

export function useDeleteRecorrencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("financas_recorrencias")
        .update({ ativa: false, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FQK.recorrencias }),
  });
}
