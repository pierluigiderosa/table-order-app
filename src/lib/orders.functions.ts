import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  table: z.number().int().min(1).max(500),
  name: z.string().trim().min(1, "Inserisci il tuo nome").max(60),
  note: z.string().trim().max(300).default(""),
  items: z
    .array(z.object({ id: z.string().uuid(), qty: z.number().int().min(1).max(50) }))
    .min(1)
    .max(50),
});

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ids = data.items.map((i) => i.id);
    const { data: products, error } = await supabaseAdmin
      .from("products")
      .select("id, name, price, kind, available")
      .in("id", ids);
    if (error) throw new Error("Errore nel recupero del menu");

    const rows = data.items.map((i) => {
      const p = products?.find((x) => x.id === i.id);
      if (!p || !p.available) throw new Error("Un prodotto non è più disponibile");
      return { product_id: p.id, name: p.name, kind: p.kind, unit_price: Number(p.price), quantity: i.qty };
    });
    const total = rows.reduce((s, r) => s + r.unit_price * r.quantity, 0);

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({ table_number: data.table, customer_name: data.name, note: data.note, total })
      .select("id")
      .single();
    if (oErr || !order) throw new Error("Impossibile inviare l'ordine");

    const { error: iErr } = await supabaseAdmin
      .from("order_items")
      .insert(rows.map((r) => ({ ...r, order_id: order.id })));
    if (iErr) {
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw new Error("Impossibile inviare l'ordine");
    }
    return { id: order.id, total };
  });
