import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { purchaseShippingLabel } from "@/lib/melhorenvio";
import { z } from "zod";

const bodySchema = z.object({
  serviceId: z.number().int(),
  serviceName: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { orderId } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });
  if (!order) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  if (order.meLabelUrl) {
    return NextResponse.json({ error: "Etiqueta já gerada para este pedido" }, { status: 409 });
  }
  if (!order.shippingCep || !order.shippingStreet || !order.shippingNumber || !order.shippingNeighborhood || !order.shippingCity || !order.shippingState) {
    return NextResponse.json({ error: "Pedido sem endereço de entrega completo" }, { status: 400 });
  }

  try {
    const { cartId, labelUrl } = await purchaseShippingLabel({
      serviceId: parsed.data.serviceId,
      to: {
        cep: order.shippingCep,
        street: order.shippingStreet,
        number: order.shippingNumber,
        complement: order.shippingComplement,
        neighborhood: order.shippingNeighborhood,
        city: order.shippingCity,
        state: order.shippingState,
        name: order.customerName,
        phone: order.customerPhone,
        email: order.customerEmail,
        document: order.customerCpf,
      },
      productName: order.items[0]?.product.name ?? "Produto Outlet",
      insuranceValue: Number(order.totalAmount),
    });

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        meCartId: cartId,
        meServiceId: parsed.data.serviceId,
        meServiceName: parsed.data.serviceName,
        meLabelUrl: labelUrl,
        meGeneratedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[orders/shipping/label]", err);
    const message = err instanceof Error ? err.message : "Erro ao gerar etiqueta";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
