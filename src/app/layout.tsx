import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OutletHearts — Outlet com Estoque Limitado",
  description: "Produtos outlet com preços imperdíveis. Estoque limitado — quem chegar primeiro leva!",
  openGraph: {
    title: "OutletHearts",
    description: "Outlet com estoque limitado. Compre antes que acabe!",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7a4506",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`h-full ${fraunces.variable}`}>
      <body className={`${inter.className} min-h-full bg-gray-50 antialiased`}>{children}</body>
    </html>
  );
}
