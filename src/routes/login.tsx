import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Accesso bar — Spazio Community Music" },
      { name: "description", content: "Accesso riservato allo staff del bar." },
      { property: "og:title", content: "Accesso bar" },
      { property: "og:description", content: "Area riservata allo staff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("Credenziali non valide");
      else navigate({ to: "/bar" });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/bar` },
      });
      if (error) toast.error(error.message);
      else if (data.session) navigate({ to: "/bar" });
      else toast.success("Controlla la tua email per confermare l'account");
    }
    setBusy(false);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-5xl">Area bar</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "in" ? "Accedi per vedere le comande." : "Il primo account creato diventa amministratore."}
      </p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
          className="w-full rounded-lg border border-input bg-card px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
          className="w-full rounded-lg border border-input bg-card px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
        <button disabled={busy} className="w-full rounded-lg bg-primary py-3 font-display text-2xl text-primary-foreground shadow-glow disabled:opacity-60">
          {mode === "in" ? "Accedi" : "Crea account"}
        </button>
      </form>
      <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 text-sm text-muted-foreground underline">
        {mode === "in" ? "Prima volta? Crea l'account" : "Hai già un account? Accedi"}
      </button>
    </main>
  );
}
