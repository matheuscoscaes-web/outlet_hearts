"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteProductButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Não foi possível excluir o produto.");
      setLoading(false);
      return;
    }

    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
        title="Excluir produto"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl mx-4">
            <h2 className="font-bold text-gray-900 mb-2">Excluir produto?</h2>
            <p className="text-sm text-gray-600 mb-6">
              Tem certeza que deseja excluir o produto{" "}
              <strong>"{productName}"</strong>? Essa ação não pode ser desfeita.
            </p>
            {error && (
              <p className="mb-4 text-sm text-red-700 bg-red-50 rounded px-3 py-2">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={confirm}
                disabled={loading}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 bg-red-500 hover:bg-red-600"
              >
                {loading ? "Excluindo..." : "Sim, excluir"}
              </button>
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
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
