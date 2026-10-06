import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { euro } from "@/hooks/useAdmin";

export const Route = createFileRoute("/bar/")({
  component: Orders,
});

const STATUS = {
  new: { label: "Nuova", next: "preparing", action: "In preparazione" },
  preparing: { label: "In preparazione", next: "served", action: "Servito" },
  served: { label: "Servito", next: null, action: "" },
} as const;

function beep() {
  try {
    const ctx = new AudioContext();
    [0, 0.25].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.3, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.2);
    });
  } catch {
    /* audio blocked */
  }
}

function Orders() {
  const qc = useQueryClient();
  const [showServed, setShowServed] = useState(false);
  const [sound, setSound] = useState(false);
  const soundRef = useRef(false);
  soundRef.current = sound;

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const since = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("orders-bar")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (p) => {
        if (p.eventType === "INSERT" && soundRef.current) beep();
        setTimeout(() => qc.invalidateQueries({ queryKey: ["orders"] }), 700);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const setStatus = async (id: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["orders"] });
  };

  const setPaid = async (id: string, paid: boolean) => {
    await supabase.from("orders").update({ paid }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["orders"] });
  };

  const visible = orders.filter((o) => (showServed ? o.status === "served" : o.status !== "served"));
  if (showServed) visible.reverse();

  return (
    <main className="p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-5xl">{showServed ? "Servite" : "Comande aperte"}</h1>
        <span className="rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground">
          {orders.filter((o) => o.status === "new").length} nuove
        </span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => {
              setSound(!sound);
              if (!sound) beep();
            }}
            className={`rounded-full px-4 py-2 text-sm ${sound ? "bg-success text-primary-foreground" : "bg-secondary"}`}
          >
            {sound ? "🔔 Suono attivo" : "🔕 Attiva suono"}
          </button>
          <button onClick={() => setShowServed(!showServed)} className="rounded-full bg-secondary px-4 py-2 text-sm">
            {showServed ? "Vedi aperte" : "Vedi servite"}
          </button>
        </div>
      </div>

      {visible.length === 0 && <p className="mt-10 text-muted-foreground">Nessuna comanda.</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((o) => {
          const st = STATUS[o.status as keyof typeof STATUS];
          const groups = (["beverage", "food"] as const)
            .map((k) => ({ k, items: o.order_items.filter((i) => i.kind === k) }))
            .filter((g) => g.items.length);
          return (
            <article
              key={o.id}
              className={`animate-pop rounded-2xl border-2 bg-card p-5 ${
                o.status === "new" ? "border-primary shadow-glow" : "border-border"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <h2 className="text-4xl">Tavolo {o.table_number}</h2>
                <span className="text-sm text-muted-foreground">
                  {new Date(o.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {o.customer_name && <p className="text-sm text-muted-foreground">{o.customer_name}</p>}
              <p className="mt-1 text-xs uppercase tracking-widest text-primary">{st.label}</p>
              {groups.map((g) => (
                <div key={g.k} className="mt-3">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {g.k === "beverage" ? "Beverage" : "Food"}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {g.items.map((i) => (
                      <li key={i.id} className="flex justify-between text-lg">
                        <span><b>{i.quantity}×</b> {i.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {o.note && <p className="mt-3 rounded-lg bg-muted p-2 text-sm">📝 {o.note}</p>}
              <div className="mt-4 flex items-center justify-between">
                <span className="font-semibold">{euro(Number(o.total))}</span>
                <button
                  onClick={() => setPaid(o.id, !o.paid)}
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    o.paid ? "bg-success text-primary-foreground" : "bg-destructive text-destructive-foreground"
                  }`}
                  title="Tocca per cambiare"
                >
                  {o.paid ? "✓ Pagato" : "✗ Non pagato"}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                {o.status === "served" && (
                  <button
                    onClick={() => setStatus(o.id, "preparing")}
                    className="rounded-lg bg-secondary px-4 py-2 text-sm"
                  >
                    ↩ Ripristina in preparazione
                  </button>
                )}
                {o.status === "preparing" && (
                  <button
                    onClick={() => setStatus(o.id, "new")}
                    className="rounded-lg bg-secondary px-4 py-2 text-sm"
                  >
                    ↩ Torna a nuova
                  </button>
                )}
                {st.next && (
                  <button
                    onClick={() => setStatus(o.id, st.next!)}
                    className="rounded-lg bg-primary px-4 py-2 font-display text-lg text-primary-foreground"
                  >
                    {st.action}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
