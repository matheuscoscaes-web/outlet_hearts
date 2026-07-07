import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mpPayment } from "@/lib/mercadopago";
import { finalizeOrderPayment } from "@/lib/finalize-payment";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, payment: { select: { gatewayId: true } } },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  // Enquanto o pedido está pendente (pix/boleto), consulta o Mercado Pago
  // diretamente em vez de depender só do webhook chegar — o front-end já
  // faz polling nessa rota enquanto mostra o QR Code.
  if (order.status === "PENDING" && order.payment?.gatewayId) {
    try {
      const mpData = await mpPayment.get({ id: Number(order.payment.gatewayId) });
      await finalizeOrderPayment(orderId, mpData);
    } catch (err) {
      console.error("[GET /api/orders/[orderId]/status] falha ao consultar Mercado Pago", err);
    }
  }

  const fresh = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });

  return NextResponse.json({ status: fresh?.status ?? order.status });
}
