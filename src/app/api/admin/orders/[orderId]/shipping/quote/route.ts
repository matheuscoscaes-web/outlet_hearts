import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { calculateShipping } from "@/lib/melhorenvio";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { orderId } = await params;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  if (!order.shippingCep) {
    return NextResponse.json({ error: "Pedido sem endereço de entrega cadastrado" }, { status: 400 });
  }

  try {
    const quotes = await calculateShipping(order.shippingCep, Number(order.totalAmount));
    return NextResponse.json(quotes);
  } catch (err) {
    console.error("[orders/shipping/quote]", err);
    const message = err instanceof Error ? err.message : "Erro ao cotar frete";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
