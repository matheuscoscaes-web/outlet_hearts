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
  size: string | null;
  color: string | null;
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
          <div className="flex gap-2">
            {product.images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setSelectedImg(i)}
                className={`relative h-16 w-16 rounded-lg overflow-hidden border-2 transition-colors ${i === selectedImg ? "border-rose-500" : "border-gray-200"}`}
              >
                <Image src={img.url} alt={img.altText ?? ""} fill className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Coluna de informações */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="discount">-{discount}% OFF</Badge>
          {product.quantityAvailable <= 3 && !isSoldOut && (
            <Badge variant="warning">⚡ Últimas {product.quantityAvailable} unidades</Badge>
          )}
        </div>

        <div>
          <p className="text-sm text-gray-500">{product.brand} · {product.category}</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{product.name}</h1>
          <p className="mt-2 text-gray-600">{product.shortDescription}</p>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          {product.size && <span>📏 <strong>Tamanho:</strong> {product.size}</span>}
          {product.color && <span>🎨 <strong>Cor:</strong> {product.color}</span>}
        </div>

        <div className="rounded-xl bg-rose-50 p-4">
          <p className="text-sm text-gray-500 line-through">{formatCurrency(product.originalPrice)}</p>
          <p className="text-3xl font-bold text-rose-600">{formatCurrency(product.outletPrice)}</p>
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
            🔒 Ao clicar, o produto será reservado por 10 minutos para você
          </p>
        )}

        {/* Descrição */}
        <div className="border-t border-gray-200 pt-4 mt-2">
          <h2 className="font-semibold text-gray-900 mb-2">Descrição completa</h2>
          <div className="prose prose-sm text-gray-600 whitespace-pre-line">{product.description}</div>
        </div>
      </div>
    </>
  );
}
