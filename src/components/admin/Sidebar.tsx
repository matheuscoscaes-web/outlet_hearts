"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, LayoutDashboard, Package, ShoppingBag, Clock, FileBarChart, LogOut, Menu, X } from "lucide-react";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/produtos", label: "Produtos", icon: Package },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/admin/reservas", label: "Reservas", icon: Clock },
  { href: "/admin/relatorios", label: "Relatórios", icon: FileBarChart },
];

function Brand() {
  return (
    <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100">
      <Heart className="h-5 w-5 fill-brand-600 text-brand-600" />
      <span className="font-bold text-gray-900 text-sm">
        Outlet<span className="text-brand-600">Hearts</span>
        <span className="block text-xs font-normal text-gray-400">Painel Admin</span>
      </span>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 p-3 space-y-1">
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <>
      {/* Barra superior mobile */}
      <header className="flex md:hidden items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 fill-brand-600 text-brand-600" />
          <span className="font-bold text-gray-900 text-sm">
            Outlet<span className="text-brand-600">Hearts</span>
          </span>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Drawer mobile */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[80vw] flex flex-col bg-white shadow-xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-5">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 fill-brand-600 text-brand-600" />
                <span className="font-bold text-gray-900 text-sm">
                  Outlet<span className="text-brand-600">Hearts</span>
                </span>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Fechar menu" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
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
        </div>
      )}

      {/* Sidebar fixa no desktop */}
      <aside className="hidden md:flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
        <Brand />
        <NavLinks />
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
    </>
  );
}
