import { prisma } from "@/lib/prisma";
import { getProductAvailability } from "@/lib/product-stock";
import type { Prisma } from "@prisma/client";

interface MpPaymentData {
  id?: number | string;
  status?: string | null;
  payment_type_id?: string | null;
  payment_method_id?: string | null;
}

/**
 * Aplica o resultado de um pagamento do Mercado Pago no pedido (Order/Payment/
 * Reservation/Stock). Idempotente: se o pedido já estiver PAID ou CANCELLED,
 * não faz nada — pode ser chamada tanto no retorno síncrono do checkout
 * (cartão) quanto pelo webhook/polling (pix/boleto) sem duplicar o efeito.
 *
 * Pedidos EXPIRED (a reserva estourou o prazo antes do pagamento confirmar)
 * ainda são aceitos aqui: o cliente pode ter pago de verdade só depois da
 * janela de reserva fechar, e nesse caso o estoque reservado já foi
 * devolvido pela expiração — então só soma em "vendido", sem decrementar
 * "reservado" de novo.
 */
export async function finalizeOrderPayment(orderId: string, mpData: MpPaymentData) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { reservation: true, payment: true },
  });

  if (!order) return;
  const wasExpired = order.status === "EXPIRED";
  if (order.status !== "PENDING" && !wasExpired) return;

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

      const stockDelta = wasExpired
        ? { quantitySold: { increment: order.reservation.quantity } }
        : {
            quantityReserved: { decrement: order.reservation.quantity },
            quantitySold: { increment: order.reservation.quantity },
          };

      if (order.reservation.productVariantId) {
        await tx.productVariant.update({
          where: { id: order.reservation.productVariantId },
          data: stockDelta,
        });
      } else {
        await tx.stock.update({
          where: { productId: order.reservation.productId },
          data: stockDelta,
        });
      }

      const available = await getProductAvailability(order.reservation.productId, tx);
      if (available <= 0) {
        await tx.product.update({
          where: { id: order.reservation.productId },
          data: { status: "SOLD_OUT" },
        });
      }
    });
  } else if (mpStatus === "rejected" || mpStatus === "cancelled") {
    if (wasExpired) {
      // reserva já foi liberada pela expiração, não tem o que cancelar de
      // novo — só deixa o pagamento registrado como recusado.
      await prisma.payment.update({
        where: { orderId: order.id },
        data: {
          status: "REJECTED",
          gatewayId: String(mpData.id),
          gatewayResponse: mpData as object,
        },
      });
      return;
    }

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

      if (order.reservation.productVariantId) {
        await tx.productVariant.update({
          where: { id: order.reservation.productVariantId },
          data: { quantityReserved: { decrement: order.reservation.quantity } },
        });
      } else {
        await tx.stock.update({
          where: { productId: order.reservation.productId },
          data: { quantityReserved: { decrement: order.reservation.quantity } },
        });
      }
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
