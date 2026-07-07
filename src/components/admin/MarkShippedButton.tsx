"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck } from "lucide-react";

export function MarkShippedButton({ orderId, canShip }: { orderId: string; canShip: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!canShip) return null;

  async function handleClick() {
    setLoading(true);
    await fetch(`/api/admin/orders/${orderId}/ship`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title="Marcar como enviado"
      className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 disabled:opacity-40"
    >
      <PackageCheck className="h-4 w-4" />
    </button>
  );
}
