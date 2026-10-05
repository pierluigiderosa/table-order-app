import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { euro } from "@/hooks/useAdmin";

export const Route = createFileRoute("/bar/menu")({
  component: MenuAdmin,
});

const input = "rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring";

function MenuAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", description: "", price: "", kind: "beverage" });

  const { data: products = [] } = useQuery({
    queryKey: ["products-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("kind").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["products-admin"] });
    qc.invalidateQueries({ queryKey: ["products-public"] });
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(form.price.replace(",", "."));
    if (!form.name.trim() || isNaN(price) || price < 0) return toast.error("Nome e prezzo validi richiesti");
    const { error } = await supabase.from("products").insert({
      name: form.name.trim().slice(0, 80),
      description: form.description.trim().slice(0, 200),
      price,
      kind: form.kind,
      sort_order: products.length + 1,
    });
    if (error) return toast.error("Errore nel salvataggio");
    setForm({ name: "", description: "", price: "", kind: form.kind });
    refresh();
  };

  const toggle = async (id: string, available: boolean) => {
    await supabase.from("products").update({ available }).eq("id", id);
    refresh();
  };
  const remove = async (id: string) => {
    if (!confirm("Eliminare il prodotto?")) return;
    await supabase.from("products").delete().eq("id", id);
    refresh();
  };

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-5xl">Menu</h1>
      <form onSubmit={add} className="mt-4 grid gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-6">
        <input className={`${input} sm:col-span-2`} placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={`${input} sm:col-span-2`} placeholder="Descrizione" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input className={input} placeholder="€" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <select className={input} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
          <option value="beverage">Beverage</option>
          <option value="food">Food</option>
        </select>
        <button className="rounded-lg bg-primary py-2 font-display text-xl text-primary-foreground sm:col-span-6">Aggiungi prodotto</button>
      </form>

      {(["beverage", "food"] as const).map((k) => (
        <section key={k} className="mt-8">
          <h2 className="text-3xl text-primary">{k === "beverage" ? "Beverage" : "Food"}</h2>
          <ul className="mt-2 divide-y divide-border rounded-2xl border border-border bg-card">
            {products.filter((p) => p.kind === k).map((p) => (
              <li key={p.id} className={`flex items-center gap-3 p-3 ${p.available ? "" : "opacity-50"}`}>
                <div className="flex-1">
                  <p className="font-semibold">{p.name} <span className="text-primary">{euro(Number(p.price))}</span></p>
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                </div>
                <button onClick={() => toggle(p.id, !p.available)} className="rounded-full bg-secondary px-3 py-1 text-sm">
                  {p.available ? "Segna esaurito" : "Rendi disponibile"}
                </button>
                <button onClick={() => remove(p.id)} className="text-sm text-destructive">Elimina</button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
