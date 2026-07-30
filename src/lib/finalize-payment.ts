import { prisma } from "@/lib/prisma";
import { getProductAvailability } from "@/lib/product-stock";
import { mpPaymentRefund } from "@/lib/mercadopago";
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
 * são olhados aqui só pra poder estornar: assim que a reserva expira o
 * estoque já volta a ficar disponível pra qualquer outra pessoa, então um
 * pagamento aprovado depois disso nunca vira venda (senão dá pra vender a
 * mesma unidade duas vezes) — o dinheiro é devolvido automaticamente no
 * Mercado Pago em vez de confirmar o pedido.
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

  if (mpStatus === "approved" && wasExpired) {
    try {
      await mpPaymentRefund.total({ payment_id: Number(mpData.id) });
      await prisma.payment.update({
        where: { orderId: order.id },
        data: {
          status: "REFUNDED",
          gatewayId: String(mpData.id),
          method: mpMethod,
          gatewayResponse: mpData as object,
        },
      });
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "REFUNDED" },
      });
    } catch (err) {
      console.error(`[finalize-payment] Falha ao estornar pagamento expirado do pedido ${order.id}:`, err);
      // guarda o retorno do MP mesmo com o estorno falhando, pra dar pra
      // conferir/estornar manualmente depois — não pode ficar sem rastro.
      await prisma.payment
        .update({
          where: { orderId: order.id },
          data: { gatewayId: String(mpData.id), method: mpMethod, gatewayResponse: mpData as object },
        })
        .catch(() => {});
    }
  } else if (mpStatus === "approved") {
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

      const stockDelta = {
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

/**
 * Reverte um pedido CANCELLED cujo pagamento, ao reconsultar o Mercado Pago,
 * aparece como aprovado — cobre o caso de uma aprovação de pix/boleto que
 * chegou depois de uma rejeição anterior já ter cancelado o pedido (a rota de
 * webhook ignora esse evento tardio porque só processa pedidos PENDING/EXPIRED).
 *
 * Só troca o status do pedido/pagamento: não mexe em reserva nem em estoque,
 * já que ambos já foram liberados quando o pedido foi cancelado e o item pode
 * já ter sido vendido para outra pessoa — quem aciona a reconciliação manual
 * precisa conferir a disponibilidade antes de expedir.
 */
export async function recoverCancelledPayment(orderId: string, mpData: MpPaymentData) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });

  if (!order || order.status !== "CANCELLED") return false;
  if (mpData.status !== "approved") return false;

  await prisma.$transaction([
    prisma.payment.update({
      where: { orderId: order.id },
      data: {
        status: "APPROVED",
        gatewayId: String(mpData.id),
        method: mpData.payment_type_id ?? mpData.payment_method_id,
        gatewayResponse: mpData as object,
        paidAt: new Date(),
      },
    }),
    prisma.order.update({
      where: { id: order.id },
      data: { status: "PAID" },
    }),
  ]);

  return true;
}
