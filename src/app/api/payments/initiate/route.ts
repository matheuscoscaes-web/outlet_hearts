import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPaymentPreference } from "@/lib/mercadopago";

export async function POST(req: NextRequest) {
  const { orderId } = await req.json().catch(() => ({}));

  if (!orderId) {
    return NextResponse.json({ error: "orderId obrigatório" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true } },
      reservation: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  if (order.status !== "PENDING") {
    return NextResponse.json({ error: "Pedido já processado" }, { status: 409 });
  }

  try {
    const preference = await createPaymentPreference({
      orderId: order.id,
      reservationId: order.reservationId,
      productName: order.items[0]?.product.name ?? "Produto Outlet",
      amount: Number(order.totalAmount),
      customerEmail: order.customerEmail,
      customerName: order.customerName,
    });

    return NextResponse.json({ preferenceId: preference.id, initPoint: preference.init_point });
  } catch (err) {
    console.error("[POST /api/payments/initiate]", err);
    return NextResponse.json({ error: "Erro ao criar preferência de pagamento" }, { status: 500 });
  }
}
