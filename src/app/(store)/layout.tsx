import { Navbar } from "@/components/store/Navbar";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50">{children}</main>
      <footer className="border-t border-gray-200 bg-white py-8 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} OutletHearts — Todos os direitos reservados</p>
        <p className="mt-1">🔒 Compra segura · Pagamento processado pelo Mercado Pago</p>
      </footer>
    </>
  );
}
