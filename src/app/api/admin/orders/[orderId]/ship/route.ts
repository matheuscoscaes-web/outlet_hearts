import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { orderId } = await params;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  if (order.status !== "PAID") {
    return NextResponse.json({ error: "Só é possível marcar como enviado um pedido pago" }, { status: 409 });
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: "SHIPPED" },
  });

  return NextResponse.json(updated);
}
