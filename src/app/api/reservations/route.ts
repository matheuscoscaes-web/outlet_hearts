import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { createReservationSchema } from "@/lib/validations";
import { expireReservations } from "@/lib/expire-reservations";
import type { Prisma } from "@prisma/client";

const RESERVATION_MINUTES = 6;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createReservationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { productId, quantity, clientToken, color } = parsed.data;

  try {
    const reservation = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Produto com estoque por cor: trava a variante específica.
      if (color) {
        const variant = await tx.$queryRaw<
          {
            id: string;
            quantityTotal: number;
            quantityReserved: number;
            quantitySold: number;
          }[]
        >`
          SELECT id, "quantityTotal", "quantityReserved", "quantitySold"
          FROM "ProductVariant"
          WHERE "productId" = ${productId} AND "color" = ${color}
          FOR UPDATE
        `;

        if (!variant[0]) {
          throw new Error("PRODUCT_NOT_FOUND");
        }

        const v = variant[0];
        const available = v.quantityTotal - v.quantityReserved - v.quantitySold;

        if (available < quantity) {
          throw new Error("OUT_OF_STOCK");
        }

        const existing = await tx.reservation.findFirst({
          where: { clientToken, productVariantId: v.id, status: "ACTIVE" },
        });

        if (existing) {
          await tx.reservation.update({
            where: { id: existing.id },
            data: { status: "CANCELLED" },
          });
          await tx.productVariant.update({
            where: { id: v.id },
            data: { quantityReserved: { decrement: existing.quantity } },
          });
        }

        const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);

        const newReservation = await tx.reservation.create({
          data: { productId, productVariantId: v.id, quantity, clientToken, expiresAt },
        });

        await tx.productVariant.update({
          where: { id: v.id },
          data: { quantityReserved: { increment: quantity } },
        });

        return newReservation;
      }

      // Produto sem variantes: fluxo de sempre, por estoque do produto.
      const stock = await tx.$queryRaw<
        {
          id: string;
          quantityTotal: number;
          quantityReserved: number;
          quantitySold: number;
        }[]
      >`
        SELECT id, "quantityTotal", "quantityReserved", "quantitySold"
        FROM "Stock"
        WHERE "productId" = ${productId}
        FOR UPDATE
      `;

      if (!stock[0]) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const s = stock[0];
      const available = s.quantityTotal - s.quantityReserved - s.quantitySold;

      if (available < quantity) {
        throw new Error("OUT_OF_STOCK");
      }

      const existing = await tx.reservation.findFirst({
        where: { clientToken, productId, status: "ACTIVE" },
      });

      if (existing) {
        await tx.reservation.update({
          where: { id: existing.id },
          data: { status: "CANCELLED" },
        });
        await tx.stock.update({
          where: { productId },
          data: { quantityReserved: { decrement: existing.quantity } },
        });
      }

      const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);

      const newReservation = await tx.reservation.create({
        data: { productId, quantity, clientToken, expiresAt },
      });

      await tx.stock.update({
        where: { productId },
        data: { quantityReserved: { increment: quantity } },
      });

      return newReservation;
    });

    after(expireReservations);
    return NextResponse.json(reservation, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "UNKNOWN";
    if (message === "OUT_OF_STOCK") {
      return NextResponse.json(
        { error: "Produto sem estoque disponível" },
        { status: 409 }
      );
    }
    if (message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json(
        { error: "Produto não encontrado" },
        { status: 404 }
      );
    }
    console.error("[POST /api/reservations]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
