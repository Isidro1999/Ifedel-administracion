import {
  getExchangeRateHistory,
  getUsdArsRateSettings,
} from '@/lib/exchange-rate'
import { ExchangeRateSettingsClient } from './ExchangeRateSettingsClient'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const [settings, history] = await Promise.all([
    getUsdArsRateSettings(),
    getExchangeRateHistory({ limit: 50 }),
  ])

  const latest = history[0] ?? null

  return (
    <ExchangeRateSettingsClient
      initial={{
        usdArsRate: settings.usdArsRate,
        updatedAt: settings.updatedAt?.toISOString() ?? null,
        lastSource: latest?.source ?? null,
        lastProviderDate: latest?.providerDate
          ? latest.providerDate.toISOString().slice(0, 10)
          : null,
        lastProviderTime: latest?.providerTime ?? null,
      }}
      history={history.map((row) => ({
        id: row.id,
        rate: row.rate,
        source: row.source,
        previousRate: row.previousRate,
        createdAt: row.createdAt.toISOString(),
        providerDate: row.providerDate
          ? row.providerDate.toISOString().slice(0, 10)
          : null,
        providerTime: row.providerTime,
        createdBy: row.createdBy
          ? {
              name: row.createdBy.name,
              email: row.createdBy.email,
            }
          : null,
      }))}
    />
  )
}
