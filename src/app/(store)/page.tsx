import { ProductCard } from "@/components/store/ProductCard";
import { calcAvailable } from "@/lib/utils";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import Link from "next/link";
import type { Product, ProductImage, Stock } from "@prisma/client";

export const revalidate = 30;

type ProductWithRelations = Product & {
  images: ProductImage[];
  stock: Stock | null;
};

async function getProducts() {
  try {
    const { prisma } = await import("@/lib/prisma");
    const products = await prisma.product.findMany({
      where: { status: { not: "INACTIVE" } },
      include: { images: { orderBy: { order: "asc" } }, stock: true },
      orderBy: { createdAt: "desc" },
    });
    return (products as ProductWithRelations[]).map((p) => ({
      ...p,
      originalPrice: Number(p.originalPrice),
      outletPrice: Number(p.outletPrice),
      quantityAvailable: p.stock
        ? calcAvailable(p.stock.quantityTotal, p.stock.quantityReserved, p.stock.quantitySold)
        : 0,
    }));
  } catch {
    return MOCK_PRODUCTS;
  }
}

export default async function HomePage() {
  const mapped = await getProducts();
  const available = mapped.filter((p) => p.status !== "SOLD_OUT");
  const soldOut = mapped.filter((p) => p.status === "SOLD_OUT");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-10 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 p-8 text-white">
        <h1 className="text-3xl font-bold md:text-4xl">Outlet com Estoque Limitado</h1>
        <p className="mt-2 text-rose-100 text-lg">
          Preços imperdíveis · Quem chegar primeiro leva · Reserva automática de 10 minutos
        </p>
        <div className="mt-4 flex gap-3 text-sm flex-wrap">
          <span className="rounded-full bg-white/20 px-3 py-1">🔥 {available.length} produtos disponíveis</span>
          <span className="rounded-full bg-white/20 px-3 py-1">⚡ Frete calculado no checkout</span>
        </div>
      </div>

      {available.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold text-gray-900">Disponíveis agora</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {available.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {soldOut.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-gray-400">Esgotados</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 opacity-60">
            {soldOut.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {mapped.length === 0 && (
        <div className="py-24 text-center text-gray-500">
          <p className="text-5xl mb-4">🛍️</p>
          <p className="text-lg font-medium">Nenhum produto disponível no momento.</p>
        </div>
      )}

      <div className="mt-6 text-right">
        <Link href="/produtos" className="text-sm text-rose-600 hover:underline font-medium">
          Ver todos os produtos →
        </Link>
      </div>
    </div>
  );
}
