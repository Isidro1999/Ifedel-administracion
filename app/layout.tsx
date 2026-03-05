import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { AuthGuard } from "@/components/AuthGuard";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Base de Productos - IFEDEL",
  description: "Sistema de gestión de productos y cotizaciones",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="es">
      <body className="antialiased">
        <AuthGuard session={session}>
          <AppHeader />
          <main>{children}</main>
        </AuthGuard>
      </body>
    </html>
  );
}
