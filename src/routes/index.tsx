import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar, type View } from "@/components/workspace/Sidebar";
import { HomeView } from "@/components/workspace/HomeView";
import { DashboardView } from "@/components/workspace/DashboardView";
import { BookmarksView } from "@/components/workspace/BookmarksView";
import { ProjectView } from "@/components/workspace/ProjectView";
import { SearchModal } from "@/components/workspace/SearchModal";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/")({ component: Workspace });

function Workspace() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [view, setView] = useState<View>({ kind: "home" });
  const [search, setSearch] = useState(false);
  const [newTaskTrigger, setNewTaskTrigger] = useState(0);

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [loading, user, nav]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const editable = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (e.key === "/" && !editable) { e.preventDefault(); setSearch(true); }
      else if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setSearch(true); }
      else if ((e.key === "n" || e.key === "N") && !editable && view.kind === "project") {
        e.preventDefault(); setNewTaskTrigger((x) => x + 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);

  if (loading || !user) {
    return <div style={{ height: "100vh", background: "#0d1117" }} />;
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0d1117", color: "#e6edf3" }}>
      <Sidebar view={view} setView={setView} openSearch={() => setSearch(true)} />
      <main style={{ flex: 1, height: "100vh", overflow: "hidden", position: "relative" }}>
        <button onClick={() => supabase.auth.signOut()} style={{
          position: "absolute", top: 16, right: 20, zIndex: 5,
          background: "transparent", border: "none", color: "#6e7681", cursor: "pointer",
          padding: 6, display: "flex", alignItems: "center", gap: 4, fontSize: 11,
        }} title="Sair"><LogOut size={13} /></button>
        {view.kind === "home" && <HomeView setView={setView} />}
        {view.kind === "dashboard" && <DashboardView />}
        {view.kind === "bookmarks" && <BookmarksView />}
        {view.kind === "project" && <ProjectView projectId={view.id} setView={setView} newTaskTrigger={newTaskTrigger} />}
      </main>
      {search && <SearchModal onClose={() => setSearch(false)} setView={setView} />}
    </div>
  );
}
