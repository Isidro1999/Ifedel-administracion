/**
 * Consulta la web oficial del BNA y muestra la cotización parseada.
 * NO actualiza Settings ni crea historial.
 *
 * Uso: npx tsx scripts/verify-bna-exchange-rate.ts
 */
import { fetchBnaUsdBilleteVenta } from '../lib/exchange-rate/bna-client'

function formatDateAR(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${day}/${month}/${year}`
}

async function main() {
  const parsed = await fetchBnaUsdBilleteVenta()
  console.log('Banco Nación')
  console.log('Cotización: Billetes')
  console.log('Moneda: Dólar U.S.A')
  console.log(`Venta: ${parsed.rate}`)
  console.log(`Fecha: ${formatDateAR(parsed.providerDate)}`)
  console.log(`Hora: ${parsed.providerTime}`)
}

main().catch((err) => {
  console.error(
    'Error:',
    err instanceof Error ? err.message : 'falló la verificación',
  )
  process.exitCode = 1
})
