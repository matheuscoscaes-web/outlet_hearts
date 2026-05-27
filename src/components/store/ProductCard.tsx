"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, calcDiscount } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  slug: string;
  outletPrice: number;
  originalPrice: number;
  condition: string;
  quantityAvailable: number;
  stock?: { quantityTotal: number; quantityReserved: number; quantitySold: number } | null;
  images: { url: string; altText?: string | null }[];
  status: string;
}

export function ProductCard({ product }: { product: Product }) {
  const discount = calcDiscount(product.originalPrice, product.outletPrice);
  const image = product.images[0];
  const isSoldOut = product.status === "SOLD_OUT" || product.quantityAvailable === 0;
  const isLastUnits = !isSoldOut && product.quantityAvailable <= 3;
  const totalReserved = product.stock?.quantityReserved ?? 0;
  const isAllReserved =
    !isSoldOut &&
    product.quantityAvailable === 0 &&
    totalReserved > 0;

  return (
    <div className="group relative flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        <Badge variant="discount">-{discount}% OFF</Badge>
        {isLastUnits && <Badge variant="warning">⚡ Últimas unidades</Badge>}
        {isAllReserved && <Badge variant="reserved">⏳ Reservado</Badge>}
      </div>

      {/* Imagem */}
      <Link href={`/produto/${product.slug}`} className="relative block aspect-square overflow-hidden bg-gray-100">
        {image ? (
          <Image
            src={image.url}
            alt={image.altText ?? product.name}
            fill
            className={`object-cover transition-transform group-hover:scale-105 ${isSoldOut ? "grayscale opacity-60" : ""}`}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300 text-4xl">📦</div>
        )}
        {isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="rounded bg-black/70 px-3 py-1 text-sm font-bold text-white">ESGOTADO</span>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex flex-col gap-2 p-3">
        <Link href={`/produto/${product.slug}`}>
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 hover:text-rose-600 transition-colors">
            {product.name}
          </h3>
        </Link>
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 line-through">{formatCurrency(product.originalPrice)}</span>
          <span className="text-lg font-bold text-rose-600">{formatCurrency(product.outletPrice)}</span>
        </div>
        {!isSoldOut && (
          <p className="text-xs text-gray-500">
            {product.quantityAvailable} {product.quantityAvailable === 1 ? "unidade" : "unidades"} disponíveis
          </p>
        )}
        <Link href={`/produto/${product.slug}`}>
          <Button
            className="w-full"
            disabled={isSoldOut}
            variant={isSoldOut ? "secondary" : "primary"}
          >
            {isSoldOut ? "Esgotado" : "Comprar agora"}
          </Button>
        </Link>
      </div>
    </div>
  );
}
