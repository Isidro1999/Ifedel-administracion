import { prisma } from '@/lib/prisma'

export type UsdArsRateSettings = {
  usdArsRate: number | null
  updatedAt: Date | null
}

/** Lectura del TC global vigente (Settings singleton). */
export async function getUsdArsRateSettings(): Promise<UsdArsRateSettings> {
  const settings = await prisma.settings.findFirst()
  if (!settings) {
    return { usdArsRate: null, updatedAt: null }
  }
  return {
    usdArsRate: settings.usdArsRate,
    updatedAt: settings.updatedAt,
  }
}
