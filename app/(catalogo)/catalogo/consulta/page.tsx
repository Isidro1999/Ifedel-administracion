import { InquiryPageClient } from '@/components/catalog/InquiryPageClient'
import { IFEDelBrand } from '@/lib/ifedel-brand'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lista de consulta',
  description: `Armá tu lista de productos y consultá a ${IFEDelBrand.companyName} por WhatsApp.`,
}

export default function CatalogoConsultaPage() {
  return <InquiryPageClient />
}
