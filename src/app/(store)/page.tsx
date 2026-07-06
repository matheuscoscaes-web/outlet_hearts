import { ProductCard } from "@/components/store/ProductCard";
import { calcAvailable } from "@/lib/utils";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import Link from "next/link";
import { Timer, ShieldCheck, Flame } from "lucide-react";
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
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <div className="mb-8 sm:mb-10 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800 px-5 py-8 text-white sm:px-10 sm:py-12">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
          <Flame className="h-3.5 w-3.5" />
          Outlet oficial
        </span>
        <h1 className="font-heading mt-3 text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
          Peças de couro legítimo,<br className="hidden sm:block" /> preço de outlet
        </h1>
        <p className="mt-3 max-w-xl text-brand-100 text-base sm:text-lg">
          Estoque limitado e conferido peça a peça. Quem chegar primeiro leva — reservamos seu item por 6 minutos no checkout.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5">
            <Flame className="h-3.5 w-3.5" /> {available.length} produtos disponíveis
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5">
            <Timer className="h-3.5 w-3.5" /> Reserva de 6 minutos
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Pagamento seguro
          </span>
        </div>
      </div>

      {available.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-heading text-xl sm:text-2xl font-semibold text-gray-900">Disponíveis agora</h2>
            <Link href="/produtos" className="text-sm text-brand-600 hover:underline font-medium whitespace-nowrap">
              Ver todos →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {available.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {soldOut.length > 0 && (
        <section className="mt-10 sm:mt-12">
          <h2 className="font-heading mb-4 text-xl font-semibold text-gray-400">Esgotados</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4 opacity-60">
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
    </div>
  );
}
