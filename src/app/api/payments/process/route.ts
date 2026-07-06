import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mpPayment } from "@/lib/mercadopago";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { formData, orderId } = body;

  if (!formData || !orderId) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  if (order.status !== "PENDING") {
    return NextResponse.json({ error: "Pedido já processado" }, { status: 409 });
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    const payment = await mpPayment.create({
      body: {
        ...formData,
        external_reference: orderId,
        ...(baseUrl && !baseUrl.includes("localhost")
          ? { notification_url: `${baseUrl}/api/payments/webhook` }
          : {}),
      },
    });

    return NextResponse.json({ id: payment.id, status: payment.status });
  } catch (err) {
    console.error("[POST /api/payments/process]", err);
    return NextResponse.json({ error: "Erro ao processar pagamento" }, { status: 500 });
  }
}
