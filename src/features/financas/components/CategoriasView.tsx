import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { useCategorias, useCreateCategoria, useUpdateCategoria, useDeleteCategoria, useSeedCategorias } from "../lib/queries";
import type { Categoria, CategoriaTipo } from "../lib/types";
import { colors, radius } from "@/lib/tokens";

const TIPO_OPTIONS: { value: CategoriaTipo | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "despesa", label: "Despesas" },
  { value: "receita", label: "Receitas" },
];

const CAT_COLORS = ["#FF9500", "#FF6B35", "#5856D6", "#FF3B30", "#0A84FF", "#BF5AF2", "#64D2FF", "#30D158", "#8E8E93", "#636366"];

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
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!isLoading && categorias.length === 0 && !seeded) {
      setSeeded(true);
    }
  }, [isLoading, categorias.length, seeded]);

  function resetForm() {
    setNome(""); setTipo("despesa"); setCor(CAT_COLORS[0]); setIcone("");
    setShowForm(false); setEditingId(null);
  }

  function startEdit(c: Categoria) {
    setEditingId(c.id);
    setNome(c.nome);
    setTipo(c.tipo);
    setCor(c.cor ?? CAT_COLORS[0]);
    setIcone(c.icone ?? "");
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
    } catch {
      toast.error("Erro ao salvar categoria");
    }
  }

  async function handleDelete(id: string, nome: string) {
    try {
      await deleteCat.mutateAsync(id);
      toast.success(`"${nome}" removida`);
    } catch {
      toast.error("Erro ao remover categoria");
    }
  }

  async function handleSeed() {
    try {
      await seedCat.mutateAsync();
      toast.success("Categorias padrão criadas!");
    } catch {
      toast.error("Erro ao criar categorias padrão");
    }
  }

  const despesas = categorias.filter((c) => c.tipo === "despesa");
  const receitas = categorias.filter((c) => c.tipo === "receita");

  return (
    <div style={{ padding: 32, maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Categorias</h1>
          <p style={{ color: colors.textSecondary, fontSize: 13, margin: "4px 0 0" }}>
            {categorias.length} categoria{categorias.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={accentBtn}>
          <Plus size={14} /> Nova categoria
        </button>
      </div>

      {/* Filtro */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {TIPO_OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => setFiltro(o.value === "all" ? undefined : o.value)}
            style={{
              ...chipStyle,
              background: (filtro === undefined ? o.value === "all" : filtro === o.value) ? colors.accent : colors.surface,
              color: (filtro === undefined ? o.value === "all" : filtro === o.value) ? "#fff" : colors.textSecondary,
            }}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{
          background: colors.surface, border: `1px solid ${colors.accent}`, borderRadius: radius.md,
          padding: 20, marginBottom: 20, display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{editingId ? "Editar categoria" : "Nova categoria"}</span>
            <button type="button" onClick={resetForm} style={iconBtn}><X size={16} /></button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              autoFocus required placeholder="Nome da categoria" value={nome}
              onChange={(e) => setNome(e.target.value)} style={{ ...inputStyle, flex: 1 }}
            />
            <input
              placeholder="Ícone (emoji)" value={icone}
              onChange={(e) => setIcone(e.target.value)} style={{ ...inputStyle, width: 100, textAlign: "center" }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as CategoriaTipo)} style={{ ...inputStyle, flex: 1 }}>
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: colors.textMuted }}>Cor:</span>
            {CAT_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setCor(c)} style={{
                width: 22, height: 22, borderRadius: 11, background: c, cursor: "pointer",
                border: cor === c ? "2px solid var(--hq-text)" : "2px solid transparent",
              }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" style={accentBtn}>{editingId ? "Salvar" : "Criar"}</button>
            <button type="button" onClick={resetForm} style={ghostBtn}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Empty + seed */}
      {!isLoading && categorias.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: colors.textMuted }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏷️</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Nenhuma categoria</div>
          <div style={{ fontSize: 13, marginBottom: 16 }}>Comece com as categorias padrão ou crie as suas</div>
          <button onClick={handleSeed} disabled={seedCat.isPending} style={accentBtn}>
            {seedCat.isPending ? "Criando..." : "Criar categorias padrão"}
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 52, background: colors.surface, borderRadius: radius.md }} />
          ))}
        </div>
      )}

      {/* Lista agrupada */}
      {!isLoading && categorias.length > 0 && (
        <>
          {(filtro === undefined || filtro === "despesa") && despesas.length > 0 && (
            <CatGroup label="Despesas" items={despesas} onEdit={startEdit} onDelete={handleDelete} />
          )}
          {(filtro === undefined || filtro === "receita") && receitas.length > 0 && (
            <CatGroup label="Receitas" items={receitas} onEdit={startEdit} onDelete={handleDelete} />
          )}
        </>
      )}
    </div>
  );
}

function CatGroup({ label, items, onEdit, onDelete }: {
  label: string; items: Categoria[];
  onEdit: (c: Categoria) => void; onDelete: (id: string, nome: string) => void;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
        {label} ({items.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((c) => (
          <CatRow key={c.id} cat={c} onEdit={() => onEdit(c)} onDelete={() => onDelete(c.id, c.nome)} />
        ))}
      </div>
    </div>
  );
}

function CatRow({ cat, onEdit, onDelete }: { cat: Categoria; onEdit: () => void; onDelete: () => void }) {
  const [hov, setHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? colors.surfaceHover : colors.surface,
        border: `1px solid ${colors.border}`, borderRadius: radius.sm,
        padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
        transition: "background 0.15s",
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: (cat.cor ?? "#8E8E93") + "18",
        display: "grid", placeItems: "center", fontSize: 16, flexShrink: 0,
      }}>
        {cat.icone || "📂"}
      </div>
      <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{cat.nome}</div>
      <div style={{
        fontSize: 11, padding: "2px 8px", borderRadius: 99,
        background: cat.tipo === "receita" ? "#30D15818" : "#FF950018",
        color: cat.tipo === "receita" ? "#30D158" : "#FF9500",
        fontWeight: 600,
      }}>
        {cat.tipo}
      </div>
      {hov && (
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={onEdit} style={iconBtn}><Pencil size={14} /></button>
          <button onClick={onDelete} style={{ ...iconBtn, color: colors.danger }}><Trash2 size={14} /></button>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text,
  padding: "9px 12px", borderRadius: radius.sm, fontSize: 13, width: "100%", boxSizing: "border-box",
};

const accentBtn: React.CSSProperties = {
  background: colors.accent, color: "#fff", border: "none",
  padding: "8px 14px", borderRadius: radius.sm, cursor: "pointer",
  fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6,
};

const ghostBtn: React.CSSProperties = {
  background: "transparent", color: colors.textSecondary, border: `1px solid ${colors.border}`,
  padding: "7px 14px", borderRadius: radius.sm, cursor: "pointer", fontSize: 13,
};

const iconBtn: React.CSSProperties = {
  background: "transparent", border: "none", color: colors.textSecondary,
  cursor: "pointer", padding: 4, borderRadius: 6, display: "flex", alignItems: "center",
};

const chipStyle: React.CSSProperties = {
  border: "none", padding: "6px 14px", borderRadius: 99, cursor: "pointer",
  fontSize: 12, fontWeight: 600, transition: "all 0.15s",
};
