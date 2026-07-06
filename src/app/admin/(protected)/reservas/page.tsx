import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Reservation, Product, ProductImage } from "@prisma/client";

export const revalidate = 0;

type ReservationWithProduct = Reservation & {
  product: Product & { images: ProductImage[] };
};

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "Expirada";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Ativa", color: "bg-green-100 text-green-700" },
  EXPIRED: { label: "Expirada", color: "bg-gray-100 text-gray-600" },
  CONVERTED: { label: "Convertida", color: "bg-blue-100 text-blue-700" },
  CANCELLED: { label: "Cancelada", color: "bg-red-100 text-red-700" },
};

export default async function AdminReservasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "ACTIVE" } = await searchParams;

  const reservations = await prisma.reservation.findMany({
    where: { status: status as "ACTIVE" | "EXPIRED" | "CONVERTED" | "CANCELLED" },
    include: { product: { include: { images: { take: 1 } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const now = Date.now();
  const tabs = [
    { label: "Ativas", value: "ACTIVE" },
    { label: "Expiradas", value: "EXPIRED" },
    { label: "Convertidas", value: "CONVERTED" },
    { label: "Canceladas", value: "CANCELLED" },
  ];

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Reservas</h1>

      <div className="flex gap-2 mb-4 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/reservas?status=${tab.value}`}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${status === tab.value ? "bg-brand-600 text-white border-brand-600" : "border-gray-300 text-gray-700 hover:border-brand-400"}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Produto</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Qtd</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Tempo restante</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Criada em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(reservations as ReservationWithProduct[]).map((r) => {
              const secondsLeft = Math.max(0, Math.floor((r.expiresAt.getTime() - now) / 1000));
              const st = STATUS_LABELS[r.status] ?? { label: r.status, color: "bg-gray-100 text-gray-600" };
              const isUrgent = r.status === "ACTIVE" && secondsLeft < 120;

              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 line-clamp-1">{r.product.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{r.id.slice(-8)}</p>
                  </td>
                  <td className="px-4 py-3 text-center">{r.quantity}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}>
                      {st.label}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-center font-mono text-sm font-bold ${isUrgent ? "text-red-600" : "text-gray-700"}`}>
                    {r.status === "ACTIVE" ? formatCountdown(secondsLeft) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400">
                    {new Date(r.createdAt).toLocaleString("pt-BR")}
                  </td>
                </tr>
              );
            })}
            {reservations.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  Nenhuma reserva encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
