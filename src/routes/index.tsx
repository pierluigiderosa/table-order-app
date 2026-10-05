import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Spazio Community Music — Ordina al tavolo" },
      { name: "description", content: "Ordina drink e cibo direttamente dal tuo tavolo allo Spazio Community Music." },
      { property: "og:title", content: "Spazio Community Music — Ordina al tavolo" },
      { property: "og:description", content: "Scansiona il QR sul tavolo e ordina beverage e food." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [n, setN] = useState("");
  const navigate = useNavigate();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <p className="text-sm uppercase tracking-[0.3em] text-primary">Benvenuti</p>
      <h1 className="mt-2 text-6xl leading-none">Spazio Community Music</h1>
      <p className="mt-4 text-muted-foreground">
        Scansiona il QR code sul tuo tavolo per ordinare. Oppure inserisci il numero qui sotto.
      </p>
      <form
        className="mt-8 flex gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const v = parseInt(n, 10);
          if (v > 0) navigate({ to: "/tavolo/$numero", params: { numero: String(v) } });
        }}
      >
        <input
          inputMode="numeric"
          value={n}
          onChange={(e) => setN(e.target.value.replace(/\D/g, ""))}
          placeholder="N° tavolo"
          className="w-full rounded-lg border border-input bg-card px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-ring"
        />
        <button className="rounded-lg bg-primary px-6 font-display text-xl text-primary-foreground shadow-glow">
          Vai
        </button>
      </form>
      <Link to="/bar" className="mt-16 text-center text-xs text-muted-foreground underline">
        Area bar
      </Link>
    </main>
  );
}
