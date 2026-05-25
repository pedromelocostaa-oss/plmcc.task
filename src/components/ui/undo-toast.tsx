import { toast } from "sonner";

interface UndoToastOpts {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  undo: () => void | Promise<void>;
  duration?: number;
}

export function showUndoToast({ title, description, icon, iconBg, undo, duration = 5000 }: UndoToastOpts) {
  toast(
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 0", minWidth: 240 }}>
      {icon && (
        <span style={{
          width: 22, height: 22, borderRadius: 6,
          background: iconBg || "rgba(255,255,255,0.18)",
          display: "grid", placeItems: "center", flexShrink: 0,
        }}>
          {icon}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, color: "var(--hq-text)", fontSize: 13 }}>{title}</div>
        {description && (
          <div style={{ fontSize: 11.5, color: "var(--hq-text-secondary)", marginTop: 1 }}>
            {description}
          </div>
        )}
      </div>
    </div>,
    {
      duration,
      action: { label: "Desfazer", onClick: () => undo() },
    },
  );
}

export function useUndoToast() {
  return { show: showUndoToast };
}
