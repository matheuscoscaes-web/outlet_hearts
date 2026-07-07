import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { Package, ShoppingBag, Clock, TrendingUp, Users, ArrowUpRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { SearchInput } from "@/components/admin/SearchInput";
import { OutletTimerControl } from "@/components/admin/OutletTimerControl";
import { Suspense } from "react";

export const revalidate = 0;

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:   { label: "Aguardando", color: "bg-yellow-100 text-yellow-700" },
  PAID:      { label: "Pago",       color: "bg-green-100 text-green-700"  },
  SHIPPED:   { label: "Enviado",    color: "bg-blue-100 text-blue-700"    },
  CANCELLED: { label: "Cancelado",  color: "bg-red-100 text-red-700"      },
  EXPIRED:   { label: "Expirado",   color: "bg-gray-100 text-gray-500"    },
};

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const [
    totalProducts,
    activeReservations,
    paidOrdersCount,
    totalRevenue,
    totalReservations,
    cancelledOrders,
  ] = await Promise.all([
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.reservation.count({ where: { status: "ACTIVE" } }),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.payment.aggregate({ where: { status: "APPROVED" }, _sum: { amount: true } }),
    prisma.reservation.count(),
    prisma.order.count({ where: { status: { in: ["CANCELLED", "EXPIRED"] } } }),
  ]);

  const revenueTotal = Number(totalRevenue._sum.amount ?? 0);
  const avgTicket = paidOrdersCount > 0 ? revenueTotal / paidOrdersCount : 0;
  const conversionRate = totalReservations > 0
    ? Math.round((paidOrdersCount / totalReservations) * 100)
    : 0;

  // Vendas por dia (últimos 14 dias)
  const SALES_WINDOW_DAYS = 14;
  const TZ = "America/Sao_Paulo";
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - (SALES_WINDOW_DAYS - 1));
  windowStart.setHours(0, 0, 0, 0);

  const recentPaidOrders = await prisma.order.findMany({
    where: { status: "PAID", createdAt: { gte: windowStart } },
    select: { createdAt: true, totalAmount: true },
  });

  const salesByDay = new Map<string, { total: number; count: number }>();
  for (const o of recentPaidOrders) {
    const key = o.createdAt.toLocaleDateString("en-CA", { timeZone: TZ });
    const entry = salesByDay.get(key) ?? { total: 0, count: 0 };
    entry.total += Number(o.totalAmount);
    entry.count += 1;
    salesByDay.set(key, entry);
  }

  const dailySales = Array.from({ length: SALES_WINDOW_DAYS }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (SALES_WINDOW_DAYS - 1 - i));
    const key = d.toLocaleDateString("en-CA", { timeZone: TZ });
    const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: TZ });
    const entry = salesByDay.get(key) ?? { total: 0, count: 0 };
    return { key, label, total: entry.total, count: entry.count };
  });

  const maxDailyTotal = Math.max(1, ...dailySales.map((d) => d.total));
  const periodTotal = dailySales.reduce((sum, d) => sum + d.total, 0);
  const periodOrders = dailySales.reduce((sum, d) => sum + d.count, 0);

  // Produtos mais vendidos
  const bestSellersRaw = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { order: { status: "PAID" } },
    _sum: { quantity: true, totalPrice: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 8,
  });

  const bestSellerProducts = await prisma.product.findMany({
    where: { id: { in: bestSellersRaw.map((b) => b.productId) } },
    include: { images: { take: 1, orderBy: { order: "asc" } } },
  });

  const bestSellers = bestSellersRaw.map((b) => ({
    ...b,
    product: bestSellerProducts.find((p) => p.id === b.productId)!,
  })).filter((b) => b.product);

  // Pedidos com busca
  const orders = await prisma.order.findMany({
    where: q
      ? {
          OR: [
            { customerName: { contains: q, mode: "insensitive" } },
            { customerEmail: { contains: q, mode: "insensitive" } },
            { items: { some: { product: { name: { contains: q, mode: "insensitive" } } } } },
          ],
        }
      : undefined,
    include: {
      items: { include: { product: { include: { images: { take: 1 } } } } },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const stats = [
    {
      label: "Receita total",
      value: formatCurrency(revenueTotal),
      icon: TrendingUp,
      color: "text-brand-600 bg-brand-50",
      sub: `${paidOrdersCount} pedidos pagos`,
    },
    {
      label: "Ticket médio",
      value: formatCurrency(avgTicket),
      icon: ArrowUpRight,
      color: "text-green-600 bg-green-50",
      sub: "por pedido pago",
    },
    {
      label: "Reservas ativas",
      value: activeReservations,
      icon: Clock,
      color: "text-amber-600 bg-amber-50",
      sub: `${conversionRate}% taxa de conversão`,
    },
    {
      label: "Produtos ativos",
      value: totalProducts,
      icon: Package,
      color: "text-blue-600 bg-blue-50",
      sub: `${cancelledOrders} pedidos cancelados`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link
          href="/admin/produtos/novo"
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-3 sm:px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors whitespace-nowrap"
        >
          <Package className="h-4 w-4" />
          <span className="hidden sm:inline">Novo produto</span>
          <span className="sm:hidden">Novo</span>
        </Link>
      </div>

      <OutletTimerControl />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className={`inline-flex rounded-lg p-2 ${color} mb-3`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Vendas por dia */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">Vendas por dia</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatCurrency(periodTotal)} em {periodOrders} {periodOrders === 1 ? "pedido" : "pedidos"} · últimos {SALES_WINDOW_DAYS} dias
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-end gap-1.5 sm:gap-2 h-40">
          {dailySales.map((d) => {
            const heightPct = d.total > 0 ? Math.max(4, Math.round((d.total / maxDailyTotal) * 100)) : 3;
            return (
              <div key={d.key} className="group relative flex-1 flex flex-col items-center justify-end h-full">
                <div className="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 z-10">
                  {d.label} · {formatCurrency(d.total)} · {d.count} {d.count === 1 ? "pedido" : "pedidos"}
                </div>
                <div
                  className={`w-full max-w-[24px] rounded-t transition-colors ${d.total > 0 ? "bg-brand-600 group-hover:bg-brand-700" : "bg-gray-100"}`}
                  style={{ height: `${heightPct}%` }}
                />
                <span className="mt-1.5 text-[10px] text-gray-400 tabular-nums">{d.label}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-5 max-h-56 overflow-y-auto rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2">Data</th>
                <th className="text-center px-4 py-2">Pedidos</th>
                <th className="text-right px-4 py-2">Receita</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...dailySales].reverse().map((d) => (
                <tr key={d.key} className={d.total > 0 ? "" : "text-gray-400"}>
                  <td className="px-4 py-2 tabular-nums">{d.label}</td>
                  <td className="px-4 py-2 text-center tabular-nums">{d.count}</td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums text-brand-600">
                    {d.total > 0 ? formatCurrency(d.total) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Produtos mais vendidos */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-brand-600" />
            <h2 className="font-semibold text-gray-900">Produtos mais vendidos</h2>
          </div>
          <Link href="/admin/pedidos" className="text-xs text-brand-600 hover:underline">Ver pedidos</Link>
        </div>

        {bestSellers.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400">Nenhuma venda registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">#</th>
                <th className="text-left px-5 py-3">Produto</th>
                <th className="text-center px-5 py-3">Unidades vendidas</th>
                <th className="text-right px-5 py-3">Receita gerada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bestSellers.map((b, i) => {
                const img = b.product.images[0];
                return (
                  <tr key={b.productId} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-bold text-gray-400">#{i + 1}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-9 w-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {img ? (
                            <Image src={img.url} alt={b.product.name} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-gray-300">📦</div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 line-clamp-1">{b.product.name}</p>
                          <p className="text-xs text-gray-400">{b.product.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-600">
                        {b._sum.quantity ?? 0} un.
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(Number(b._sum.totalPrice ?? 0))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Pedidos com busca */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-600" />
            <h2 className="font-semibold text-gray-900">Pedidos</h2>
            {q && <span className="text-xs text-gray-400">— buscando "{q}"</span>}
          </div>
          <div className="w-full sm:w-72">
            <Suspense>
              <SearchInput placeholder="Buscar por cliente, e-mail ou produto..." />
            </Suspense>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">ID</th>
                <th className="text-left px-5 py-3">Cliente</th>
                <th className="text-left px-5 py-3">Produto</th>
                <th className="text-right px-5 py-3">Total</th>
                <th className="text-center px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => {
                const st = STATUS_LABELS[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-500" };
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">
                      #{order.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{order.customerName}</p>
                      <p className="text-xs text-gray-400">{order.customerEmail}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-600 max-w-[180px] truncate">
                      {order.items[0]?.product.name ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-brand-600">
                      {formatCurrency(Number(order.totalAmount))}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                    {q ? `Nenhum resultado para "${q}"` : "Nenhum pedido ainda."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
