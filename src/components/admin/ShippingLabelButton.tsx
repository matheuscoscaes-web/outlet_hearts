"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Quote {
  id: number;
  name: string;
  company: string;
  price: string;
  delivery_time: number;
}

export function ShippingLabelButton({
  orderId,
  canShip,
  deliveryMethod,
  existingLabelUrl,
  existingServiceName,
}: {
  orderId: string;
  canShip: boolean;
  deliveryMethod: string;
  existingLabelUrl: string | null;
  existingServiceName: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selected, setSelected] = useState<Quote | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  if (deliveryMethod === "PICKUP") {
    return (
      <span
        title="Pedido para retirada na loja, sem etiqueta de envio"
        className="rounded-lg border border-gray-100 p-1.5 text-gray-300"
      >
        <Truck className="h-4 w-4" />
      </span>
    );
  }

  if (existingLabelUrl) {
    return (
      <a
        href={existingLabelUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={`Etiqueta gerada (${existingServiceName ?? "Melhor Envio"})`}
        className="rounded-lg border border-green-200 bg-green-50 p-1.5 text-green-700 hover:bg-green-100"
      >
        <ExternalLink className="h-4 w-4" />
      </a>
    );
  }

  async function handleOpen() {
    setOpen(true);
    setError("");
    setLoadingQuotes(true);
    const res = await fetch(`/api/admin/orders/${orderId}/shipping/quote`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erro ao cotar frete");
    } else {
      setQuotes(data);
    }
    setLoadingQuotes(false);
  }

  async function handleConfirm() {
    if (!selected) return;
    setGenerating(true);
    setError("");

    const res = await fetch(`/api/admin/orders/${orderId}/shipping/label`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId: selected.id, serviceName: `${selected.company} ${selected.name}` }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Erro ao gerar etiqueta");
      setGenerating(false);
      return;
    }

    setGenerating(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={!canShip}
        title={canShip ? "Gerar etiqueta no Melhor Envio" : "Só é possível gerar etiqueta para pedidos pagos"}
        className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Truck className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !generating && setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-gray-900 mb-1">Gerar etiqueta de envio</h2>
            <p className="text-sm text-gray-500 mb-4">Escolha a transportadora e confirme a compra da etiqueta.</p>

            {loadingQuotes && (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
              </div>
            )}

            {!loadingQuotes && error && (
              <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2 mb-3">{error}</p>
            )}

            {!loadingQuotes && quotes.length > 0 && (
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {quotes.map((q) => (
                  <label
                    key={q.id}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                      selected?.id === q.id ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-brand-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="service"
                        checked={selected?.id === q.id}
                        onChange={() => setSelected(q)}
                        className="text-brand-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{q.company} — {q.name}</p>
                        <p className="text-xs text-gray-400">até {q.delivery_time} dias úteis</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-brand-600 tabular-nums">{formatCurrency(Number(q.price))}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex gap-3 mt-2">
              <button
                onClick={handleConfirm}
                disabled={!selected || generating}
                className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {generating ? "Gerando..." : "Comprar e gerar etiqueta"}
              </button>
              <button
                onClick={() => setOpen(false)}
                disabled={generating}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
