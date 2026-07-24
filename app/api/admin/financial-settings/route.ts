import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const [{ requireAdminSession }, { getFinancialSettings }] = await Promise.all([
    import('@/lib/admin-auth'),
    import('@/lib/financial-settings'),
  ])
  const gate = await requireAdminSession()
  if (!gate.ok) return gate.response

  const settings = await getFinancialSettings()
  return NextResponse.json({
    ingresosBrutosRate: settings.ingresosBrutosRate,
    bankCreditRate: settings.bankCreditRate,
    bankDebitRate: settings.bankDebitRate,
    fixedMonthlyOverheadARS: settings.fixedMonthlyOverheadARS,
  })
}

export async function PUT(request: Request) {
  const [{ requireAdminSession }, { getFinancialSettings, saveFinancialSettings }] = await Promise.all([
    import('@/lib/admin-auth'),
    import('@/lib/financial-settings'),
  ])
  const gate = await requireAdminSession()
  if (!gate.ok) return gate.response

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

