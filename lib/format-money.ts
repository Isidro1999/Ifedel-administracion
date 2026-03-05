export function fmtNumberAR(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function fmtMoneyUSD(n: number): string {
  return `USD ${fmtNumberAR(n)}`
}

export function fmtMoneyARS(n: number): string {
  return `ARS ${fmtNumberAR(n)}`
}
