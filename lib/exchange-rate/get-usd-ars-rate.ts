import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type UsdArsRateSettings = {
  usdArsRate: number | null
  updatedAt: Date | null
}

/** Prisma global o transaction client — solo requiere acceso a Settings. */
export type SettingsDbClient = Pick<PrismaClient, 'settings'> | Prisma.TransactionClient

/** Lectura del TC global vigente (Settings singleton). */
export async function getUsdArsRateSettings(
  db?: SettingsDbClient,
): Promise<UsdArsRateSettings> {
  const client = db ?? prisma
  const settings = await client.settings.findFirst()
  if (!settings) {
    return { usdArsRate: null, updatedAt: null }
  }
  return {
    usdArsRate: settings.usdArsRate,
    updatedAt: settings.updatedAt,
  }
}
