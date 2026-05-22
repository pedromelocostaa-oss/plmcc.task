import { useState, useEffect, useRef } from "react";
import { X, CheckSquare, Link as LinkIcon, FileText, ShoppingCart, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import {
  useProjects, useCreateTask, useCreateBookmark,
  useCreateNote, useCreatePurchase,
} from "@/lib/queries";
import { colors, spring, radius } from "@/lib/tokens";
import { useIsMobile } from "@/hooks/use-is-mobile";

type Tab = "task" | "bookmark" | "note" | "purchase";

interface Props { onClose: () => void; defaultTab?: Tab; }

const PRIORITIES = [
  { value: 1, label: "P1", color: "var(--hq-p1)", bg: "var(--hq-p1-bg)", desc: "Urgente" },
  { value: 2, label: "P2", color: "var(--hq-p2)", bg: "var(--hq-p2-bg)", desc: "Normal" },
  { value: 3, label: "P3", color: "var(--hq-p3)", bg: "var(--hq-p3-bg)", desc: "Baixa" },
];

const PURCHASE_CATEGORIES = [
  { value: "pessoal",  label: "Pessoal",  emoji: "🏠" },
  { value: "casa",     label: "Casa",     emoji: "🛋️" },
  { value: "trabalho", label: "Trabalho", emoji: "💼" },
  { value: "presente", label: "Presente", emoji: "🎁" },
  { value: "viagem",   label: "Viagem",   emoji: "✈️" },
  { value: "tech",     label: "Tech",     emoji: "💻" },
];

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "task",     label: "Tarefa",  icon: <CheckSquare size={13} /> },
  { id: "bookmark", label: "Link",    icon: <LinkIcon size={13} /> },
  { id: "note",     label: "Anotação", icon: <FileText size={13} /> },
  { id: "purchase", label: "Compra",  icon: <ShoppingCart size={13} /> },
];

