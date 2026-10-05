import { createFileRoute } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/bar/qr")({
  component: QrPage,
});

function QrPage() {
  const [count, setCount] = useState(10);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  return (
    <main className="p-6">
      <div className="flex flex-wrap items-end gap-4 print:hidden">
        <h1 className="text-5xl">QR tavoli</h1>
        <label className="text-sm">
          Numero tavoli{" "}
          <input type="number" min={1} max={200} value={count}
            onChange={(e) => setCount(Math.min(200, Math.max(1, parseInt(e.target.value) || 1)))}
            className="ml-2 w-20 rounded-lg border border-input bg-card px-2 py-1" />
        </label>
        <button onClick={() => window.print()} className="rounded-lg bg-primary px-4 py-2 font-display text-lg text-primary-foreground">
          Stampa
        </button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground print:hidden">
        Pubblica l'app prima di stampare, così i QR puntano all'indirizzo definitivo.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {origin && Array.from({ length: count }, (_, i) => i + 1).map((n) => (
          <div key={n} className="flex flex-col items-center rounded-2xl bg-foreground p-4 text-background break-inside-avoid">
            <QRCodeSVG value={`${origin}/tavolo/${n}`} size={150} />
            <p className="mt-2 font-display text-3xl">Tavolo {n}</p>
            <p className="text-xs">Scansiona e ordina</p>
          </div>
        ))}
      </div>
    </main>
  );
}
