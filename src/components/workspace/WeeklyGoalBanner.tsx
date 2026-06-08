import { useState, useRef, useEffect } from "react";
import { Target, Pencil, Check, X, ChevronRight } from "lucide-react";
import { useWeeklyGoal } from "@/hooks/use-weekly-goal";
import { colors, spring } from "@/lib/tokens";

const AMBER = "#E58430";

export function WeeklyGoalBanner() {
  const { goal, hasGoal, showPrompt, isMonday, weekRange, saveGoal, editGoal } = useWeeklyGoal();
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Foca o input automaticamente quando o prompt aparece
  useEffect(() => {
    if (showPrompt && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [showPrompt]);

  function handleSubmit() {
    if (draft.trim()) saveGoal(draft);
  }

  // ── Estado 1: Goal definido ──────────────────────────────────────────────────
  if (hasGoal) {
    return (
      <GoalDisplay goal={goal} weekRange={weekRange} onEdit={() => { setDraft(goal); editGoal(); }} />
    );
  }

  // ── Estado 2: Prompt (segunda-feira ou clicou "definir") ─────────────────────
  if (showPrompt) {
    return (
      <div style={{
        margin: "0 0 4px",
        borderRadius: 14,
        background: "var(--hq-card-bg)",
        border: `1.5px solid ${AMBER}40`,
        padding: "16px 18px",
        boxShadow: `0 0 0 1px ${AMBER}15, 0 4px 24px ${AMBER}10`,
        animation: "goalIn 0.3s cubic-bezier(0.2,0.85,0.25,1)",
      }}>
        <style>{`@keyframes goalIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>

        {/* Header do prompt */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `${AMBER}20`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Target size={14} color={AMBER} />
          </div>
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, color: AMBER,
              textTransform: "uppercase", letterSpacing: "0.07em",
              fontFamily: '"SF Mono", ui-monospace, monospace',
            }}>
              {isMonday ? "É segunda-feira! 🎯" : "Objetivo da semana"}
            </div>
            <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
              {isMonday
                ? "Qual é o foco desta semana?"
                : "Defina um objetivo para guiar sua semana"}
            </div>
          </div>
        </div>

        {/* Input */}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") { setDraft(""); }
            }}
            placeholder="Ex: Fechar o contrato da SP Republica"
            maxLength={120}
            style={{
              flex: 1,
              background: "var(--hq-inlay-bg)",
              border: `1px solid ${draft.trim() ? AMBER + "60" : "var(--hq-border)"}`,
              borderRadius: 10,
              color: colors.text,
              fontSize: 14,
              fontWeight: 500,
              padding: "10px 14px",
              outline: "none",
              transition: `border-color 0.15s ${spring.gentle}`,
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!draft.trim()}
            style={{
              background: draft.trim() ? AMBER : "var(--hq-inlay-bg)",
              border: "none",
              borderRadius: 10,
              color: draft.trim() ? "#fff" : colors.textMuted,
              cursor: draft.trim() ? "pointer" : "not-allowed",
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 600,
              display: "flex", alignItems: "center", gap: 6,
              flexShrink: 0,
              transition: `all 0.15s ${spring.gentle}`,
            }}
          >
            <Check size={14} />
            Definir
          </button>
        </div>
      </div>
    );
  }

  // ── Estado 3: Sem goal, não é segunda — pill discreta ──────────────────────
  return (
    <button
      onClick={() => { setDraft(""); editGoal(); }}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "transparent",
        border: `1px dashed var(--hq-border)`,
        borderRadius: 8,
        color: colors.textMuted,
        cursor: "pointer",
        fontSize: 12,
        padding: "5px 12px",
        marginBottom: 4,
        transition: `all 0.15s ${spring.gentle}`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = AMBER + "80";
        (e.currentTarget as HTMLElement).style.color = AMBER;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--hq-border)";
        (e.currentTarget as HTMLElement).style.color = colors.textMuted;
      }}
    >
      <Target size={11} />
      Definir objetivo da semana
      <ChevronRight size={11} />
    </button>
  );
}

// ── GoalDisplay ───────────────────────────────────────────────────────────────

function GoalDisplay({ goal, weekRange, onEdit }: { goal: string; weekRange: string; onEdit: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        margin: "0 0 4px",
        borderRadius: 14,
        background: `linear-gradient(135deg, ${AMBER}0F 0%, transparent 60%)`,
        border: `1px solid ${AMBER}35`,
        padding: "14px 16px 14px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        position: "relative",
        overflow: "hidden",
        transition: `border-color 0.2s ${spring.gentle}`,
        borderColor: hovered ? `${AMBER}60` : `${AMBER}35`,
        // Barra lateral amber
        boxShadow: `inset 4px 0 0 ${AMBER}`,
      }}
    >
      {/* Ícone */}
      <div style={{
        width: 32, height: 32, borderRadius: 9,
        background: `${AMBER}20`,
        border: `1px solid ${AMBER}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Target size={15} color={AMBER} />
      </div>

      {/* Texto */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 10, fontWeight: 700,
          color: `${AMBER}CC`,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontFamily: '"SF Mono", ui-monospace, monospace',
          marginBottom: 4,
        }}>
          Objetivo da semana
        </div>
        <div style={{
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: "-0.025em",
          color: colors.text,
          lineHeight: 1.3,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {goal}
        </div>
        <div style={{
          fontSize: 11,
          color: colors.textMuted,
          marginTop: 3,
          fontVariantNumeric: "tabular-nums",
        }}>
          {weekRange}
        </div>
      </div>

      {/* Botão editar — aparece no hover */}
      <button
        onClick={onEdit}
        title="Editar objetivo"
        style={{
          background: hovered ? `${AMBER}15` : "transparent",
          border: `1px solid ${hovered ? AMBER + "40" : "transparent"}`,
          borderRadius: 8,
          color: hovered ? AMBER : "transparent",
          cursor: "pointer",
          padding: "6px 8px",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          transition: `all 0.15s ${spring.gentle}`,
        }}
      >
        <Pencil size={13} />
      </button>
    </div>
  );
}
