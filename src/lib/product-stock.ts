import { prisma } from "@/lib/prisma";
import { calcAvailable } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

type Client = typeof prisma | Prisma.TransactionClient;

/**
 * Disponibilidade de um produto: se ele tiver variantes por cor
 * cadastradas, soma a disponibilidade delas; senão usa o Stock
 * (por produto) legado. Um produto só passa a usar variantes quando
 * o admin cadastra a primeira cor com estoque — até lá, nada muda.
 */
export async function getProductAvailability(productId: string, client: Client = prisma): Promise<number> {
  const variants = await client.productVariant.findMany({ where: { productId } });

  if (variants.length > 0) {
    return variants.reduce(
      (sum, v) => sum + calcAvailable(v.quantityTotal, v.quantityReserved, v.quantitySold),
      0
    );
  }

  const stock = await client.stock.findUnique({ where: { productId } });
  return stock ? calcAvailable(stock.quantityTotal, stock.quantityReserved, stock.quantitySold) : 0;
}

export async function productUsesVariants(productId: string, client: Client = prisma): Promise<boolean> {
  const count = await client.productVariant.count({ where: { productId } });
  return count > 0;
}
