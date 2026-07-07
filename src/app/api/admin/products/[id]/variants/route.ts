import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { z } from "zod";

const bodySchema = z.object({
  color: z.string().min(1),
  quantityTotal: z.number().int().min(0),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id: productId } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { color, quantityTotal } = parsed.data;

  const existing = await prisma.productVariant.findUnique({
    where: { productId_color: { productId, color } },
  });
  if (existing) {
    return NextResponse.json({ error: "Já existe estoque cadastrado para essa cor" }, { status: 409 });
  }

  const variant = await prisma.productVariant.create({
    data: {
      productId,
      color,
      quantityTotal,
      quantityReserved: 0,
      quantitySold: 0,
      logs: {
        create: {
          adminUserId: admin.id,
          reason: "initial_stock",
          delta: quantityTotal,
          note: "Estoque inicial da cor",
        },
      },
    },
  });

  return NextResponse.json(variant, { status: 201 });
}