function todayIso(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

interface Subtask {
  id: string;
  title: string;
}

export function QuickAddModal({ onClose, defaultTab = "task" }: Props) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const { data: projects = [] } = useProjects();
  const createTask = useCreateTask();
  const createBookmark = useCreateBookmark();
  const createNote = useCreateNote();
  const createPurchase = useCreatePurchase();
  const isMobile = useIsMobile();

  // Task form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskProject, setTaskProject] = useState("");
  const [taskDate, setTaskDate] = useState(todayIso());
  const [taskPriority, setTaskPriority] = useState<1 | 2 | 3>(2);
  const [taskRecurrence, setTaskRecurrence] = useState<"" | "daily" | "weekly" | "monthly">("");
  const [taskDesc, setTaskDesc] = useState("");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtaskInput, setSubtaskInput] = useState("");

  // Bookmark form
  const [bmUrl, setBmUrl] = useState("");
  const [bmTitle, setBmTitle] = useState("");
  const [bmTag, setBmTag] = useState("");

  // Note form
  const [noteTitle, setNoteTitle] = useState("");
  const [noteProject, setNoteProject] = useState<string | null>(null);
  const [noteBody, setNoteBody] = useState("");

  // Purchase form
  const [purchaseName, setPurchaseName] = useState("");
  const [purchaseLinks, setPurchaseLinks] = useState<{ id: string; url: string; label: string }[]>([
    { id: crypto.randomUUID(), url: "", label: "" },
  ]);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseQty, setPurchaseQty] = useState(1);
  const [purchaseCategory, setPurchaseCategory] = useState("pessoal");
  const [purchaseDesc, setPurchaseDesc] = useState("");

  const subtaskInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (taskProject || projects.length === 0) return;
    const blis = projects.find((p) => p.name.toLowerCase().includes("blis"));
    setTaskProject((blis ?? projects[0]).id);
  }, [projects, taskProject]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function addSubtask() {
    const t = subtaskInput.trim();
    if (!t) return;
    setSubtasks((s) => [...s, { id: crypto.randomUUID(), title: t }]);
    setSubtaskInput("");
  }

  function removeSubtask(id: string) {
    setSubtasks((s) => s.filter((st) => st.id !== id));
  }

  const RECURRENCES = [
    { value: "daily",   label: "Diário",   emoji: "🔁" },
    { value: "weekly",  label: "Semanal",  emoji: "📅" },
    { value: "monthly", label: "Mensal",   emoji: "🗓️" },
  ] as const;

  async function submitTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim() || !taskProject) return;
    try {
      await createTask.mutateAsync({
        title: taskTitle.trim(),
        project_id: taskProject,
        due_date: taskDate || null,
        priority: taskPriority,
        description: taskDesc.trim() || null,
        status: "todo",
        recurrence: taskRecurrence || null,
      });
      toast.success("Tarefa criada!");
      setTaskRecurrence("");
      onClose();
    } catch {
      toast.error("Erro ao criar tarefa");
    }
  }

  async function submitBookmark(e: React.FormEvent) {
    e.preventDefault();
    if (!bmUrl.trim()) return;
    try {
      let url = bmUrl.trim();
      if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
      const autoTitle = bmTitle.trim() || new URL(url).hostname;
      await createBookmark.mutateAsync({ url, title: autoTitle, tag: bmTag.trim() });
      toast.success("Link salvo!");
      onClose();
    } catch {
      toast.error("Erro ao salvar link");
    }
  }

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteTitle.trim()) return;
    try {
      await createNote.mutateAsync({
        title: noteTitle.trim(),
        body: noteBody.trim(),
        project_id: noteProject,
      });
      toast.success("Anotação criada!");
      onClose();
    } catch {
      toast.error("Erro ao criar anotação");
    }
  }

  function addPurchaseLink() {
    setPurchaseLinks((ls) => [...ls, { id: crypto.randomUUID(), url: "", label: "" }]);
  }
  function removePurchaseLink(id: string) {
    setPurchaseLinks((ls) => ls.length > 1 ? ls.filter((l) => l.id !== id) : ls);
  }
  function updatePurchaseLink(id: string, field: "url" | "label", value: string) {
    setPurchaseLinks((ls) => ls.map((l) => l.id === id ? { ...l, [field]: value } : l));
  }

  async function submitPurchase(e: React.FormEvent) {
    e.preventDefault();
    if (!purchaseName.trim()) return;
    try {
      const priceCents = purchasePrice
        ? Math.round(parseFloat(purchasePrice.replace(",", ".")) * 100)
        : 0;

      // Normalize & filter non-empty links
      const validLinks = purchaseLinks
        .filter((l) => l.url.trim())
        .map((l) => {
          let url = l.url.trim();
          if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
          return { url, label: l.label.trim() };
        });

      await createPurchase.mutateAsync({
        name: purchaseName.trim(),
        urls: validLinks,
        url: validLinks[0]?.url ?? null,    // first link kept in legacy column
        price_cents: priceCents,
        qty: purchaseQty,
        category: purchaseCategory,
        description: purchaseDesc.trim() || null,
      });
      toast.success("Adicionado à lista de compras!");
      onClose();
    } catch {
      toast.error("Erro ao adicionar compra");
    }
  }

  const modalStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "flex-end",
        zIndex: 300,
        background: "var(--hq-overlay)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }
    : {
        position: "fixed",
        inset: 0,
        background: "var(--hq-overlay)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      };

  const innerStyle: React.CSSProperties = isMobile
    ? {
        width: "100%",
        maxHeight: "90dvh",
        background: "var(--hq-modal-bg)",
        backdropFilter: "blur(30px) saturate(1.8)",
        WebkitBackdropFilter: "blur(30px) saturate(1.8)",
        border: "1px solid var(--hq-card-border)",
        borderRadius: "18px 18px 0 0",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }
    : {
        width: 460,
        maxWidth: "calc(100vw - 32px)",
        maxHeight: "90dvh",
        background: "var(--hq-modal-bg)",
        backdropFilter: "blur(30px) saturate(1.8)",
        WebkitBackdropFilter: "blur(30px) saturate(1.8)",
        border: "1px solid var(--hq-card-border)",
        borderRadius: radius.xl,
        boxShadow: "var(--hq-shadow-float)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        animation: "modalIn 0.22s cubic-bezier(0.2,0.85,0.25,1)",
      };

  return (
    <div onClick={onClose} style={modalStyle}>
      <style>{`
        @keyframes modalIn {
          from { opacity:0; transform:scale(0.94) translateY(-10px); }
          to { opacity:1; transform:scale(1) translateY(0); }
        }
      `}</style>
      <div onClick={(e) => e.stopPropagation()} style={innerStyle}>

        {/* iOS drag handle (mobile) */}
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--hq-separator-opaque)" }} />
          </div>
        )}

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 18px 0",
        }}>
          <h2 style={{ flex: 1, fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
            Adicionar
          </h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: colors.textMuted, cursor: "pointer", padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "12px 18px 0", flexWrap: "wrap" }}>
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 12px",
                background: tab === id ? colors.accentSoft : "transparent",
                border: tab === id ? `1px solid var(--hq-accent-border)` : `1px solid transparent`,
                borderRadius: radius.sm,
                color: tab === id ? colors.accent : colors.textSecondary,
                cursor: "pointer",
                fontSize: 12, fontWeight: tab === id ? 600 : 400,
                transition: `all 0.15s ${spring.gentle}`,
              }}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: "16px 18px 20px", overflowY: "auto" }}>

          {/* ── TASK ── */}
          {tab === "task" && (
            <form onSubmit={submitTask} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={labelStyle}>Título *</label>
                <input
                  autoFocus
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="O que precisa ser feito?"
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Projeto *</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                  {projects.filter((p) => !p.archived).map((p) => {
                    const active = taskProject === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setTaskProject(p.id)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          padding: "5px 11px",
                          background: active ? `${p.color}20` : "var(--hq-inlay-bg)",
                          border: active
                            ? `1.5px solid ${p.color}70`
                            : `1px solid var(--hq-border)`,
                          borderRadius: radius.full,
                          color: active ? p.color : colors.textSecondary,
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: active ? 700 : 400,
                          transition: `all 0.15s ${spring.gentle}`,
                          boxShadow: active ? `0 0 6px ${p.color}40` : "none",
                        }}
                      >
                        <span style={{
                          width: 7, height: 7, borderRadius: "50%",
                          background: p.color, flexShrink: 0,
                        }} />
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Data de vencimento</label>
                  <input
                    type="date"
                    value={taskDate}
                    onChange={(e) => setTaskDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Prioridade</label>
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    {PRIORITIES.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setTaskPriority(p.value as 1 | 2 | 3)}
                        title={p.desc}
                        style={{
                          padding: "5px 10px",
                          background: taskPriority === p.value ? p.bg : "transparent",
                          border: taskPriority === p.value ? `1px solid ${p.color}50` : `1px solid var(--hq-border)`,
                          borderRadius: radius.sm,
                          color: taskPriority === p.value ? p.color : colors.textSecondary,
                          cursor: "pointer",
                          fontSize: 11, fontWeight: 700,
                          fontFamily: '"SF Mono", ui-monospace, monospace',
                          transition: `all 0.15s ${spring.gentle}`,
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 0 }}>
                <label style={labelStyle}>Recorrência</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                  {RECURRENCES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setTaskRecurrence((prev) => prev === r.value ? "" : r.value)}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: "pointer",
                        background: taskRecurrence === r.value ? "var(--hq-accent-bg)" : "var(--hq-inlay-bg)",
                        border: `1px solid ${taskRecurrence === r.value ? "var(--hq-accent-border)" : "var(--hq-border)"}`,
                        color: taskRecurrence === r.value ? "var(--hq-accent)" : colors.textSecondary,
                        transition: "all 0.15s",
                      }}
                    >
                      <span>{r.emoji}</span> {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Descrição (opcional)</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Detalhes, contexto..."
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                />
              </div>

              {/* Subtasks */}
              <div>
                <label style={labelStyle}>
                  Subtarefas (opcional)
                  {subtasks.length > 0 && (
                    <span style={{ fontFamily: '"SF Mono", ui-monospace, monospace', fontWeight: 600, marginLeft: 6 }}>
                      {subtasks.length}
                    </span>
                  )}
                </label>
                {subtasks.map((st) => (
                  <div key={st.id} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 0", borderBottom: `1px solid var(--hq-border)`,
                  }}>
                    <span style={{
                      width: 16, height: 16, borderRadius: "50%",
                      border: `1.5px solid var(--hq-border)`, flexShrink: 0,
                    }} />
                    <span style={{ flex: 1, fontSize: 13, color: colors.text }}>{st.title}</span>
                    <button
                      type="button"
                      onClick={() => removeSubtask(st.id)}
                      style={{ background: "none", border: "none", color: colors.textMuted, cursor: "pointer", padding: 2 }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <span style={{
                    width: 16, height: 16, borderRadius: "50%",
                    border: `1.5px dashed var(--hq-border)`, flexShrink: 0,
                  }} />
                  <input
                    ref={subtaskInputRef}
                    value={subtaskInput}
                    onChange={(e) => setSubtaskInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
                    placeholder="+ Adicionar subtarefa (Enter)"
                    style={{
                      flex: 1, background: "transparent", border: "none",
                      color: colors.textMuted, fontSize: 12,
                      borderBottom: `1px dashed var(--hq-border)`,
                      padding: "4px 0",
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!taskTitle.trim() || !taskProject || createTask.isPending}
                style={submitBtnStyle}
              >
                {createTask.isPending ? "Criando..." : "Criar tarefa"}
              </button>
            </form>
          )}

          {/* ── BOOKMARK ── */}
          {tab === "bookmark" && (
            <form onSubmit={submitBookmark} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={labelStyle}>URL *</label>
                <input
                  autoFocus
                  type="url"
                  value={bmUrl}
                  onChange={(e) => setBmUrl(e.target.value)}
                  placeholder="https://..."
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Título (opcional)</label>
                <input
                  value={bmTitle}
                  onChange={(e) => setBmTitle(e.target.value)}
                  placeholder="Ex: Documentação React"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Tag / Categoria</label>
                <input
                  value={bmTag}
                  onChange={(e) => setBmTag(e.target.value)}
                  placeholder="Ex: dev, design, artigos..."
                  style={inputStyle}
                />
              </div>

              <button
                type="submit"
                disabled={!bmUrl.trim() || createBookmark.isPending}
                style={submitBtnStyle}
              >
                {createBookmark.isPending ? "Salvando..." : "Salvar link"}
              </button>
            </form>
          )}

          {/* ── NOTE ── */}
          {tab === "note" && (
            <form onSubmit={submitNote} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={labelStyle}>Título *</label>
                <input
                  autoFocus
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Título da anotação"
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Projeto (opcional)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setNoteProject(null)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "5px 11px",
                      background: noteProject === null ? colors.accentSoft : "var(--hq-inlay-bg)",
                      border: noteProject === null ? `1.5px solid var(--hq-accent-border)` : `1px solid var(--hq-border)`,
                      borderRadius: radius.full,
                      color: noteProject === null ? colors.accent : colors.textSecondary,
                      cursor: "pointer", fontSize: 12, fontWeight: noteProject === null ? 600 : 400,
                    }}
                  >
                    Sem projeto
                  </button>
                  {projects.filter((p) => !p.archived).map((p) => {
                    const active = noteProject === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setNoteProject(p.id)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          padding: "5px 11px",
                          background: active ? `${p.color}20` : "var(--hq-inlay-bg)",
                          border: active ? `1.5px solid ${p.color}70` : `1px solid var(--hq-border)`,
                          borderRadius: radius.full,
                          color: active ? p.color : colors.textSecondary,
                          cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 400,
                        }}
                      >
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color }} />
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Conteúdo</label>
                <textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Escreva aqui..."
                  rows={5}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6, minHeight: 110 }}
                />
              </div>

              <button
                type="submit"
                disabled={!noteTitle.trim() || createNote.isPending}
                style={submitBtnStyle}
              >
                {createNote.isPending ? "Salvando..." : "Salvar anotação"}
              </button>
            </form>
          )}

          {/* ── PURCHASE ── */}
          {tab === "purchase" && (
            <form onSubmit={submitPurchase} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={labelStyle}>Produto *</label>
                <input
                  autoFocus
                  value={purchaseName}
                  onChange={(e) => setPurchaseName(e.target.value)}
                  placeholder="Nome do produto"
                  required
                  style={inputStyle}
                />
              </div>

              {/* Multi-link section */}
              <div>
                <label style={labelStyle}>Links das lojas (opcional)</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                  {purchaseLinks.map((link, idx) => (
                    <div key={link.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                        <input
                          value={link.url}
                          onChange={(e) => updatePurchaseLink(link.id, "url", e.target.value)}
                          placeholder={`https://... (loja ${idx + 1})`}
                          style={{ ...inputStyle, marginBottom: 0 }}
                        />
                        <input
                          value={link.label}
                          onChange={(e) => updatePurchaseLink(link.id, "label", e.target.value)}
                          placeholder="Nome da loja (ex: Amazon, Shopee...)"
                          style={{
                            ...inputStyle,
                            fontSize: 11,
                            padding: "5px 10px",
                            color: colors.textSecondary,
                          }}
                        />
                      </div>
                      {purchaseLinks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePurchaseLink(link.id)}
                          style={{
                            background: "none", border: "none",
                            color: colors.textMuted, cursor: "pointer",
                            padding: 4, flexShrink: 0,
                          }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addPurchaseLink}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      background: "none", border: `1px dashed var(--hq-border)`,
                      borderRadius: radius.md, color: colors.textMuted,
                      cursor: "pointer", fontSize: 12, padding: "6px 12px",
                      alignSelf: "flex-start",
                      transition: `all 0.15s ${spring.gentle}`,
                    }}
                  >
                    <Plus size={12} /> Adicionar outro link
                  </button>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Descrição (opcional)</label>
                <textarea
                  value={purchaseDesc}
                  onChange={(e) => setPurchaseDesc(e.target.value)}
                  placeholder="Cor, tamanho, referência, observações..."
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Preço estimado</label>
                  <div style={{ position: "relative" }}>
                    <span style={{
                      position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                      fontSize: 13, color: colors.textMuted, pointerEvents: "none",
                    }}>R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      placeholder="0,00"
                      style={{ ...inputStyle, paddingLeft: 32 }}
                    />
                  </div>
                </div>

                <div style={{ width: 100 }}>
                  <label style={labelStyle}>Qtd.</label>
                  <div style={{
                    display: "flex", alignItems: "center",
                    background: "var(--hq-inlay-bg)",
                    border: `1px solid var(--hq-border)`,
                    borderRadius: radius.md,
                    overflow: "hidden",
                    height: 36,
                  }}>
                    <button
                      type="button"
                      onClick={() => setPurchaseQty((q) => Math.max(1, q - 1))}
                      style={{
                        flex: 1, background: "none", border: "none",
                        color: colors.textMuted, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        padding: 0, height: "100%",
                      }}
                    >
                      <Minus size={12} />
                    </button>
                    <span style={{
                      width: 32, textAlign: "center", fontSize: 13, fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                    }}>{purchaseQty}</span>
                    <button
                      type="button"
                      onClick={() => setPurchaseQty((q) => q + 1)}
                      style={{
                        flex: 1, background: "none", border: "none",
                        color: colors.textMuted, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        padding: 0, height: "100%",
                      }}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Categoria</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                  {PURCHASE_CATEGORIES.map((cat) => {
                    const active = purchaseCategory === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setPurchaseCategory(cat.value)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "5px 11px",
                          background: active ? colors.accentSoft : "var(--hq-inlay-bg)",
                          border: active ? `1.5px solid var(--hq-accent-border)` : `1px solid var(--hq-border)`,
                          borderRadius: radius.full,
                          color: active ? colors.accent : colors.textSecondary,
                          cursor: "pointer", fontSize: 12, fontWeight: active ? 600 : 400,
                          transition: `all 0.15s ${spring.gentle}`,
                        }}
                      >
                        <span>{cat.emoji}</span>
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={!purchaseName.trim() || createPurchase.isPending}
                style={submitBtnStyle}
              >
                {createPurchase.isPending ? "Adicionando..." : "Adicionar à lista de compras"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: colors.textMuted,
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--hq-inlay-bg)",
  border: `1px solid var(--hq-border)`,
  color: colors.text,
  padding: "8px 10px",
  borderRadius: "8px",
  fontSize: 13,
  boxSizing: "border-box",
};

const submitBtnStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--hq-accent)",
  color: "#fff",
  border: "none",
  padding: "11px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  marginTop: 4,
};
