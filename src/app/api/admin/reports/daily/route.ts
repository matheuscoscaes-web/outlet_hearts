import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";

function todayRangeBrazil() {
  const now = new Date();
  const brNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const y = brNow.getUTCFullYear();
  const m = brNow.getUTCMonth();
  const d = brNow.getUTCDate();
  const start = new Date(Date.UTC(y, m, d, 3, 0, 0));
  const end = new Date(Date.UTC(y, m, d + 1, 3, 0, 0));
  return { start, end };
}

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { start, end } = todayRangeBrazil();

  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["PAID", "SHIPPED"] },
      payment: { paidAt: { gte: start, lt: end } },
    },
    select: {
      id: true,
      groupNumber: true,
      customerName: true,
      totalAmount: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const totalSales = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

  const byGroupMap = new Map<string, { count: number; total: number }>();
  for (const o of orders) {
    const key = o.groupNumber?.trim() || "Sem grupo";
    const entry = byGroupMap.get(key) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += Number(o.totalAmount);
    byGroupMap.set(key, entry);
  }

  const groups = Array.from(byGroupMap.entries())
    .map(([group, v]) => ({ group, count: v.count, total: v.total }))
    .sort((a, b) => b.total - a.total);

  return NextResponse.json({
    date: start.toISOString().slice(0, 10),
    totalOrders: orders.length,
    totalSales,
    groups,
  });
}
