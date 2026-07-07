import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatCPF, formatCEP } from "@/lib/utils";
import { MarkShippedButton } from "@/components/admin/MarkShippedButton";

export const revalidate = 0;

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

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: { include: { images: { orderBy: { order: "asc" } } } },
          productVariant: true,
        },
      },
      payment: true,
    },
  });

  if (!order) notFound();

  const st = STATUS_LABELS[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-600" };
  const payStatus = order.payment?.status ?? "PENDING";
  const isPickup = order.deliveryMethod === "PICKUP";
  const productTotal = order.items.reduce((sum, item) => sum + Number(item.totalPrice), 0);

  return (
    <div className="max-w-3xl">
      <Link href="/admin/pedidos" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar pra pedidos
      </Link>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Pedido #{order.id.slice(-8).toUpperCase()}
        </h1>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${st.color}`}>{st.label}</span>
        <span className="text-xs text-gray-400">
          {new Date(order.createdAt).toLocaleString("pt-BR")}
        </span>
        {order.status === "PAID" && (
          <div className="flex items-center gap-1.5">
            <MarkShippedButton orderId={order.id} canShip />
            <span className="text-xs text-gray-500">Marcar como enviado</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cliente */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Cliente</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-gray-400">Nome</dt>
              <dd className="text-gray-900">{order.customerName}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">E-mail</dt>
              <dd className="text-gray-900">{order.customerEmail}</dd>
            </div>
            {order.customerPhone && (
              <div>
                <dt className="text-xs text-gray-400">Telefone</dt>
                <dd className="text-gray-900">{order.customerPhone}</dd>
              </div>
            )}
            {order.customerCpf && (
              <div>
                <dt className="text-xs text-gray-400">CPF</dt>
                <dd className="text-gray-900">{formatCPF(order.customerCpf)}</dd>
              </div>
            )}
            {order.groupNumber && (
              <div>
                <dt className="text-xs text-gray-400">Grupo da Hearts</dt>
                <dd className="text-gray-900">{order.groupNumber}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Entrega */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900 mb-3">
            {isPickup ? "Retirada na loja" : "Entrega"}
          </h2>
          {isPickup ? (
            <p className="text-sm text-gray-700">🏬 Cliente vai retirar na loja</p>
          ) : (
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-gray-400">Endereço</dt>
                {order.shippingStreet ? (
                  <dd className="text-gray-900">
                    {order.shippingStreet}, {order.shippingNumber}
                    {order.shippingComplement ? ` — ${order.shippingComplement}` : ""}
                    <br />
                    {order.shippingNeighborhood} — {order.shippingCity}/{order.shippingState}
                    <br />
                    CEP {order.shippingCep ? formatCEP(order.shippingCep) : "—"}
                  </dd>
                ) : (
                  <dd className="text-gray-400">Não informado</dd>
                )}
              </div>
              {order.shippingCost !== null && (
                <div>
                  <dt className="text-xs text-gray-400">Frete cobrado</dt>
                  <dd className="text-gray-900">
                    {order.shippingService ?? "—"} · {formatCurrency(Number(order.shippingCost))}
                  </dd>
                </div>
              )}
              {order.meLabelUrl && (
                <div>
                  <dt className="text-xs text-gray-400">Etiqueta</dt>
                  <dd>
                    <a href={order.meLabelUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                      {order.meServiceName ?? "Ver etiqueta"} ↗
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </div>

      {/* Itens */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mt-4">
        <h2 className="font-semibold text-gray-900 mb-3">Itens do pedido</h2>
        <div className="space-y-3">
          {order.items.map((item) => {
            const exactImg = item.productVariant
              ? item.product.images.find((i) => i.color === item.productVariant!.color)
              : undefined;
            const img = exactImg ?? item.product.images[0];
            return (
              <div key={item.id} className="flex items-center gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                <div className="relative h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  {img ? (
                    <Image src={img.url} alt={item.product.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-300 text-2xl">📦</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{item.product.name}</p>
                  <p className="text-xs text-gray-500">
                    Qtd: {item.quantity}
                    {item.productVariant && ` · Cor: ${item.productVariant.color}`}
                  </p>
                  {item.productVariant && !exactImg && (
                    <p className="text-[11px] text-amber-600">
                      Nenhuma foto vinculada a essa cor — mostrando a foto padrão do produto.
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">{formatCurrency(Number(item.unitPrice))} un.</p>
                  <p className="font-bold text-brand-600">{formatCurrency(Number(item.totalPrice))}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-gray-100 mt-4 pt-4 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Produto</span>
            <span>{formatCurrency(productTotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Frete</span>
            <span>{isPickup ? "Retirada" : formatCurrency(Number(order.shippingCost ?? 0))}</span>
          </div>
          <div className="flex justify-between text-base font-bold pt-1.5 border-t border-gray-100">
            <span>Total</span>
            <span className="text-brand-600">{formatCurrency(Number(order.totalAmount))}</span>
          </div>
        </div>
      </div>

      {/* Pagamento */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mt-4">
        <h2 className="font-semibold text-gray-900 mb-3">Pagamento</h2>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-xs text-gray-400">Status</dt>
            <dd className="text-gray-900">{PAYMENT_LABELS[payStatus] ?? payStatus}</dd>
          </div>
          {order.payment?.method && (
            <div>
              <dt className="text-xs text-gray-400">Método</dt>
              <dd className="text-gray-900">{order.payment.method}</dd>
            </div>
          )}
          {order.payment?.paidAt && (
            <div>
              <dt className="text-xs text-gray-400">Pago em</dt>
              <dd className="text-gray-900">{new Date(order.payment.paidAt).toLocaleString("pt-BR")}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
