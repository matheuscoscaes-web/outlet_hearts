import { prisma } from "@/lib/prisma";
import { mpPayment } from "@/lib/mercadopago";
import { finalizeOrderPayment } from "@/lib/finalize-payment";

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
