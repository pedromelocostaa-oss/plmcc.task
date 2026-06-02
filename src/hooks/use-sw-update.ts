import { useEffect, useState } from "react";

export function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Em desenvolvimento o SW causa mais problemas do que resolve:
    // intercepta requests do Supabase e pode mostrar dados stale ou falhar.
    // Só registra em produção.
    if (!import.meta.env.PROD) {
      // Remove qualquer SW antigo que possa estar instalado de sessões anteriores
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js")
      .then((reg) => {
        setRegistration(reg);
        if (reg.waiting) setUpdateAvailable(true);
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });
      }).catch(() => {});

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    const interval = setInterval(() => {
      navigator.serviceWorker.getRegistration().then((reg) => reg?.update());
    }, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const applyUpdate = () => {
    registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
  };

  return { updateAvailable, applyUpdate };
}
