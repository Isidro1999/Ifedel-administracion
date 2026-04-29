import { NextResponse } from 'next/server'
import { getFinancialSettings, saveFinancialSettings } from '@/lib/financial-settings'
import { requireAdminKey } from '@/lib/admin-auth'

export async function GET() {
  const settings = await getFinancialSettings()
  return NextResponse.json({
    ingresosBrutosRate: settings.ingresosBrutosRate,
    bankCreditRate: settings.bankCreditRate,
    bankDebitRate: settings.bankDebitRate,
    fixedMonthlyOverheadARS: settings.fixedMonthlyOverheadARS,
  })
}

export async function PUT(request: Request) {
  const adminKey = request.headers.get('x-admin-key') || undefined
  const ok = await requireAdminKey(adminKey)
  if (!ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))

  const ingresosBrutosRate = Number(body.ingresosBrutosRate ?? 0)
  const bankCreditRate = Number(body.bankCreditRate ?? 0)
  const bankDebitRate = Number(body.bankDebitRate ?? 0)
  const fixedMonthlyOverheadARS = Number(body.fixedMonthlyOverheadARS ?? 0)

  await saveFinancialSettings({
    ingresosBrutosRate:
      Number.isFinite(ingresosBrutosRate) && ingresosBrutosRate >= 0
        ? ingresosBrutosRate
        : 0,
    bankCreditRate:
      Number.isFinite(bankCreditRate) && bankCreditRate >= 0
        ? bankCreditRate
        : 0,
    bankDebitRate:
      Number.isFinite(bankDebitRate) && bankDebitRate >= 0
        ? bankDebitRate
        : 0,
    fixedMonthlyOverheadARS:
      Number.isFinite(fixedMonthlyOverheadARS) && fixedMonthlyOverheadARS >= 0
        ? fixedMonthlyOverheadARS
        : 0,
  })

  const updated = await getFinancialSettings()

  return NextResponse.json({
    ingresosBrutosRate: updated.ingresosBrutosRate,
    bankCreditRate: updated.bankCreditRate,
    bankDebitRate: updated.bankDebitRate,
    fixedMonthlyOverheadARS: updated.fixedMonthlyOverheadARS,
  })
}

