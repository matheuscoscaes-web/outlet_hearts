import { prisma } from "@/lib/prisma";
import { mpPayment } from "@/lib/mercadopago";
import { finalizeOrderPayment, recoverCancelledPayment } from "@/lib/finalize-payment";

/**
 * Confere no Mercado Pago o status de pagamentos que ficaram pendentes
 * (pix/boleto) — cobre o caso do cliente pagar depois de fechar a aba do
 * checkout, quando não sobra ninguém fazendo polling ativo. Só olha
 * pagamentos das últimas 24h pra não ficar consultando carrinhos antigos
 * abandonados pra sempre.
 */
export async function reconcilePendingPayments(): Promise<number> {
  const pending = await prisma.payment.findMany({
    where: {
      status: "PENDING",
      gatewayId: { not: null },
      order: {
        status: { in: ["PENDING", "EXPIRED"] },
        createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    },
    select: { orderId: true, gatewayId: true },
  });

  let reconciled = 0;

  for (const payment of pending) {
    try {
      const mpData = await mpPayment.get({ id: Number(payment.gatewayId) });
      const before = await prisma.order.findUnique({
        where: { id: payment.orderId },
        select: { status: true },
      });
      await finalizeOrderPayment(payment.orderId, mpData);
      const after = await prisma.order.findUnique({
        where: { id: payment.orderId },
        select: { status: true },
      });
      if (before?.status !== after?.status) reconciled++;
    } catch (err) {
      console.error(`[reconcile-payments] Falha no pedido ${payment.orderId}:`, err);
    }
  }

  return reconciled;
}

export interface ManualReconcileResult {
  checked: number;
  recovered: number;
  needsAttention: string[];
}

/**
 * Acionado manualmente pelo admin (botão na aba de Pedidos): reconsulta no
 * Mercado Pago tanto pedidos Aguardando (sem o limite de 24h do cron acima)
 * quanto pedidos Cancelados — estes últimos cobrem o caso de uma aprovação
 * atrasada ter chegado depois de o pedido já ter sido marcado como cancelado.
 */
export async function manualReconcilePayments(): Promise<ManualReconcileResult> {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["PENDING", "CANCELLED"] },
      payment: { gatewayId: { not: null } },
    },
    select: { id: true, status: true, payment: { select: { gatewayId: true } } },
  });

  let recovered = 0;
  const needsAttention: string[] = [];

  for (const order of orders) {
    if (!order.payment?.gatewayId) continue;

    try {
      const mpData = await mpPayment.get({ id: Number(order.payment.gatewayId) });

      if (order.status === "PENDING") {
        const before = order.status;
        await finalizeOrderPayment(order.id, mpData);
        const after = await prisma.order.findUnique({ where: { id: order.id }, select: { status: true } });
        if (after && after.status !== before) recovered++;
      } else if (order.status === "CANCELLED") {
        const ok = await recoverCancelledPayment(order.id, mpData);
        if (ok) {
          recovered++;
          needsAttention.push(order.id);
        }
      }
    } catch (err) {
      console.error(`[manual-reconcile] Falha no pedido ${order.id}:`, err);
    }
  }

  return { checked: orders.length, recovered, needsAttention };
}
