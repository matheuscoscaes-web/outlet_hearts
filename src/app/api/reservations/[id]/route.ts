import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { product: { include: { images: { take: 1, orderBy: { order: "asc" } } } } },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Reserva não encontrada" }, { status: 404 });
  }

  const now = new Date();
  const isExpired =
    reservation.status === "ACTIVE" && reservation.expiresAt < now;

  return NextResponse.json({
    ...reservation,
    isExpired,
    secondsLeft: isExpired
      ? 0
      : Math.max(0, Math.floor((reservation.expiresAt.getTime() - now.getTime()) / 1000)),
  });
}
