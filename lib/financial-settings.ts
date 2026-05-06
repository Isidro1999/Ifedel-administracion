import { revalidateTag, unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'

export type FinancialSettings = {
  usdArsRate: number
  ingresosBrutosRate: number
  bankCreditRate: number
  bankDebitRate: number
  fixedMonthlyOverheadARS: number
}

const FINANCIAL_SETTINGS_TAG = 'financial-settings'

const getFinancialSettingsCached = unstable_cache(
  async (): Promise<FinancialSettings> => {
    // En algunos entornos el cliente de Prisma puede estar desactualizado
    // respecto al schema y no exponer aún `financialSettings`.
    // En ese caso devolvemos defaults seguros en lugar de romper analytics.
    const anyPrisma = prisma as any

    const [settingsRow, financialRow] = await Promise.all([
      prisma.settings.findFirst(),
      anyPrisma.financialSettings?.findUnique
        ? anyPrisma.financialSettings.findUnique({ where: { id: 1 } })
        : Promise.resolve(null),
    ])

    const usdArsRate = settingsRow?.usdArsRate ?? 0

    return {
      usdArsRate,
      ingresosBrutosRate: financialRow?.ingresosBrutosRate ?? 0,
      bankCreditRate: financialRow?.bankCreditRate ?? 0,
      bankDebitRate: financialRow?.bankDebitRate ?? 0,
      fixedMonthlyOverheadARS: financialRow?.fixedMonthlyOverheadARS ?? 0,
    }
  },
  ['financial-settings:v1'],
  {
    revalidate: 120,
    tags: [FINANCIAL_SETTINGS_TAG],
  },
)

export async function getFinancialSettings(): Promise<FinancialSettings> {
  return getFinancialSettingsCached()
}

export async function saveFinancialSettings(input: Omit<FinancialSettings, 'usdArsRate'>) {
  const anyPrisma = prisma as any
  if (!anyPrisma.financialSettings?.upsert) {
    throw new Error(
      'El modelo FinancialSettings todavía no está disponible en el cliente de Prisma. Asegurate de haber corrido las migraciones y prisma generate.'
    )
  }

  await anyPrisma.financialSettings.upsert({
    where: { id: 1 },
    update: {
      ingresosBrutosRate: input.ingresosBrutosRate,
      bankCreditRate: input.bankCreditRate,
      bankDebitRate: input.bankDebitRate,
      fixedMonthlyOverheadARS: input.fixedMonthlyOverheadARS,
    },
    create: {
      id: 1,
      ingresosBrutosRate: input.ingresosBrutosRate,
      bankCreditRate: input.bankCreditRate,
      bankDebitRate: input.bankDebitRate,
      fixedMonthlyOverheadARS: input.fixedMonthlyOverheadARS,
    },
  })
  revalidateTag(FINANCIAL_SETTINGS_TAG)
}


