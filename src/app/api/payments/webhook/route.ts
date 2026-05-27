import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mpPayment, validateWebhookSignature } from "@/lib/mercadopago";
import type { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const signatureHeader = req.headers.get("x-signature") ?? "";
  const requestId = req.headers.get("x-request-id") ?? "";
  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id") ?? "";

  if (signatureHeader && !validateWebhookSignature(signatureHeader, requestId, dataId)) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  if (body.type !== "payment" || !body.data?.id) {
    return NextResponse.json({ ok: true });
  }

  try {
    const mpData = await mpPayment.get({ id: body.data.id });

    const orderId = mpData.external_reference;
    const mpStatus = mpData.status;
    const mpMethod = mpData.payment_type_id ?? mpData.payment_method_id;

    const order = await prisma.order.findUnique({
      where: { id: orderId ?? "" },
      include: { reservation: true, payment: true },
    });

    if (!order) return NextResponse.json({ ok: true });

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
    } else if (["rejected", "cancelled"].includes(mpStatus ?? "")) {
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
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/payments/webhook]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
