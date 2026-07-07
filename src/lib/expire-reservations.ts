import { prisma } from "@/lib/prisma";
import { getProductAvailability } from "@/lib/product-stock";
import type { Prisma } from "@prisma/client";

export async function expireReservations(): Promise<number> {
  const expired = await prisma.reservation.findMany({
    where: { status: "ACTIVE", expiresAt: { lt: new Date() } },
    select: { id: true, quantity: true, productId: true, productVariantId: true },
  });

  if (expired.length === 0) return 0;

  let count = 0;

  for (const res of expired) {
    try {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.reservation.update({
          where: { id: res.id },
          data: { status: "EXPIRED" },
        });

        if (res.productVariantId) {
          await tx.productVariant.update({
            where: { id: res.productVariantId },
            data: { quantityReserved: { decrement: res.quantity } },
          });
        } else {
          await tx.stock.update({
            where: { productId: res.productId },
            data: { quantityReserved: { decrement: res.quantity } },
          });
        }

        const available = await getProductAvailability(res.productId, tx);
        if (available > 0) {
          await tx.product.updateMany({
            where: { id: res.productId, status: "SOLD_OUT" },
            data: { status: "ACTIVE" },
          });
        }

        await tx.order.updateMany({
          where: { reservationId: res.id, status: "PENDING" },
          data: { status: "EXPIRED" },
        });
      });
      count++;
    } catch (err) {
      console.error(`[expire-reservations] Falha na reserva ${res.id}:`, err);
    }
  }

  if (count > 0) console.log(`[expire-reservations] ${count} reserva(s) expirada(s)`);
  return count;
}
