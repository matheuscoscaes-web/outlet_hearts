import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import type { Reservation, Product, ProductImage } from "@prisma/client";

type ReservationWithProduct = Reservation & {
  product: Product & { images: ProductImage[] };
};

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "ACTIVE";

  const reservations = await prisma.reservation.findMany({
    where: { status: status as "ACTIVE" | "EXPIRED" | "CONVERTED" | "CANCELLED" },
    include: { product: { include: { images: { take: 1 } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(
    reservations.map((r: ReservationWithProduct) => ({
      ...r,
      secondsLeft:
        r.status === "ACTIVE"
          ? Math.max(0, Math.floor((r.expiresAt.getTime() - Date.now()) / 1000))
          : 0,
    }))
  );
}
