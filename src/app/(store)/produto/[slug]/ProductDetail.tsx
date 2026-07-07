"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  category: string;
  brand: string | null;
  sizes: string[];
  colors: string[];
  condition: string;
  originalPrice: number;
  outletPrice: number;
  status: string;
  quantityAvailable: number;
  images: { id: string; url: string; altText: string | null }[];
}

export default function ProductDetail({ product, discount }: { product: Product; discount: number }) {
  const router = useRouter();
  const [selectedImg, setSelectedImg] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isSoldOut = product.status === "SOLD_OUT" || product.quantityAvailable === 0;

  async function handleBuy() {
    setLoading(true);
    setError("");

    // Gera ou recupera token do cliente
    let clientToken = sessionStorage.getItem("client_token");
    if (!clientToken) {
      clientToken = `ct_${crypto.randomUUID().replace(/-/g, "")}`;
      sessionStorage.setItem("client_token", clientToken);
    }

    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, quantity: 1, clientToken }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Erro ao reservar produto. Tente novamente.");
      setLoading(false);
      return;
    }

    router.push(`/checkout?reservationId=${data.id}`);
  }

  return (
    <>
      {/* Coluna de imagens */}
      <div className="flex flex-col gap-3">
        <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
          {product.images[selectedImg] ? (
            <Image
              src={product.images[selectedImg].url}
              alt={product.images[selectedImg].altText ?? product.name}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-300 text-6xl">📦</div>
          )}
        </div>
        {product.images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {product.images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setSelectedImg(i)}
                className={`relative h-16 w-16 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${i === selectedImg ? "border-brand-500" : "border-gray-200"}`}
              >
                <Image src={img.url} alt={img.altText ?? ""} fill className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Coluna de informações */}
      <div className="flex flex-col gap-4 pb-24 md:pb-0">
        <div className="flex flex-wrap gap-2">
          <Badge variant="discount">-{discount}% OFF</Badge>
          {product.quantityAvailable <= 3 && !isSoldOut && (
            <Badge variant="warning">⚡ Últimas {product.quantityAvailable} unidades</Badge>
          )}
        </div>

        <div>
          <p className="text-sm text-gray-500">{product.brand} · {product.category}</p>
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-gray-900 mt-1">{product.name}</h1>
          <p className="mt-2 text-gray-600">{product.shortDescription}</p>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          {product.sizes.length > 0 && (
            <span>📏 <strong>{product.sizes.length > 1 ? "Tamanhos" : "Tamanho"}:</strong> {product.sizes.join(", ")}</span>
          )}
          {product.colors.length > 0 && (
            <span>🎨 <strong>{product.colors.length > 1 ? "Cores" : "Cor"}:</strong> {product.colors.join(", ")}</span>
          )}
        </div>

        <div className="rounded-xl bg-brand-50 p-4">
          <p className="text-sm text-gray-500 line-through">{formatCurrency(product.originalPrice)}</p>
          <p className="text-3xl font-bold text-brand-600 tabular-nums">{formatCurrency(product.outletPrice)}</p>
          <p className="text-sm text-green-700 mt-1 font-medium">
            Você economiza {formatCurrency(product.originalPrice - product.outletPrice)}
          </p>
        </div>

        {!isSoldOut && (
          <p className="text-sm text-gray-500">
            📦 {product.quantityAvailable} {product.quantityAvailable === 1 ? "unidade disponível" : "unidades disponíveis"}
          </p>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* CTA fixo no mobile, inline no desktop */}
        <div className="hidden md:flex md:flex-col md:gap-3">
          <Button
            size="lg"
            onClick={handleBuy}
            loading={loading}
            disabled={isSoldOut}
            className="w-full"
          >
            {isSoldOut ? "Produto esgotado" : loading ? "Reservando..." : "⚡ Comprar agora"}
          </Button>
          {!isSoldOut && (
            <p className="text-xs text-center text-gray-500">
              🔒 Ao clicar, o produto será reservado por 6 minutos para você
            </p>
          )}
        </div>

        <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur px-4 pt-3 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 line-through leading-tight">{formatCurrency(product.originalPrice)}</p>
              <p className="text-lg font-bold text-brand-600 leading-tight tabular-nums">{formatCurrency(product.outletPrice)}</p>
            </div>
            <Button
              size="lg"
              onClick={handleBuy}
              loading={loading}
              disabled={isSoldOut}
              className="flex-1"
            >
              {isSoldOut ? "Esgotado" : loading ? "Reservando..." : "⚡ Comprar agora"}
            </Button>
          </div>
        </div>

        {/* Descrição */}
        <div className="border-t border-gray-200 pt-4 mt-2">
          <h2 className="font-heading font-semibold text-lg text-gray-900 mb-2">Descrição completa</h2>
          <div className="prose prose-sm text-gray-600 whitespace-pre-line">{product.description}</div>
        </div>
      </div>
    </>
  );
}
