import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Product, ProductImage, Stock } from "@prisma/client";

type ProductWithRelations = Product & {
  images: ProductImage[];
  stock: Stock | null;
};

export async function GET() {
  const products = await prisma.product.findMany({
    where: { status: { not: "INACTIVE" } },
    include: {
      images: { orderBy: { order: "asc" } },
      stock: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const result = products.map((p: ProductWithRelations) => ({
    ...p,
    originalPrice: Number(p.originalPrice),
    outletPrice: Number(p.outletPrice),
    quantityAvailable: p.stock
      ? Math.max(
          0,
          p.stock.quantityTotal -
            p.stock.quantityReserved -
            p.stock.quantitySold
        )
      : 0,
  }));

  return NextResponse.json(result);
}
