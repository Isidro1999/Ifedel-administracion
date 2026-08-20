import { InquiryPageClient } from '@/components/catalog/InquiryPageClient'
import { IFEDelBrand } from '@/lib/ifedel-brand'
import {
  catalogCanonicalPath,
  catalogNoindexFollowRobots,
} from '@/lib/catalog-seo'
import type { Metadata } from 'next'

/**
 * Página utilitaria (lista de consulta): noindex, follow.
 * Canonical a sí misma para evitar señales ambiguas si se enlaza con params.
 */
export const metadata: Metadata = {
  title: 'Lista de consulta',
  description: `Armá tu lista de productos y consultá a ${IFEDelBrand.companyName} por WhatsApp o solicitá contacto directo.`,
  robots: catalogNoindexFollowRobots,
  alternates: {
    canonical: catalogCanonicalPath('/consulta'),
  },
}

export default function CatalogoConsultaPage() {
  return <InquiryPageClient />
}
