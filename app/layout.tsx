import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import "./globals.css";
import { AuthGuard } from "@/components/AuthGuard";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
  display: "swap",
});

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
    <html lang="es" className={raleway.variable}>
      <body className="antialiased font-sans">
        <AuthGuard session={session}>
          <AppShell>{children}</AppShell>
        </AuthGuard>
      </body>
    </html>
  );
}

