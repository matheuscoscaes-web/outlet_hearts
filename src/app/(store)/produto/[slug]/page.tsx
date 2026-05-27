import { notFound } from "next/navigation";
import { calcDiscount } from "@/lib/utils";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import ProductDetail from "./ProductDetail";

export const revalidate = 0;

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let product = null;

  try {
    const { prisma } = await import("@/lib/prisma");
    const dbProduct = await prisma.product.findUnique({
      where: { slug },
      include: { images: { orderBy: { order: "asc" } }, stock: true },
    });
    if (dbProduct && dbProduct.status !== "INACTIVE") {
      const quantityAvailable = dbProduct.stock
        ? Math.max(0, dbProduct.stock.quantityTotal - dbProduct.stock.quantityReserved - dbProduct.stock.quantitySold)
        : 0;
      product = {
        ...dbProduct,
        originalPrice: Number(dbProduct.originalPrice),
        outletPrice: Number(dbProduct.outletPrice),
        quantityAvailable,
      };
    }
  } catch {
    const mock = MOCK_PRODUCTS.find((p) => p.slug === slug);
    if (mock) product = mock;
  }

  if (!product) notFound();

  const discount = calcDiscount(product.originalPrice, product.outletPrice);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <ProductDetail product={product} discount={discount} />
      </div>
    </div>
  );
}
