import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createOrderSchema } from "@/lib/validations";
import type { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    reservationId,
    customerName,
    customerEmail,
    customerPhone,
    customerCpf,
    groupNumber,
    deliveryMethod,
    shippingCep,
    shippingStreet,
    shippingNumber,
    shippingComplement,
    shippingNeighborhood,
    shippingCity,
    shippingState,
  } = parsed.data;

  try {
    const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: { product: true },
      });

      if (!reservation) throw new Error("RESERVATION_NOT_FOUND");
      if (reservation.status !== "ACTIVE") throw new Error("RESERVATION_INVALID");
      if (reservation.expiresAt < new Date()) throw new Error("RESERVATION_EXPIRED");

      const unitPrice = Number(reservation.product.outletPrice);
      const totalAmount = unitPrice * reservation.quantity;

      const newOrder = await tx.order.create({
        data: {
          reservationId,
          customerName,
          customerEmail,
          customerPhone,
          customerCpf: customerCpf.replace(/\D/g, ""),
          groupNumber,
          deliveryMethod,
          shippingCep: deliveryMethod === "SHIPPING" ? shippingCep!.replace(/\D/g, "") : undefined,
          shippingStreet: deliveryMethod === "SHIPPING" ? shippingStreet : undefined,
          shippingNumber: deliveryMethod === "SHIPPING" ? shippingNumber : undefined,
          shippingComplement: deliveryMethod === "SHIPPING" ? shippingComplement : undefined,
          shippingNeighborhood: deliveryMethod === "SHIPPING" ? shippingNeighborhood : undefined,
          shippingCity: deliveryMethod === "SHIPPING" ? shippingCity : undefined,
          shippingState: deliveryMethod === "SHIPPING" ? shippingState!.toUpperCase() : undefined,
          totalAmount,
          items: {
            create: {
              productId: reservation.productId,
              productVariantId: reservation.productVariantId,
              quantity: reservation.quantity,
              unitPrice,
              totalPrice: totalAmount,
            },
          },
          payment: {
            create: {
              amount: totalAmount,
              status: "PENDING",
            },
          },
        },
        include: { items: true, payment: true, reservation: { include: { product: true } } },
      });

      return newOrder;
    });

    return NextResponse.json(order, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "RESERVATION_NOT_FOUND")
      return NextResponse.json({ error: "Reserva não encontrada" }, { status: 404 });
    if (message === "RESERVATION_INVALID")
      return NextResponse.json({ error: "Reserva inválida ou já utilizada" }, { status: 409 });
    if (message === "RESERVATION_EXPIRED")
      return NextResponse.json({ error: "Reserva expirada" }, { status: 410 });
    console.error("[POST /api/orders]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
