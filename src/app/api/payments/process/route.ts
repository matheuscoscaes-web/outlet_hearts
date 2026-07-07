import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mpPayment } from "@/lib/mercadopago";
import { finalizeOrderPayment } from "@/lib/finalize-payment";

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

    // Confirma o pedido de imediato quando a resposta já vem definitiva
    // (cartão aprova/recusa na hora) — não depende só do webhook chegar.
    if (payment.status && payment.id) {
      await finalizeOrderPayment(orderId, {
        id: payment.id,
        status: payment.status,
        payment_type_id: payment.payment_type_id,
        payment_method_id: payment.payment_method_id,
      });
    }

    const transactionData = payment.point_of_interaction?.transaction_data;

    return NextResponse.json({
      id: payment.id,
      status: payment.status,
      qrCode: transactionData?.qr_code ?? null,
      qrCodeBase64: transactionData?.qr_code_base64 ?? null,
      ticketUrl: transactionData?.ticket_url ?? payment.transaction_details?.external_resource_url ?? null,
    });
  } catch (err) {
    console.error("[POST /api/payments/process]", err);
    return NextResponse.json({ error: "Erro ao processar pagamento" }, { status: 500 });
  }
}
