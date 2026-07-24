import { MapaGanaderoView } from '@/components/mapa-ganadero/MapaGanaderoView'
import { requireApprovedPage } from '@/lib/session-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function MapaGanaderoPage() {
  await requireApprovedPage()
  return <MapaGanaderoView />
}
