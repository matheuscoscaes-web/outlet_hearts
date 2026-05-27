import { ProductCard } from "@/components/store/ProductCard";
import { calcAvailable, CATEGORY_OPTIONS } from "@/lib/utils";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import type { Product, ProductImage, Stock } from "@prisma/client";

export const revalidate = 30;

type ProductWithRelations = Product & {
  images: ProductImage[];
  stock: Stock | null;
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;

  let mapped: typeof MOCK_PRODUCTS = [];

  try {
    const { prisma } = await import("@/lib/prisma");
    const products = await prisma.product.findMany({
      where: {
        status: { not: "INACTIVE" },
        ...(categoria ? { category: categoria } : {}),
      },
      include: { images: { orderBy: { order: "asc" } }, stock: true },
      orderBy: { createdAt: "desc" },
    });
    mapped = (products as ProductWithRelations[]).map((p) => ({
      ...p,
      originalPrice: Number(p.originalPrice),
      outletPrice: Number(p.outletPrice),
      quantityAvailable: p.stock
        ? calcAvailable(p.stock.quantityTotal, p.stock.quantityReserved, p.stock.quantitySold)
        : 0,
    }));
  } catch {
    mapped = categoria
      ? MOCK_PRODUCTS.filter((p) => p.category === categoria)
      : MOCK_PRODUCTS;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Todos os produtos</h1>
      <p className="text-gray-500 mb-6 text-sm">{mapped.length} produtos encontrados</p>

      <div className="mb-6 flex flex-wrap gap-2">
        <a
          href="/produtos"
          className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${!categoria ? "bg-rose-600 text-white border-rose-600" : "border-gray-300 text-gray-700 hover:border-rose-400"}`}
        >
          Todos
        </a>
        {CATEGORY_OPTIONS.map((cat) => (
          <a
            key={cat}
            href={`/produtos?categoria=${encodeURIComponent(cat)}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${categoria === cat ? "bg-rose-600 text-white border-rose-600" : "border-gray-300 text-gray-700 hover:border-rose-400"}`}
          >
            {cat}
          </a>
        ))}
      </div>

      {mapped.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {mapped.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center text-gray-500">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium">Nenhum produto nessa categoria no momento.</p>
        </div>
      )}
    </div>
  );
}
