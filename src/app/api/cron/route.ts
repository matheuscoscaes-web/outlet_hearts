import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const expired = await prisma.reservation.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lt: new Date() },
    },
    select: { id: true, quantity: true, productId: true },
  });

  if (expired.length === 0) {
    return NextResponse.json({ expired: 0 });
  }

  let count = 0;

  for (const res of expired) {
    try {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.reservation.update({
          where: { id: res.id },
          data: { status: "EXPIRED" },
        });

        await tx.stock.update({
          where: { productId: res.productId },
          data: { quantityReserved: { decrement: res.quantity } },
        });

        const stock = await tx.stock.findUnique({
          where: { productId: res.productId },
        });
        if (stock) {
          const available = stock.quantityTotal - stock.quantityReserved - stock.quantitySold;
          if (available > 0) {
            await tx.product.updateMany({
              where: { id: res.productId, status: "SOLD_OUT" },
              data: { status: "ACTIVE" },
            });
          }
        }
      });
      count++;
    } catch (err) {
      console.error(`[cron] Falha ao expirar reserva ${res.id}:`, err);
    }
  }

  console.log(`[cron] ${count} reservas expiradas`);
  return NextResponse.json({ expired: count });
}
