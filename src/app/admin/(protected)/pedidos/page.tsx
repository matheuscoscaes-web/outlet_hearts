import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { OrderAddressModal } from "@/components/admin/OrderAddressModal";
import { ShippingLabelButton } from "@/components/admin/ShippingLabelButton";
import { MarkShippedButton } from "@/components/admin/MarkShippedButton";
import { ReconcilePaymentsButton } from "@/components/admin/ReconcilePaymentsButton";
import type { Order, OrderItem, Product, ProductImage, Payment } from "@prisma/client";

export const revalidate = 0;

type OrderWithRelations = Order & {
  items: (OrderItem & { product: Product & { images: ProductImage[] } })[];
  payment: Payment | null;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Aguardando", color: "bg-yellow-100 text-yellow-700" },
  PAID: { label: "Pago", color: "bg-green-100 text-green-700" },
  SHIPPED: { label: "Enviado", color: "bg-blue-100 text-blue-700" },
  CANCELLED: { label: "Cancelado", color: "bg-red-100 text-red-700" },
  EXPIRED: { label: "Expirado", color: "bg-gray-100 text-gray-600" },
  REFUNDED: { label: "Reembolsado", color: "bg-blue-100 text-blue-700" },
};

const PAYMENT_LABELS: Record<string, string> = {
  PENDING: "Aguardando",
  APPROVED: "Aprovado",
  REJECTED: "Recusado",
  EXPIRED: "Expirado",
  REFUNDED: "Reembolsado",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const orders = await prisma.order.findMany({
    where: status ? { status: status as "PENDING" | "PAID" | "SHIPPED" | "CANCELLED" | "EXPIRED" } : undefined,
    include: {
      items: { include: { product: { include: { images: { take: 1 } } } } },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const tabs = [
    { label: "Todos", value: "" },
    { label: "Pagos", value: "PAID" },
    { label: "Enviados", value: "SHIPPED" },
    { label: "Aguardando", value: "PENDING" },
    { label: "Cancelados", value: "CANCELLED" },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Pedidos</h1>
        <ReconcilePaymentsButton />
      </div>

      <div className="flex gap-2 mb-4 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/pedidos${tab.value ? `?status=${tab.value}` : ""}`}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${status === tab.value || (!status && !tab.value) ? "bg-brand-600 text-white border-brand-600" : "border-gray-300 text-gray-700 hover:border-brand-400"}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Pedido</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Grupo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Produto</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Pagamento</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Data</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Envio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(orders as OrderWithRelations[]).map((order) => {
              const st = STATUS_LABELS[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-600" };
              const payStatus = order.payment?.status ?? "PENDING";
              return (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link href={`/admin/pedidos/${order.id}`} className="text-brand-600 hover:underline">
                      #{order.id.slice(-8).toUpperCase()}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{order.customerName}</p>
                    <p className="text-xs text-gray-400">{order.customerEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-700">
                    {order.groupNumber ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                    <Link href={`/admin/pedidos/${order.id}`} className="hover:text-brand-600" title={order.items[0]?.product.name}>
                      {order.items[0]?.product.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-brand-600">
                    {formatCurrency(Number(order.totalAmount))}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">
                    {PAYMENT_LABELS[payStatus] ?? payStatus}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}>
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      {order.deliveryMethod === "PICKUP" && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                          🏬 Retirada
                        </span>
                      )}
                      <div className="flex justify-center gap-2">
                        <OrderAddressModal
                          customerName={order.customerName}
                          customerPhone={order.customerPhone}
                          customerCpf={order.customerCpf}
                          groupNumber={order.groupNumber}
                          deliveryMethod={order.deliveryMethod}
                          shippingCep={order.shippingCep}
                          shippingStreet={order.shippingStreet}
                          shippingNumber={order.shippingNumber}
                          shippingComplement={order.shippingComplement}
                          shippingNeighborhood={order.shippingNeighborhood}
                          shippingCity={order.shippingCity}
                          shippingState={order.shippingState}
                          shippingService={order.shippingService}
                          shippingCost={order.shippingCost === null ? null : Number(order.shippingCost)}
                        />
                        <ShippingLabelButton
                          orderId={order.id}
                          canShip={order.status === "PAID" || order.status === "SHIPPED"}
                          deliveryMethod={order.deliveryMethod}
                          existingLabelUrl={order.meLabelUrl}
                          existingServiceName={order.meServiceName}
                        />
                        <MarkShippedButton orderId={order.id} canShip={order.status === "PAID"} />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                  Nenhum pedido encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
