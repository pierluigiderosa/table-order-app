import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { placeOrder } from "@/lib/orders.functions";
import { euro } from "@/hooks/useAdmin";

export const Route = createFileRoute("/tavolo/$numero")({
  head: ({ params }) => ({
    meta: [
      { title: `Tavolo ${params.numero} — Spazio Community Music` },
      { name: "description", content: "Scegli beverage e food e invia la comanda al bar." },
      { property: "og:title", content: `Ordina al tavolo ${params.numero}` },
      { property: "og:description", content: "Menu beverage e food dello Spazio Community Music." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TablePage,
});

type Kind = "beverage" | "food";

function TablePage() {
  const { numero } = Route.useParams();
  const table = parseInt(numero, 10);
  const [tab, setTab] = useState<Kind>("beverage");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const send = useServerFn(placeOrder);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("available", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const items = useMemo(
    () => products.filter((p) => cart[p.id]).map((p) => ({ ...p, qty: cart[p.id] ?? 0 })),
    [products, cart],
  );
  const total = items.reduce((s, i) => s + Number(i.price) * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  const change = (id: string, d: number) =>
    setCart((c) => {
      const q = Math.max(0, (c[id] ?? 0) + d);
      const next = { ...c, [id]: q };
      if (!q) delete next[id];
      return next;
    });

  if (!table || table < 1)
    return <p className="p-10 text-center">Numero tavolo non valido.</p>;

  if (done)
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center animate-pop">
        <h1 className="text-6xl text-primary">Comanda inviata!</h1>
        <p className="mt-4 text-muted-foreground">
          Il bar ha ricevuto il tuo ordine per il tavolo {table}. Il pagamento si fa al bancone.
        </p>
        <button
          onClick={() => setDone(false)}
          className="mt-8 rounded-lg border border-border px-6 py-3 font-display text-xl"
        >
          Nuovo ordine
        </button>
      </main>
    );

  const submit = async () => {
    setSending(true);
    try {
      await send({
        data: { table, name, note, items: items.map((i) => ({ id: i.id, qty: i.qty })) },
      });
      setCart({});
      setNote("");
      setDone(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore nell'invio");
    } finally {
      setSending(false);
    }
  };

  const list = products.filter((p) => p.kind === tab);

  return (
    <main className="mx-auto max-w-md px-5 pb-72 pt-8">
      <p className="text-sm uppercase tracking-[0.3em] text-primary">Spazio Community Music</p>
      <h1 className="text-5xl">Tavolo {table}</h1>

      <div className="sticky top-0 z-10 -mx-5 mt-6 flex gap-2 bg-background/90 px-5 py-3 backdrop-blur">
        {(["beverage", "food"] as Kind[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 rounded-full py-2 font-display text-xl tracking-wide transition ${
              tab === k ? "bg-primary text-primary-foreground shadow-glow" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {k === "beverage" ? "Beverage" : "Food"}
          </button>
        ))}
      </div>

      {isLoading && <p className="mt-6 text-muted-foreground">Caricamento menu…</p>}
      {!isLoading && list.length === 0 && (
        <p className="mt-6 text-muted-foreground">Nessun prodotto disponibile.</p>
      )}
      <ul className="mt-4 space-y-3">
        {list.map((p) => (
          <li key={p.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
            <div className="flex-1">
              <p className="font-semibold">{p.name}</p>
              {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
              <p className="mt-1 text-primary">{euro(Number(p.price))}</p>
            </div>
            <div className="flex items-center gap-2">
              {cart[p.id] ? (
                <>
                  <button onClick={() => change(p.id, -1)} className="h-9 w-9 rounded-full bg-secondary text-xl">−</button>
                  <span className="w-5 text-center font-semibold">{cart[p.id]}</span>
                </>
              ) : null}
              <button onClick={() => change(p.id, 1)} className="h-9 w-9 rounded-full bg-primary text-xl text-primary-foreground">+</button>
            </div>
          </li>
        ))}
      </ul>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur animate-pop">
          <div className="mx-auto max-w-md space-y-2 p-4">
            <div className="flex gap-2">
              <input
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                placeholder="Il tuo nome (obbligatorio)"
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <input
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (es. senza ghiaccio)"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              disabled={sending || !name.trim()}
              onClick={submit}
              className="flex w-full items-center justify-between rounded-lg bg-primary px-5 py-3 font-display text-2xl text-primary-foreground shadow-glow disabled:opacity-60"
            >
              <span>{sending ? "Invio…" : `Invia comanda (${count})`}</span>
              <span>{euro(total)}</span>
            </button>
            <p className="text-center text-xs text-muted-foreground">Pagamento al bancone</p>
          </div>
        </div>
      )}
    </main>
  );
}
