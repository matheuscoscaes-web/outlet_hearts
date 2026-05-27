"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, LayoutDashboard, Package, ShoppingBag, Clock, LogOut } from "lucide-react";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/produtos", label: "Produtos", icon: Package },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/admin/reservas", label: "Reservas", icon: Clock },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100">
        <Heart className="h-5 w-5 fill-rose-600 text-rose-600" />
        <span className="font-bold text-gray-900 text-sm">
          Outlet<span className="text-rose-600">Hearts</span>
          <span className="block text-xs font-normal text-gray-400">Painel Admin</span>
        </span>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-rose-50 text-rose-700" : "text-gray-600 hover:bg-gray-50"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
