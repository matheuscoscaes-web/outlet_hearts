import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: { images: { orderBy: { order: "asc" } }, stock: true, variants: true },
  });

  if (!product) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Editar produto</h1>
      <ProductForm
        initialData={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          shortDescription: product.shortDescription,
          description: product.description,
          category: product.category,
          brand: product.brand ?? undefined,
          sizes: product.sizes,
          colors: product.colors,
          condition: product.condition,
          originalPrice: Number(product.originalPrice),
          outletPrice: Number(product.outletPrice),
          status: product.status,
          images: product.images.map((img) => ({
            id: img.id,
            url: img.url,
            altText: img.altText,
            color: img.color,
          })),
          stock: product.stock
            ? { quantityTotal: product.stock.quantityTotal }
            : undefined,
          variants: product.variants.map((v) => ({
            id: v.id,
            color: v.color,
            size: v.size,
            quantityTotal: v.quantityTotal,
          })),
        }}
      />
    </div>
  );
}
