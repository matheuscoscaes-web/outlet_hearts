import Link from "next/link";
import { Navbar } from "@/components/store/Navbar";
import { OutletBanner } from "@/components/store/OutletBanner";
import { ShieldCheck, Truck, CreditCard } from "lucide-react";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="sticky top-0 z-50">
        <Navbar />
        <OutletBanner />
      </div>
      <main className="min-h-screen bg-gray-50">{children}</main>
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:py-10">
          <div className="grid grid-cols-3 gap-2 sm:gap-6 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-3">
              <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-brand-600 shrink-0" />
              <span className="text-[10px] sm:text-sm text-gray-600 leading-tight">Compra segura</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-3">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-brand-600 shrink-0" />
              <span className="text-[10px] sm:text-sm text-gray-600 leading-tight">Pix, cartão e boleto</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-3">
              <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-brand-600 shrink-0" />
              <span className="text-[10px] sm:text-sm text-gray-600 leading-tight">Frete no checkout</span>
            </div>
          </div>

          <div className="mt-3 sm:mt-8 flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-3 border-t border-gray-100 pt-3 sm:pt-6 text-center sm:text-left">
            <p className="text-[10px] sm:text-xs text-gray-400">
              © {new Date().getFullYear()} Hearts Couro — Todos os direitos reservados
            </p>
            <Link href="/produtos" className="text-[10px] sm:text-xs font-medium text-brand-600 hover:underline">
              Ver todos os produtos
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
