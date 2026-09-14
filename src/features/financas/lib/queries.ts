import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Conta, Categoria, Lancamento } from "./types";

// ── Contas ──────────────────────────────────────────────────────────────────

export function useContas() {
  return useQuery({
    queryKey: ["financas", "contas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financas_contas")
        .select("*")
        .eq("ativa", true)
        .order("ordem");
      if (error) throw error;
      return data as Conta[];
    },
  });
}

// ── Categorias ──────────────────────────────────────────────────────────────

export function useCategorias() {
  return useQuery({
    queryKey: ["financas", "categorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financas_categorias")
        .select("*")
        .eq("ativa", true)
        .order("nome");
      if (error) throw error;
      return data as Categoria[];
    },
  });
}

// ── Lançamentos ─────────────────────────────────────────────────────────────

export function useLancamentos(filters?: { mes?: string; conta_id?: string }) {
  return useQuery({
    queryKey: ["financas", "lancamentos", filters],
    queryFn: async () => {
      let q = supabase
        .from("financas_lancamentos")
        .select("*, categoria:financas_categorias(*), conta:financas_contas(*)")
        .order("data", { ascending: false });

      if (filters?.conta_id) q = q.eq("conta_id", filters.conta_id);
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
