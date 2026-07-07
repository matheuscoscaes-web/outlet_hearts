import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateRequiredShipping } from "@/lib/melhorenvio";
import { z } from "zod";

const bodySchema = z.object({
  reservationId: z.string().min(1),
  cep: z.string().min(8),
  state: z.string().length(2),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { reservationId, cep, state } = parsed.data;

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { product: true },
  });
  if (!reservation) {
    return NextResponse.json({ error: "Reserva não encontrada" }, { status: 404 });
  }

  const insuranceValue = Number(reservation.product.outletPrice) * reservation.quantity;

  try {
    const quote = await calculateRequiredShipping(cep, state, insuranceValue);
    return NextResponse.json(quote);
  } catch (err) {
    console.error("[POST /api/shipping/quote]", err);
    const message = err instanceof Error ? err.message : "Erro ao calcular frete";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
