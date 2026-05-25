import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function MiniCalendar() {
  const [refDate, setRefDate] = useState(new Date());
  const todayIso = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const monthName = refDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastOfMonth.getDate();
  const firstDow = firstOfMonth.getDay();
  const monStartOffset = firstDow === 0 ? 6 : firstDow - 1;

  const cells: Array<{ day: number | null; iso?: string }> = [];
  for (let i = 0; i < monStartOffset; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ day: d, iso: date.toLocaleDateString("en-CA") });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null });

  function shiftMonth(delta: number) { setRefDate(new Date(year, month + delta, 1)); }

  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 4px" }}>
        <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: "var(--hq-text-secondary)", textTransform: "capitalize", letterSpacing: "-0.005em" }}>
          {monthName}
        </span>
        <button onClick={() => shiftMonth(-1)} style={navBtn}><ChevronLeft size={11} /></button>
        <button onClick={() => shiftMonth(1)} style={navBtn}><ChevronRight size={11} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, marginBottom: 2 }}>
        {["S","T","Q","Q","S","S","D"].map((d, i) => (
          <span key={i} style={{ fontSize: 9, color: "var(--hq-text-muted)", textAlign: "center", fontWeight: 600, letterSpacing: "0.04em" }}>{d}</span>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
        {cells.map((c, i) => {
          if (c.day === null) return <div key={i} />;
          const isToday = c.iso === todayIso;
          return (
            <Link
              key={i}
              to="/"
              search={{ date: c.iso } as any}
              style={{
                fontSize: 10.5, padding: "5px 0", borderRadius: 4,
                textAlign: "center",
                color: isToday ? "var(--hq-accent)" : "var(--hq-text)",
                background: isToday ? "var(--hq-accent-soft)" : "transparent",
                fontWeight: isToday ? 700 : 400,
                fontVariantNumeric: "tabular-nums",
                textDecoration: "none",
                display: "block",
              }}
            >
              {c.day}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: "transparent", border: "none", color: "var(--hq-text-muted)",
  cursor: "pointer", padding: 3, borderRadius: 4, display: "grid", placeItems: "center",
};
