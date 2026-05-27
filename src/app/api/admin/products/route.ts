import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { createProductSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import type { Product, ProductImage, Stock } from "@prisma/client";

type ProductWithRelations = Product & {
  images: ProductImage[];
  stock: Stock | null;
};

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const products = await prisma.product.findMany({
    where: status ? { status: status as "ACTIVE" | "INACTIVE" | "SOLD_OUT" } : undefined,
    include: {
      images: { orderBy: { order: "asc" } },
      stock: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    products.map((p: ProductWithRelations) => ({
      ...p,
      originalPrice: Number(p.originalPrice),
      outletPrice: Number(p.outletPrice),
      quantityAvailable: p.stock
        ? Math.max(0, p.stock.quantityTotal - p.stock.quantityReserved - p.stock.quantitySold)
        : 0,
    }))
  );
}

export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null);

  if (body && !body.slug && body.name) {
    body.slug = slugify(body.name);
  }

  const parsed = createProductSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { quantity, ...productData } = parsed.data;

  const existing = await prisma.product.findUnique({ where: { slug: productData.slug } });
  if (existing) {
    return NextResponse.json({ error: "Slug já existe. Use outro nome." }, { status: 409 });
  }

  const product = await prisma.product.create({
    data: {
      ...productData,
      stock: {
        create: {
          quantityTotal: quantity,
          quantityReserved: 0,
          quantitySold: 0,
          logs: {
            create: {
              adminUserId: admin.id,
              reason: "initial_stock",
              delta: quantity,
              note: "Estoque inicial no cadastro",
            },
          },
        },
      },
    },
    include: { stock: true },
  });

  return NextResponse.json(product, { status: 201 });
}
