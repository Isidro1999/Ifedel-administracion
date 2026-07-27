import { requireApprovedPage } from '@/lib/session-auth'

/**
 * Gate server-side para todo el segmento /products (incluye páginas client).
 * Sin sesión APPROVED no se ejecuta Prisma ni se hidrata UI con datos.
 */
export default async function ProductsSegmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireApprovedPage()
  return children
}
