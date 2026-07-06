import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const timer = await prisma.outletTimer.findUnique({ where: { id: "singleton" } });

  return NextResponse.json({
    startedAt: timer?.startedAt ?? null,
    durationMinutes: timer?.durationMinutes ?? 180,
  });
}

export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  if (action === "start") {
    const durationMinutes = 180;
    const timer = await prisma.outletTimer.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", startedAt: new Date(), durationMinutes },
      update: { startedAt: new Date(), durationMinutes },
    });
    return NextResponse.json(timer);
  }

  if (action === "stop") {
    const timer = await prisma.outletTimer.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", startedAt: null },
      update: { startedAt: null },
    });
    return NextResponse.json(timer);
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}
