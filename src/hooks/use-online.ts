import { useEffect, useState } from "react";

// navigator.onLine é notoriamente impreciso — dá false mesmo com internet
// em algumas redes (VPN, proxy, roteadores com captive portal).
// Usamos uma combinação: navigator.onLine como sinal rápido, e um
// ping real periódico para confirmar conectividade com o Supabase.

const PING_URL = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`;
const PING_INTERVAL = 15_000; // 15s

async function checkConnectivity(): Promise<boolean> {
  // Primeiro check rápido via navigator.onLine
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;

  // Ping real: tenta atingir o Supabase com timeout de 4s
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4_000);
    const res = await fetch(PING_URL, {
      method: "HEAD",
      signal: ctrl.signal,
      cache: "no-store",
      headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "" },
    });
    clearTimeout(timer);
    return res.ok || res.status === 401; // 401 = servidor respondeu (sem autenticação é esperado no HEAD)
  } catch {
    return false;
  }
}

export function useOnline() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const isOnline = await checkConnectivity();
      if (!cancelled) setOnline(isOnline);
    }

    // Verifica imediatamente ao montar
    check();

    // Reage aos eventos nativos do browser (rápido)
    const on = () => check();
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);

    // Ping periódico para detectar perda/retorno de conexão sem evento
    const interval = setInterval(check, PING_INTERVAL);

    return () => {
      cancelled = true;
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      clearInterval(interval);
    };
  }, []);

  return online;
}
