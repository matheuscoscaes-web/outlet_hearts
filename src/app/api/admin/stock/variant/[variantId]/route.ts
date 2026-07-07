import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { updateStockSchema } from "@/lib/validations";
import { getProductAvailability } from "@/lib/product-stock";
import type { Prisma } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ variantId: string }> }
) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { variantId } = await params;
  const parsed = updateStockSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { delta, reason, note } = parsed.data;

  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) return NextResponse.json({ error: "Estoque não encontrado" }, { status: 404 });

  const newTotal = variant.quantityTotal + delta;
  if (newTotal < 0) {
    return NextResponse.json({ error: "Estoque não pode ficar negativo" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const v = await tx.productVariant.update({
      where: { id: variantId },
      data: { quantityTotal: { increment: delta } },
    });

    await tx.variantStockLog.create({
      data: { variantId: v.id, adminUserId: admin.id, reason, delta, note },
    });

    const available = await getProductAvailability(variant.productId, tx);
    if (available > 0) {
      await tx.product.updateMany({
        where: { id: variant.productId, status: "SOLD_OUT" },
        data: { status: "ACTIVE" },
      });
    }

    return v;
  });

  return NextResponse.json(updated);
}
