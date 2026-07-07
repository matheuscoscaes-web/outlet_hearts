import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

interface MpPaymentData {
  id?: number | string;
  status?: string | null;
  payment_type_id?: string | null;
  payment_method_id?: string | null;
}

/**
 * Aplica o resultado de um pagamento do Mercado Pago no pedido (Order/Payment/
 * Reservation/Stock). Idempotente: se o pedido já não estiver mais PENDING,
 * não faz nada — pode ser chamada tanto no retorno síncrono do checkout
 * (cartão) quanto pelo webhook (pix/boleto/confirmação assíncrona) sem
 * duplicar o efeito.
 */
export async function finalizeOrderPayment(orderId: string, mpData: MpPaymentData) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { reservation: true, payment: true },
  });

  if (!order || order.status !== "PENDING") return;

  const mpStatus = mpData.status;
  const mpMethod = mpData.payment_type_id ?? mpData.payment_method_id;

  if (mpStatus === "approved") {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.payment.update({
        where: { orderId: order.id },
        data: {
          status: "APPROVED",
          gatewayId: String(mpData.id),
          method: mpMethod,
          gatewayResponse: mpData as object,
          paidAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: "PAID" },
      });

      await tx.reservation.update({
        where: { id: order.reservationId },
        data: { status: "CONVERTED" },
      });

      await tx.stock.update({
        where: { productId: order.reservation.productId },
        data: {
          quantityReserved: { decrement: order.reservation.quantity },
          quantitySold: { increment: order.reservation.quantity },
        },
      });

      const stock = await tx.stock.findUnique({
        where: { productId: order.reservation.productId },
      });
      if (stock) {
        const available = stock.quantityTotal - stock.quantityReserved - stock.quantitySold;
        if (available <= 0) {
          await tx.product.update({
            where: { id: order.reservation.productId },
            data: { status: "SOLD_OUT" },
          });
        }
      }
    });
  } else if (mpStatus === "rejected" || mpStatus === "cancelled") {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.payment.update({
        where: { orderId: order.id },
        data: {
          status: "REJECTED",
          gatewayId: String(mpData.id),
          gatewayResponse: mpData as object,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });

      await tx.reservation.update({
        where: { id: order.reservationId },
        data: { status: "CANCELLED" },
      });

      await tx.stock.update({
        where: { productId: order.reservation.productId },
        data: { quantityReserved: { decrement: order.reservation.quantity } },
      });
    });
  } else if (mpData.id) {
    // pix/boleto ainda pendente: guarda o id do pagamento no Mercado Pago
    // para permitir consultar o status depois (não depende só do webhook).
    await prisma.payment.update({
      where: { orderId: order.id },
      data: { gatewayId: String(mpData.id), method: mpMethod },
    });
  }
}
