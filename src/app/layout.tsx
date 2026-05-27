import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OutletHearts — Outlet com Estoque Limitado",
  description: "Produtos outlet com preços imperdíveis. Estoque limitado — quem chegar primeiro leva!",
  openGraph: {
    title: "OutletHearts",
    description: "Outlet com estoque limitado. Compre antes que acabe!",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className={`${inter.className} min-h-full bg-gray-50`}>{children}</body>
    </html>
  );
}
