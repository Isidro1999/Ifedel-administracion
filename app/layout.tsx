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

function isCatalogUiRequest(headerList: Headers): boolean {
  const pathname = headerList.get("x-pathname") || "";
  // Nunca tratar /api/* como catálogo UI (incluye /api/products).
  if (pathname.startsWith("/api")) return false;

  const forceCatalog = headerList.get("x-ifedel-catalog") === "1";
  const catalogRoute = headerList.get("x-ifedel-catalog-route") === "1";
  const isCatalogPath =
    pathname === "/catalogo" || pathname.startsWith("/catalogo/");

  return forceCatalog || catalogRoute || isCatalogPath;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = headers();
  const isCatalogRoute = isCatalogUiRequest(headerList);

  // Catálogo público UI: no resolver sesión (ahorra roundtrip Auth/DB).
  // Las APIs /api/products* NO pasan por este bypass: usan requireApprovedSession().
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
