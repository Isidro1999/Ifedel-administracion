import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import "./globals.css";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell } from "@/components/layout/AppShell";
import { IFEDelBrand } from "@/lib/ifedel-brand";

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
  display: "swap",
});

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Base de Productos - IFEDEL",
  description: "Sistema de gestión de productos y cotizaciones",
  icons: {
    icon: IFEDelBrand.logo.src,
    apple: IFEDelBrand.logo.src,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={raleway.variable}>
      <body className="antialiased font-sans">
        <AuthGuard>
          <AppShell>{children}</AppShell>
        </AuthGuard>
      </body>
    </html>
  );
}

