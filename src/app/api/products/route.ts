import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcProductAvailable } from "@/lib/utils";
import type { Product, ProductImage, Stock, ProductVariant } from "@prisma/client";

type ProductWithRelations = Product & {
  images: ProductImage[];
  stock: Stock | null;
  variants: ProductVariant[];
};

export async function GET() {
  const products = await prisma.product.findMany({
    where: { status: { not: "INACTIVE" } },
    include: {
      images: { orderBy: { order: "asc" } },
      stock: true,
      variants: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const result = products.map((p: ProductWithRelations) => ({
    ...p,
    originalPrice: Number(p.originalPrice),
    outletPrice: Number(p.outletPrice),
    quantityAvailable: calcProductAvailable(p.stock, p.variants),
  }));

  return NextResponse.json(result);
}
