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

  return (
    <ExchangeRateSettingsClient
      initial={{
        usdArsRate: settings.usdArsRate,
        updatedAt: settings.updatedAt?.toISOString() ?? null,
      }}
      history={history.map((row) => ({
        id: row.id,
        rate: row.rate,
        source: row.source,
        previousRate: row.previousRate,
        createdAt: row.createdAt.toISOString(),
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
