import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { Toaster } from "sonner";
import { createContext, useContext, useState, useEffect, useRef, Suspense, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { QuickAddModal } from "@/components/workspace/QuickAddModal";
import { ThemeProvider, useTheme } from "@/hooks/use-theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useServiceWorkerUpdate } from "@/hooks/use-sw-update";
import { useOnline } from "@/hooks/use-online";
import { InstallPrompt } from "@/components/ui/install-prompt";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useGlobalHotkeys } from "@/hooks/use-hotkeys";

// ─── Search context ───────────────────────────────────────────────────────────

type SearchCtx = { open: boolean; openSearch: () => void; closeSearch: () => void };
const SearchContext = createContext<SearchCtx>({ open: false, openSearch: () => {}, closeSearch: () => {} });
export const useSearch = () => useContext(SearchContext);

function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const editable = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (e.key === "/" && !editable) { e.preventDefault(); setOpen(true); }
      else if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen(true); }
      else if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <SearchContext.Provider value={{ open, openSearch: () => setOpen(true), closeSearch: () => setOpen(false) }}>
      {children}
    </SearchContext.Provider>
  );
}

// ─── QuickAdd context (shared between Sidebar + MobileNav) ───────────────────

type QuickAddTab = "task" | "bookmark" | "note" | "purchase";
type QuickAddCtx = {
  open: boolean;
  openQuickAdd: (tab?: QuickAddTab) => void;
  closeQuickAdd: () => void;
};
const QuickAddContext = createContext<QuickAddCtx>({
  open: false,
  openQuickAdd: () => {},
  closeQuickAdd: () => {},
});
export const useQuickAdd = () => useContext(QuickAddContext);

function QuickAddProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<QuickAddTab>("task");

  function openQuickAdd(tab?: QuickAddTab) {
    if (tab) setDefaultTab(tab);
    setOpen(true);
  }

  return (
    <QuickAddContext.Provider value={{ open, openQuickAdd, closeQuickAdd: () => setOpen(false) }}>
      {children}
      {open && <QuickAddModal defaultTab={defaultTab} onClose={() => setOpen(false)} />}
    </QuickAddContext.Provider>
  );
}

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Pedro's HQ" },
      { name: "description", content: "Command Center pessoal — projetos, tarefas, links e notas." },
      { property: "og:title", content: "Pedro's HQ" },
      { property: "og:description", content: "Command Center pessoal — projetos, tarefas, links e notas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Pedro's HQ" },
      { name: "twitter:description", content: "Command Center pessoal — projetos, tarefas, links e notas." },
      { name: "theme-color", content: "#1A1A1A", media: "(prefers-color-scheme: dark)" },
      { name: "theme-color", content: "#F2F2F7", media: "(prefers-color-scheme: light)" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Pedro's HQ" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "canonical", href: "https://pedro-hq-workbench.lovable.app" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Caveat:wght@600&display=swap" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/icons/favicon-16.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/icons/favicon-32.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/icons/apple-touch-icon.png" },
      { rel: "apple-touch-startup-image", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)", href: "/splash/splash-390.png" },
      { rel: "apple-touch-startup-image", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)", href: "/splash/splash-414.png" },
      { rel: "apple-touch-startup-image", media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)", href: "/splash/splash-375.png" },
      { rel: "apple-touch-startup-image", media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)", href: "/splash/splash-428.png" },
      { rel: "apple-touch-startup-image", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)", href: "/splash/splash-430.png" },
      { rel: "apple-touch-startup-image", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)", href: "/splash/splash-393.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <div style={{ padding: 40, color: "var(--hq-text)", background: "var(--hq-bg)", height: "100vh" }}>
      404 — <a href="/" style={{ color: "var(--hq-accent)" }}>voltar</a>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      height: "100dvh", background: "var(--hq-bg)", color: "var(--hq-text)",
      padding: 32, textAlign: "center", gap: 16,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: "var(--hq-p1-bg)", display: "grid", placeItems: "center",
        fontSize: 28,
      }}>⚠</div>
      <div>
        <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em" }}>
          Algo correu mal
        </h2>
        <p style={{ margin: 0, color: "var(--hq-text-secondary)", fontSize: 14 }}>
          Ocorreu um erro inesperado. Tente recarregar a página.
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: "var(--hq-accent)", color: "#fff",
          border: "none", padding: "10px 24px", borderRadius: 10,
          fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}
      >
        Recarregar
      </button>
      <details style={{ maxWidth: 480, width: "100%", textAlign: "left" }}>
        <summary style={{ fontSize: 12, color: "var(--hq-text-muted)", cursor: "pointer", marginBottom: 8 }}>
          Detalhes técnicos
        </summary>
        <pre style={{
          fontSize: 11, color: "var(--hq-danger)", background: "var(--hq-p1-bg)",
          padding: 12, borderRadius: 8, overflow: "auto", whiteSpace: "pre-wrap",
          border: "1px solid var(--hq-p1)",
        }}>
          {error.message}
          {"\n\n"}
          {error.stack}
        </pre>
      </details>
    </div>
  ),
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function HotkeyBridge({ children }: { children: React.ReactNode }) {
  const { openSearch, closeSearch } = useSearch();
  const { openQuickAdd, closeQuickAdd } = useQuickAdd();
  useGlobalHotkeys({
    onSearch: openSearch,
    onQuickAdd: () => openQuickAdd(),
    onCloseOverlays: () => { closeSearch(); closeQuickAdd(); },
  });
  return <>{children}</>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SearchProvider>
          <QuickAddProvider>
            <HotkeyBridge>
              <AppShell />
            </HotkeyBridge>
          </QuickAddProvider>
        </SearchProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function RouteLoadingFallback() {
  return (
    <div style={{ height: "100%", display: "grid", placeItems: "center", background: "var(--hq-bg)" }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        border: "2.5px solid var(--hq-border)",
        borderTopColor: "var(--hq-accent)",
        animation: "spin 700ms linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function OfflineBanner() {
  const online = useOnline();
  const [dismissed, setDismissed] = useState(false);

  // Reseta o dismiss quando voltar online
  useEffect(() => { if (online) setDismissed(false); }, [online]);

  if (online || dismissed) return null;

  return (
    <div style={{
      position: "fixed", top: "var(--hq-safe-top)", left: 0, right: 0,
      zIndex: 270, padding: "6px 16px",
      background: "#FF9F0A",
      color: "#000", fontSize: 12, fontWeight: 600,
      textAlign: "center", letterSpacing: "-0.005em",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    }}>
      <span>Sem conexão · mudanças serão sincronizadas quando voltar online</span>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: "rgba(0,0,0,0.15)", border: "none", borderRadius: 4,
          color: "#000", cursor: "pointer", fontSize: 11, fontWeight: 700,
          padding: "1px 7px", marginLeft: 4,
        }}
      >✕</button>
    </div>
  );
}

function InstallPromptComponent() {
  return <InstallPrompt />;
}

function UpdateBanner({ onApply }: { onApply: () => void }) {
  return (
    <div style={{
      position: "fixed", top: "calc(var(--hq-safe-top) + 12px)", left: 12, right: 12,
      zIndex: 260, padding: "10px 14px",
      background: "var(--hq-modal-bg)",
      backdropFilter: "blur(24px) saturate(1.8)",
      WebkitBackdropFilter: "blur(24px) saturate(1.8)",
      border: "1px solid var(--hq-card-border)",
      borderRadius: 12, display: "flex", alignItems: "center", gap: 10,
      fontSize: 12.5, color: "var(--hq-text)",
      boxShadow: "var(--hq-shadow-float)",
      animation: "slideDown 220ms ease-out",
    }}>
      <style>{`@keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
      <span style={{ flex: 1 }}>✨ Nova versão disponível</span>
      <button onClick={onApply} style={{
        background: "var(--hq-accent)", color: "#fff",
        border: "none", padding: "5px 12px", borderRadius: 6,
        fontSize: 12, fontWeight: 600, cursor: "pointer",
      }}>Atualizar</button>
    </div>
  );
}

function AppShell() {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  useThemeColor();
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate();

  return (
    <>
      <OfflineBanner />
      {updateAvailable && <UpdateBanner onApply={applyUpdate} />}
      <div style={{
        display: "flex",
        height: "var(--hq-app-height)",
        background: "var(--hq-bg)",
        color: "var(--hq-text)",
        overflow: "hidden",
        paddingTop: "var(--hq-safe-top)",
        paddingLeft: "var(--hq-safe-left)",
        paddingRight: "var(--hq-safe-right)",
      }}>
        {/* Sidebar — desktop only */}
        {!isMobile && <Sidebar />}

        {/* Main content */}
        <main style={{
          flex: 1,
          height: "100dvh",
          overflowY: "auto",
          overflowX: "hidden",
          position: "relative",
          /* Room for mobile bottom nav */
          paddingBottom: isMobile ? "env(safe-area-inset-bottom, 0px)" : 0,
          WebkitOverflowScrolling: "touch",
        }}>
          <Suspense fallback={<RouteLoadingFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Mobile bottom nav */}
      {isMobile && <MobileNav />}

      <Toaster theme={theme === "light" ? "light" : "dark"} position="bottom-right" />
      <InstallPromptComponent />
    </>
  );
}
