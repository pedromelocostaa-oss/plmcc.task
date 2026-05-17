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
import { ThemeProvider, useTheme } from "@/hooks/use-theme";

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

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Pedro's HQ" },
      { name: "description", content: "Command Center pessoal — projetos, tarefas, links e notas." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <SearchProvider>
        <div style={{ display: "flex", height: "100vh", background: "#0d1117", color: "#e6edf3", overflow: "hidden" }}>
          <Sidebar />
          <main style={{ flex: 1, height: "100vh", overflowY: "auto", position: "relative" }}>
            <Outlet />
          </main>
        </div>
        <Toaster theme="dark" position="bottom-right" />
      </SearchProvider>
    </QueryClientProvider>
  );
}
