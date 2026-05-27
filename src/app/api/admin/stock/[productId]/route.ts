import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { updateStockSchema } from "@/lib/validations";
import type { Prisma } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { productId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateStockSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { delta, reason, note } = parsed.data;

  const stock = await prisma.stock.findUnique({ where: { productId } });
  if (!stock) return NextResponse.json({ error: "Estoque não encontrado" }, { status: 404 });

  const newTotal = stock.quantityTotal + delta;
  if (newTotal < 0) {
    return NextResponse.json({ error: "Estoque não pode ficar negativo" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const s = await tx.stock.update({
      where: { productId },
      data: { quantityTotal: { increment: delta } },
    });

    await tx.stockLog.create({
      data: { stockId: s.id, adminUserId: admin.id, reason, delta, note },
    });

    const available = s.quantityTotal - s.quantityReserved - s.quantitySold;
    if (available > 0) {
      await tx.product.updateMany({
        where: { id: productId, status: "SOLD_OUT" },
        data: { status: "ACTIVE" },
      });
    }

    return s;
  });

  return NextResponse.json(updated);
}
