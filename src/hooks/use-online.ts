import { useEffect, useState, useRef } from "react";

// Ping real ao Supabase — ignoramos navigator.onLine porque ele dá
// false negativo com frequência em redes corporativas, VPNs e captive portals.
// Começamos assumindo ONLINE (true) e só mostramos o banner após confirmar
// que o servidor está de fato inacessível.

const PING_URL = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`;
const PING_INTERVAL = 20_000;   // verifica a cada 20s quando offline
const INITIAL_DELAY = 6_000;    // aguarda 6s antes do primeiro check (evita flash no load)
const PING_TIMEOUT  = 5_000;    // timeout de 5s por ping

async function ping(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), PING_TIMEOUT);
    const res = await fetch(PING_URL, {
      method: "HEAD",
      signal: ctrl.signal,
      cache: "no-store",
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "" },
    });
    clearTimeout(t);
    // 401 = servidor respondeu mas sem auth (esperado para HEAD sem token de usuário)
    return res.ok || res.status === 401 || res.status === 400;
  } catch {
    return false;
  }
}

export function useOnline(): boolean {
  // Começa como true: assume online até ser provado o contrário
  const [online, setOnline] = useState(true);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;

    // Primeiro check atrasado — dá tempo do SW se resolver e do app carregar
    const initial = setTimeout(async () => {
      if (cancelled.current) return;
      const ok = await ping();
      if (!cancelled.current) setOnline(ok);
    }, INITIAL_DELAY);

    // Re-verifica quando o browser detecta mudança de rede
    const onOnline  = async () => { const ok = await ping(); if (!cancelled.current) setOnline(ok); };
    const onOffline = () => { if (!cancelled.current) setOnline(false); };
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);

    // Polling periódico (só quando offline para não saturar)
    let interval: ReturnType<typeof setInterval> | null = null;
    async function poll() {
      if (cancelled.current) return;
      const ok = await ping();
      if (!cancelled.current) {
        setOnline(ok);
        // Se voltou online, para o polling (os eventos nativos cuidam disso)
        if (ok && interval) { clearInterval(interval); interval = null; }
      }
    }
    // Inicia polling somente após confirmação de offline
    const startPolling = () => {
      if (!interval) interval = setInterval(poll, PING_INTERVAL);
    };
    window.addEventListener("offline", startPolling);

    return () => {
      cancelled.current = true;
      clearTimeout(initial);
      if (interval) clearInterval(interval);
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("offline", startPolling);
    };
  }, []);

  return online;
}
