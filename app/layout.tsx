import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { RootShell } from "@/components/layout/RootShell";
import { IFEDelBrand } from "@/lib/ifedel-brand";
import { auth } from "@/auth";

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Base de Productos - IFEDEL",
  description: "Sistema de gestión de productos y cotizaciones",
  icons: {
    icon: IFEDelBrand.logo.src,
    apple: IFEDelBrand.logo.src,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = headers();
  const forceCatalog = headerList.get("x-ifedel-catalog") === "1";
  const isCatalogRoute =
    forceCatalog || headerList.get("x-ifedel-catalog-route") === "1";

  // Catálogo público: no resolver sesión (ahorra roundtrip Auth/DB).
  const session = isCatalogRoute ? null : await auth();

  return (
    <html lang="es" className={raleway.variable}>
      <body className="antialiased font-sans">
        <RootShell session={session} forceCatalog={isCatalogRoute}>
          {children}
        </RootShell>
      </body>
    </html>
  );
}
