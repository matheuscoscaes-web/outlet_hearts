import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import type { OrderItem, Product } from "@prisma/client";

type OrderItemWithProduct = OrderItem & { product: Product };

export default async function ApprovedPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; status?: string }>;
}) {
  const { orderId, status } = await searchParams;

  const order = orderId
    ? await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true } }, payment: true },
      })
    : null;

  const isPending = status === "pending";

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16 text-center">
      <div className="text-6xl mb-4">{isPending ? "⏳" : "🎉"}</div>
      <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-gray-900">
        {isPending ? "Pagamento em análise" : "Compra confirmada!"}
      </h1>
      <p className="text-gray-500 mt-2 mb-6">
        {isPending
          ? "Seu pagamento está sendo processado. Você receberá uma confirmação em breve."
          : "Seu pedido foi confirmado com sucesso. Obrigado pela compra!"}
      </p>

      {order && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 text-left mb-6">
          <p className="text-xs text-gray-500 mb-3">Pedido #{order.id.slice(-8).toUpperCase()}</p>
          {(order.items as OrderItemWithProduct[]).map((item) => (
            <div key={item.id} className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0">
              <span className="text-gray-700">{item.product.name}</span>
              <span className="font-semibold text-brand-600">{formatCurrency(Number(item.totalPrice))}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold mt-3">
            <span>Total</span>
            <span className="text-brand-600">{formatCurrency(Number(order.totalAmount))}</span>
          </div>
          <p className="mt-3 text-xs text-gray-500">Confirmação enviada para: {order.customerEmail}</p>
        </div>
      )}

      <Link href="/">
        <Button size="lg" className="w-full">Ver mais produtos</Button>
      </Link>
    </div>
  );
}
