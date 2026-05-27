"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StatusToggle({
  productId,
  productName,
  currentStatus,
}: {
  productId: string;
  productName: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isActive = currentStatus === "ACTIVE";
  const nextStatus = isActive ? "INACTIVE" : "ACTIVE";
  const action = isActive ? "desativar" : "ativar";
  const actionLabel = isActive ? "Desativar" : "Ativar";

  async function confirm() {
    setLoading(true);
    await fetch(`/api/admin/products/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-70 cursor-pointer ${
          currentStatus === "ACTIVE"
            ? "bg-green-100 text-green-700"
            : currentStatus === "SOLD_OUT"
            ? "bg-red-100 text-red-700"
            : "bg-gray-100 text-gray-600"
        }`}
      >
        {currentStatus === "ACTIVE" ? "Ativo" : currentStatus === "SOLD_OUT" ? "Esgotado" : "Inativo"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl mx-4">
            <h2 className="font-bold text-gray-900 mb-2">
              {actionLabel} produto?
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Tem certeza que deseja <strong>{action}</strong> o produto{" "}
              <strong>"{productName}"</strong>?
              {isActive && (
                <span className="block mt-2 text-amber-700 bg-amber-50 rounded px-3 py-2">
                  ⚠️ Produto inativo não aparece na loja.
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirm}
                disabled={loading}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                  isActive ? "bg-red-500 hover:bg-red-600" : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {loading ? "Salvando..." : `Sim, ${action}`}
              </button>
              <button
                onClick={() => setOpen(false)}
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
