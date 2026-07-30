"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

interface ReconcileResult {
  checked: number;
  recovered: number;
  needsAttention: string[];
}

export function ReconcilePaymentsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "warning" | "error" } | null>(null);

  async function handleClick() {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/orders/reconcile-payments", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ text: data.error ?? "Erro ao verificar pagamentos", tone: "error" });
        return;
      }

      const { checked, recovered, needsAttention } = data as ReconcileResult;

      if (recovered === 0) {
        setMessage({ text: `0 pagamentos recuperados (${checked} verificado${checked === 1 ? "" : "s"}).`, tone: "success" });
        return;
      }

      const attentionNote =
        needsAttention.length > 0
          ? ` Confira o estoque desses pedidos antes de expedir, pois foram marcados como pagos após já terem sido cancelados.`
          : "";

      setMessage({
        text: `${recovered} pagamento${recovered === 1 ? "" : "s"} recuperado${recovered === 1 ? "" : "s"} de ${checked} verificado${checked === 1 ? "" : "s"}.${attentionNote}`,
        tone: needsAttention.length > 0 ? "warning" : "success",
      });
      router.refresh();
    } catch {
      setMessage({ text: "Erro ao verificar pagamentos", tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:border-brand-400 hover:text-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Verificando..." : "Verificar pagamentos"}
      </button>

      {message && (
        <p
          className={`mt-2 text-sm rounded px-3 py-2 max-w-md ${
            message.tone === "error"
              ? "bg-red-50 text-red-600"
              : message.tone === "warning"
              ? "bg-yellow-50 text-yellow-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
