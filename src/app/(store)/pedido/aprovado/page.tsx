import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import type { OrderItem, Product } from "@prisma/client";

type OrderItemWithProduct = OrderItem & { product: Product };

const STATUS_CONTENT: Record<string, { emoji: string; title: string; text: string }> = {
  PAID: {
    emoji: "🎉",
    title: "Compra confirmada!",
    text: "Seu pedido foi confirmado com sucesso. Obrigado pela compra!",
  },
  PENDING: {
    emoji: "⏳",
    title: "Pagamento em análise",
    text: "Seu pagamento está sendo processado. Você receberá uma confirmação em breve.",
  },
  CANCELLED: {
    emoji: "❌",
    title: "Pagamento não confirmado",
    text: "Não conseguimos confirmar esse pagamento. Se o valor foi cobrado, entre em contato — caso contrário, a reserva foi cancelada e o produto voltou ao estoque.",
  },
  EXPIRED: {
    emoji: "⏰",
    title: "Reserva expirada",
    text: "O tempo de reserva se encerrou antes da confirmação do pagamento e o produto voltou ao estoque. Se o pagamento chegou a ser aprovado, o valor será estornado automaticamente.",
  },
  REFUNDED: {
    emoji: "↩️",
    title: "Pagamento estornado",
    text: "O tempo de reserva se encerrou antes da confirmação do pagamento e o produto voltou ao estoque. O valor pago foi estornado automaticamente.",
  },
};

export default async function ApprovedPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; status?: string }>;
}) {
  const { orderId } = await searchParams;

  const order = orderId
    ? await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true } }, payment: true },
      })
    : null;

  const content = STATUS_CONTENT[order?.status ?? "PENDING"] ?? STATUS_CONTENT.PENDING;

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16 text-center">
      <div className="text-6xl mb-4">{content.emoji}</div>
      <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-gray-900">
        {content.title}
      </h1>
      <p className="text-gray-500 mt-2 mb-6">{content.text}</p>

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
