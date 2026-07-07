import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Edit } from "lucide-react";
import { formatCurrency, calcDiscount, calcProductAvailable } from "@/lib/utils";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import StockAdjustModal from "./StockAdjustModal";
import { StatusToggle } from "@/components/admin/StatusToggle";
import type { Product, ProductImage, Stock, ProductVariant } from "@prisma/client";

export const revalidate = 0;

type ProductWithRelations = Product & {
  images: ProductImage[];
  stock: Stock | null;
  variants: ProductVariant[];
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const products = await prisma.product.findMany({
    where: status ? { status: status as "ACTIVE" | "INACTIVE" | "SOLD_OUT" } : undefined,
    include: { images: { take: 1, orderBy: { order: "asc" } }, stock: true, variants: true },
    orderBy: { createdAt: "desc" },
  });

  const tabs = [
    { label: "Todos", value: "" },
    { label: "Ativos", value: "ACTIVE" },
    { label: "Inativos", value: "INACTIVE" },
    { label: "Esgotados", value: "SOLD_OUT" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Produtos</h1>
        <Link href="/admin/produtos/novo">
          <Button>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo produto</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 mb-4 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/produtos${tab.value ? `?status=${tab.value}` : ""}`}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${status === tab.value || (!status && !tab.value) ? "bg-brand-600 text-white border-brand-600" : "border-gray-300 text-gray-700 hover:border-brand-400"}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Produto</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Preço outlet</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Desconto</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Estoque</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(products as ProductWithRelations[]).map((p) => {
              const available = calcProductAvailable(p.stock, p.variants);
              const total = p.variants.length > 0
                ? p.variants.reduce((sum, v) => sum + v.quantityTotal, 0)
                : p.stock?.quantityTotal;
              const discount = calcDiscount(Number(p.originalPrice), Number(p.outletPrice));
              const img = p.images[0];

              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {img ? (
                          <Image src={img.url} alt={p.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-gray-300 text-lg">📦</div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 line-clamp-1">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-brand-600">
                    {formatCurrency(Number(p.outletPrice))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">-{discount}%</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-mono text-sm font-bold ${available === 0 ? "text-red-600" : available <= 3 ? "text-amber-600" : "text-green-700"}`}>
                      {available}
                    </span>
                    {total !== undefined && <span className="text-xs text-gray-400"> / {total}</span>}
                    {p.variants.length > 0 && (
                      <p className="text-[10px] text-gray-400">por cor</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusToggle
                      productId={p.id}
                      productName={p.name}
                      currentStatus={p.status}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {p.variants.length === 0 && (
                        <StockAdjustModal productId={p.id} productName={p.name} currentStock={p.stock?.quantityTotal ?? 0} />
                      )}
                      <Link href={`/admin/produtos/${p.id}`}>
                        <button className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50">
                          <Edit className="h-4 w-4" />
                        </button>
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
