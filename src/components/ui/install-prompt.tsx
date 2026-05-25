import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed this session
    if (sessionStorage.getItem("hq-install-dismissed")) return;
    // Don't show if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ((window.navigator as { standalone?: boolean }).standalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || dismissed) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("hq-install-dismissed", "1");
  };

  return (
    <div style={{
      position: "fixed",
      bottom: "calc(var(--hq-safe-bottom) + 72px)",
      left: 12,
      right: 12,
      zIndex: 250,
      padding: "12px 14px",
      background: "var(--hq-modal-bg)",
      backdropFilter: "blur(24px) saturate(1.8)",
      WebkitBackdropFilter: "blur(24px) saturate(1.8)",
      border: "1px solid var(--hq-card-border)",
      borderRadius: 14,
      display: "flex",
      alignItems: "center",
      gap: 12,
      boxShadow: "var(--hq-shadow-float)",
      animation: "slideUp 240ms cubic-bezier(0.2,0.85,0.25,1)",
    }}>
      <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: "var(--hq-accent)",
        display: "grid", placeItems: "center",
        flexShrink: 0,
      }}>
        <Download size={18} color="#fff" strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--hq-text)", marginBottom: 2 }}>
          Instalar Pedro's HQ
        </div>
        <div style={{ fontSize: 11, color: "var(--hq-text-secondary)", lineHeight: 1.3 }}>
          Adicione à tela inicial para acesso rápido
        </div>
      </div>
      <button
        onClick={handleInstall}
        style={{
          background: "var(--hq-accent)",
          color: "#fff",
          border: "none",
          padding: "6px 14px",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        Instalar
      </button>
      <button
        onClick={handleDismiss}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--hq-text-muted)",
          cursor: "pointer",
          padding: 4,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          borderRadius: 6,
        }}
        aria-label="Fechar"
      >
        <X size={16} />
      </button>
    </div>
  );
}
