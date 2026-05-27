import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { createProductSchema } from "@/lib/validations";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: { images: { orderBy: { order: "asc" } }, stock: { include: { logs: { orderBy: { createdAt: "desc" }, take: 20 } } } },
  });

  if (!product) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json({
    ...product,
    originalPrice: Number(product.originalPrice),
    outletPrice: Number(product.outletPrice),
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = createProductSchema.partial().safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { quantity, ...productData } = parsed.data as { quantity?: number } & Record<string, unknown>;

  const updated = await prisma.product.update({
    where: { id },
    data: productData as Parameters<typeof prisma.product.update>[0]["data"],
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const hasOrders = await prisma.orderItem.findFirst({ where: { productId: id } });
  if (hasOrders) {
    return NextResponse.json(
      { error: "Produto tem pedidos vinculados. Desative-o em vez de excluir." },
      { status: 409 }
    );
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
