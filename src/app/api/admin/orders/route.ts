import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import type { Order, OrderItem, Product, ProductImage, Payment } from "@prisma/client";

type OrderWithRelations = Order & {
  items: (OrderItem & { product: Product & { images: ProductImage[] } })[];
  payment: Payment | null;
};

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const orders = await prisma.order.findMany({
    where: status ? { status: status as "PENDING" | "PAID" | "CANCELLED" | "EXPIRED" } : undefined,
    include: {
      items: { include: { product: { include: { images: { take: 1 } } } } },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(
    orders.map((o: OrderWithRelations) => ({ ...o, totalAmount: Number(o.totalAmount) }))
  );
}
