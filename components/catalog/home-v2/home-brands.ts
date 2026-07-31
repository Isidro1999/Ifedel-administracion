export type HomeBrand = {
  name: string
  logo: string
  href?: string
}

/**
 * Marcas con logo para la franja de la home V2.
 * Vacío por ahora: no inventar marcas ni consultar Prisma.
 * Completar en una etapa posterior con assets locales.
 */
export const HOME_BRANDS: HomeBrand[] = []
