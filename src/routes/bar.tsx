import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";

export const Route = createFileRoute("/bar")({
  head: () => ({
    meta: [
      { title: "Bar — Comande | Spazio Community Music" },
      { name: "description", content: "Gestione comande, menu e QR code dei tavoli." },
      { property: "og:title", content: "Bar — Comande" },
      { property: "og:description", content: "Pannello del bar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BarLayout,
});

function BarLayout() {
  const { session, isAdmin, loading } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  if (loading || !session) return <p className="p-10 text-muted-foreground">Caricamento…</p>;
  if (!isAdmin)
    return (
      <div className="p-10">
        <p>Questo account non ha accesso all'area bar.</p>
        <button className="mt-4 underline" onClick={() => supabase.auth.signOut()}>Esci</button>
      </div>
    );

  const link = "rounded-full px-4 py-2 font-display text-lg tracking-wide";
  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-3">
        <span className="mr-4 font-display text-2xl text-primary">SCM · Bar</span>
        <Link to="/bar" activeOptions={{ exact: true }} className={link} activeProps={{ className: "bg-primary text-primary-foreground" }}>Comande</Link>
        <Link to="/bar/menu" className={link} activeProps={{ className: "bg-primary text-primary-foreground" }}>Menu</Link>
        <Link to="/bar/qr" className={link} activeProps={{ className: "bg-primary text-primary-foreground" }}>QR tavoli</Link>
        <button onClick={() => supabase.auth.signOut()} className="ml-auto text-sm text-muted-foreground underline">Esci</button>
      </header>
      <Outlet />
    </div>
  );
}
