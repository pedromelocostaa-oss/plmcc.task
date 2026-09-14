import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, X, Tag } from "lucide-react";
import { toast } from "sonner";
import { useCategorias, useCreateCategoria, useUpdateCategoria, useDeleteCategoria, useSeedCategorias } from "../lib/queries";
import type { Categoria, CategoriaTipo } from "../lib/types";
import { colors, radius } from "@/lib/tokens";

const CAT_COLORS = ["#F59E0B", "#3B82F6", "#8B5CF6", "#EF4444", "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#10B981", "#6B7280"];

export function CategoriasView() {
  const [filtro, setFiltro] = useState<CategoriaTipo | undefined>(undefined);
  const { data: categorias = [], isLoading } = useCategorias(filtro);
  const createCat = useCreateCategoria();
  const updateCat = useUpdateCategoria();
  const deleteCat = useDeleteCategoria();
  const seedCat = useSeedCategorias();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<CategoriaTipo>("despesa");
  const [cor, setCor] = useState(CAT_COLORS[0]);
  const [icone, setIcone] = useState("");

  function resetForm() { setNome(""); setTipo("despesa"); setCor(CAT_COLORS[0]); setIcone(""); setShowForm(false); setEditingId(null); }

  function startEdit(c: Categoria) {
    setEditingId(c.id); setNome(c.nome); setTipo(c.tipo);
    setCor(c.cor ?? CAT_COLORS[0]); setIcone(c.icone ?? "");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    try {
      if (editingId) {
        await updateCat.mutateAsync({ id: editingId, data: { nome: nome.trim(), tipo, cor, icone: icone || undefined } });
        toast.success("Categoria atualizada");
      } else {
        await createCat.mutateAsync({ nome: nome.trim(), tipo, cor, icone: icone || undefined });
        toast.success("Categoria criada");
      }
      resetForm();
    } catch { toast.error("Erro ao salvar categoria"); }
  }

  async function handleDelete(id: string, nome: string) {
    try { await deleteCat.mutateAsync(id); toast.success(`"${nome}" removida`); }
    catch { toast.error("Erro ao remover categoria"); }
  }

  async function handleSeed() {
    try { await seedCat.mutateAsync(); toast.success("Categorias padrão criadas!"); }
    catch { toast.error("Erro ao criar categorias padrão"); }
  }

  const despesas = categorias.filter((c) => c.tipo === "despesa");
  const receitas = categorias.filter((c) => c.tipo === "receita");

  return (
    <div style={{ padding: "24px 16px 80px", maxWidth: 800, margin: "0 auto" }}>
      <style>{`
        .mm-card { background: var(--hq-surface); border: none; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05); }
        @media (prefers-color-scheme: dark) { .mm-card { box-shadow: 0 4px 16px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.25); } }
        .mm-cat-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; transition: background 0.15s; }
        .mm-cat-row:hover { background: var(--hq-surface-hover); }
        .mm-cat-row:hover .mm-actions { opacity: 1; }
        .mm-actions { opacity: 0; transition: opacity 0.15s; display: flex; gap: 4px; }
        .mm-seg-btn { padding: 6px 14px; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.15s; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em", margin: 0 }}>Categorias</h1>
          <p style={{ color: colors.textMuted, fontSize: 12, margin: "4px 0 0" }}>
            {categorias.length} categoria{categorias.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={primaryBtn}>
          <Plus size={14} /> Nova
        </button>
      </div>

      {/* Filter segmented */}
      <div style={{
        display: "inline-flex", background: colors.surface, borderRadius: 12, padding: 2, gap: 2,
        marginBottom: 20, border: `1px solid ${colors.border}`,
      }}>
        {([["all", "Todas"], ["despesa", "Despesas"], ["receita", "Receitas"]] as const).map(([val, label]) => {
          const active = filtro === undefined ? val === "all" : filtro === val;
          return (
            <button key={val} onClick={() => setFiltro(val === "all" ? undefined : val as CategoriaTipo)} className="mm-seg-btn" style={{
              background: active ? "#007AFF" : "transparent",
              color: active ? "#fff" : colors.textSecondary,
              fontWeight: active ? 600 : 400,
            }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Form */}
      {showForm && (
        <div className="mm-card" style={{ padding: 20, marginBottom: 20, border: `1px solid #007AFF40` }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{editingId ? "Editar categoria" : "Nova categoria"}</span>
              <button type="button" onClick={resetForm} style={iconBtn}><X size={16} /></button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input autoFocus required placeholder="Nome" value={nome}
                onChange={(e) => setNome(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              <input placeholder="Emoji" value={icone}
                onChange={(e) => setIcone(e.target.value)} style={{ ...inputStyle, width: 80, textAlign: "center" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ display: "flex", background: colors.bg, borderRadius: 12, padding: 3, gap: 2, flex: 1 }}>
                {(["despesa", "receita"] as CategoriaTipo[]).map((t) => (
                  <button key={t} type="button" onClick={() => setTipo(t)} className="mm-seg-btn" style={{
                    flex: 1,
                    background: tipo === t ? (t === "despesa" ? "#FF3B30" : "#34C759") : "transparent",
                    color: tipo === t ? "#fff" : colors.textSecondary,
                    fontWeight: tipo === t ? 600 : 400,
                  }}>
                    {t === "despesa" ? "Despesa" : "Receita"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: colors.textMuted }}>Cor:</span>
              {CAT_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setCor(c)} style={{
                  width: 24, height: 24, borderRadius: 12, background: c, cursor: "pointer",
                  border: cor === c ? "2.5px solid var(--hq-text)" : "2.5px solid transparent",
                }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" style={primaryBtn}>{editingId ? "Salvar" : "Criar"}</button>
              <button type="button" onClick={resetForm} style={ghostBtn}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Empty + seed */}
      {!isLoading && categorias.length === 0 && (
        <div className="mm-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(255,149,0,0.1)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
            <Tag size={26} color="#FF9500" style={{ opacity: 0.3 }} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Nenhuma categoria</div>
          <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16 }}>Comece com as padrão ou crie as suas</div>
          <button onClick={handleSeed} disabled={seedCat.isPending} style={primaryBtn}>
            {seedCat.isPending ? "Criando..." : "Criar categorias padrão"}
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map((i) => <div key={i} className="mm-card" style={{ height: 56 }} />)}
        </div>
      )}

      {/* Grouped list */}
      {!isLoading && categorias.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {(filtro === undefined || filtro === "despesa") && despesas.length > 0 && (
            <CatGroup label="Despesas" items={despesas} onEdit={startEdit} onDelete={handleDelete} />
          )}
          {(filtro === undefined || filtro === "receita") && receitas.length > 0 && (
            <CatGroup label="Receitas" items={receitas} onEdit={startEdit} onDelete={handleDelete} />
          )}
        </div>
      )}
    </div>
  );
}

function CatGroup({ label, items, onEdit, onDelete }: {
  label: string; items: Categoria[];
  onEdit: (c: Categoria) => void; onDelete: (id: string, nome: string) => void;
}) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.textMuted, marginBottom: 8, paddingLeft: 4 }}>
        {label} ({items.length})
      </div>
      <div className="mm-card" style={{ overflow: "hidden" }}>
        {items.map((c, i) => (
          <div key={c.id} className="mm-cat-row" style={{
            borderBottom: i < items.length - 1 ? `1px solid ${colors.border}` : "none",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: (c.cor ?? "#8E8E93") + "1A",
              display: "grid", placeItems: "center", fontSize: 18, flexShrink: 0,
            }}>
              {c.icone || "📂"}
            </div>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{c.nome}</div>
            <div style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 600,
              background: c.tipo === "receita" ? "#34C75918" : "#FF3B3018",
              color: c.tipo === "receita" ? "#34C759" : "#FF3B30",
            }}>
              {c.tipo}
            </div>
            <div className="mm-actions">
              <button onClick={() => onEdit(c)} style={iconBtn}><Pencil size={14} /></button>
              <button onClick={() => onDelete(c.id, c.nome)} style={{ ...iconBtn, color: "#FF3B30" }}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--hq-inlay-bg, var(--hq-bg))", border: `1px solid ${colors.border}`, color: colors.text,
  padding: "10px 12px", borderRadius: 10, fontSize: 14, width: "100%", boxSizing: "border-box",
};

const primaryBtn: React.CSSProperties = {
  background: "rgba(0,122,255,0.1)", color: "#007AFF", border: "none",
  padding: "8px 16px", borderRadius: 10, cursor: "pointer",
  fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6,
};

const ghostBtn: React.CSSProperties = {
  background: "transparent", color: colors.textSecondary, border: `1px solid ${colors.border}`,
  padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontSize: 13,
};

const iconBtn: React.CSSProperties = {
  background: "transparent", border: "none", color: colors.textSecondary,
  cursor: "pointer", padding: 6, borderRadius: 8, display: "flex", alignItems: "center",
};
