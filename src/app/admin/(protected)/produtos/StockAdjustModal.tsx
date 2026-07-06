"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function StockAdjustModal({
  productId,
  productName,
  currentStock,
}: {
  productId: string;
  productName: string;
  currentStock: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ delta: "", reason: "", note: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/admin/stock/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        delta: Number(form.delta),
        reason: form.reason,
        note: form.note,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erro ao ajustar estoque");
      setLoading(false);
      return;
    }

    setOpen(false);
    setForm({ delta: "", reason: "", note: "" });
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700"
        title="Ajustar estoque"
      >
        <TrendingDown className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl mx-4">
            <h2 className="font-bold text-gray-900 mb-1">Ajustar estoque</h2>
            <p className="text-sm text-gray-500 mb-4">{productName} · Atual: {currentStock} unidades</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Variação (+/-) *"
                type="number"
                required
                value={form.delta}
                onChange={(e) => setForm((f) => ({ ...f, delta: e.target.value }))}
                placeholder="+5 (entrada) ou -2 (saída)"
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Motivo *</label>
                <select
                  required
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Selecione o motivo...</option>
                  <option value="manual_entry">Entrada manual</option>
                  <option value="manual_exit">Saída manual</option>
                  <option value="correction">Correção de inventário</option>
                  <option value="damage">Produto danificado</option>
                  <option value="return">Devolução</option>
                  <option value="other">Outro</option>
                </select>
              </div>
              <Input
                label="Observação (opcional)"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Detalhe adicional..."
              />

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3 mt-2">
                <Button type="submit" loading={loading}>Confirmar</Button>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
