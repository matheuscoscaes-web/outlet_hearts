import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const timer = await prisma.outletTimer.findUnique({ where: { id: "singleton" } });

  return NextResponse.json({
    startedAt: timer?.startedAt ?? null,
    durationMinutes: timer?.durationMinutes ?? 180,
  });
}
