import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { Toaster } from "sonner";
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { QuickAddModal } from "@/components/workspace/QuickAddModal";
import { ThemeProvider, useTheme } from "@/hooks/use-theme";
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
      { name: "theme-color", content: "#000000" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Pedro's HQ" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
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
    <div style={{ padding: 40, color: "var(--hq-text)", background: "var(--hq-bg)", height: "100vh" }}>
      <pre style={{ color: "var(--hq-danger)" }}>{error.message}</pre>
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

function AppShell() {
  const { theme } = useTheme();
  const isMobile = useIsMobile();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <>
      <div style={{
        display: "flex",
        height: "100dvh",
        background: "var(--hq-bg)",
        color: "var(--hq-text)",
        overflow: "hidden",
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
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      {isMobile && <MobileNav />}

      <Toaster theme={theme === "light" ? "light" : "dark"} position="bottom-right" />
    </>
  );
}
