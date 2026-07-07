import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcProductAvailable } from "@/lib/utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { order: "asc" } },
      stock: true,
      variants: true,
    },
  });

  if (!product || product.status === "INACTIVE") {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    ...product,
    originalPrice: Number(product.originalPrice),
    outletPrice: Number(product.outletPrice),
    quantityAvailable: calcProductAvailable(product.stock, product.variants),
  });
}
