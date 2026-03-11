import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

async function main() {
  console.log('Iniciando backfill de receivables a ARS...')

  const receivables = await prisma.receivable.findMany({
    include: {
      sale: true,
    },
  })

  console.log(`Encontradas ${receivables.length} receivables.`)

  let updated = 0
  let skipped = 0

  for (const r of receivables) {
    const id = r.id

    // No tocar receivables canceladas (histórico) salvo necesidad explícita
    if (r.status === 'CANCELLED') {
      console.log(
        `Receivable #${id}: estado CANCELLED, se deja sin cambios (skip).`,
      )
      skipped++
      continue
    }

    if (!r.sale) {
      console.warn(
        `Receivable #${id}: no tiene Sale asociada (saleId=${r.saleId}), se omite.`,
      )
      skipped++
      continue
    }

    const sale = r.sale

    // Regla de cálculo en ARS:
    // 1) sale.totalARS (si es válido)
    // 2) sale.totalWithDiscount * sale.exchangeRateARS
    // 3) fallback: sale.totalWithDiscount (asumiendo que ya está en ARS)
    let totalAmountARS: number | null = null

    if (isFiniteNumber(sale.totalARS)) {
      totalAmountARS = sale.totalARS
    } else if (
      isFiniteNumber(sale.totalWithDiscount) &&
      isFiniteNumber(sale.exchangeRateARS) &&
      sale.exchangeRateARS > 0
    ) {
      totalAmountARS = sale.totalWithDiscount * sale.exchangeRateARS
    } else if (isFiniteNumber(sale.totalWithDiscount)) {
      totalAmountARS = sale.totalWithDiscount
    }

    if (!isFiniteNumber(totalAmountARS)) {
      console.warn(
        `Receivable #${id}: no se pudo calcular un totalAmountARS válido (saleId=${sale.id}), se omite.`,
      )
      skipped++
      continue
    }

    const newBalance = totalAmountARS - (r.amountPaid ?? 0)

    try {
      await prisma.receivable.update({
        where: { id },
        data: {
          currency: 'ARS',
          totalAmount: totalAmountARS,
          balance: newBalance,
        },
      })

      console.log(
        `Receivable #${id} actualizada: totalAmount=${totalAmountARS.toFixed(
          2,
        )}, balance=${newBalance.toFixed(2)}, currency=ARS`,
      )
      updated++
    } catch (error) {
      console.error(
        `Receivable #${id}: error al actualizar, se deja sin cambios.`,
        error,
      )
      skipped++
    }
  }

  console.log('Backfill finalizado.')
  console.log(`Receivables actualizadas: ${updated}`)
  console.log(`Receivables omitidas    : ${skipped}`)
}

main()
  .catch((error) => {
    console.error('Error en el script de backfill:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

