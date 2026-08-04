import type { CatalogCategory } from '@/lib/catalog-client'

/** Máximo de categorías en la home. No rellenar con placeholders. */
export const MAX_HOME_CATEGORIES = 6

/**
 * Orden comercial preferido (slugs reales del catálogo público).
 * Solo se muestran si existen en los datos públicos y tienen productos.
 * Si faltan, se completa con el resto en el orden que trae la API.
 */
export const HOME_CATEGORY_PRIORITY_SLUGS: readonly string[] = [
  'electrificacin-energizadores',
  'electrificacin-accesorios',
  'pesaje-e-ide',
  'lectores',
  'identificacion',
  'gripple',
  'postes-y-varillas',
  'peines-y-cortantes',
  'peladoras-y-esquiladoras',
  'agua',
  'granja',
  'electrificacin-accesorios-serie-i',
  'pasturometro',
  'repuestos-gallagher',
  'repuestos-heiniger',
] as const

export type HomeCategoryIconKey =
  | 'energizer'
  | 'fence'
  | 'scale'
  | 'reader'
  | 'tag'
  | 'wire'
  | 'post'
  | 'shear'
  | 'clipper'
  | 'water'
  | 'farm'
  | 'default'

/** Icono por slug; sin match → default. */
export const HOME_CATEGORY_ICONS: Record<string, HomeCategoryIconKey> = {
  'electrificacin-energizadores': 'energizer',
  'electrificacin-accesorios': 'fence',
  'electrificacin-accesorios-serie-i': 'fence',
  'pesaje-e-ide': 'scale',
  lectores: 'reader',
  identificacion: 'tag',
  gripple: 'wire',
  'postes-y-varillas': 'post',
  'peines-y-cortantes': 'shear',
  'peladoras-y-esquiladoras': 'clipper',
  agua: 'water',
  granja: 'farm',
  pasturometro: 'farm',
  'repuestos-gallagher': 'default',
  'repuestos-heiniger': 'default',
}

/**
 * Imágenes locales opcionales por slug (`public/catalog/categories/`).
 * Solo rutas a archivos existentes. Sin imagen → card clásica.
 */
export const HOME_CATEGORY_IMAGES: Record<string, string> = {
  'electrificacin-energizadores':
    '/catalog/categories/pexels-seba-763269.jpg',
  'electrificacin-accesorios':
    '/catalog/categories/pexels-olivia-soares-85582606-36743439.jpg',
  'pesaje-e-ide':
    '/catalog/categories/pexels-yavuz-selim-korku-497065016-18320101.jpg',
  lectores:
    '/catalog/categories/pexels-julian-leonel-23517043-38365037.jpg',
  identificacion: '/catalog/categories/pexels-philipp-441664-27579608.jpg',
  gripple: '/catalog/categories/pexels-andyclipit-13143653.jpg',
}

/**
 * Labels comerciales solo para presentación en home.
 * No cambia slugs, URLs ni nombres en base/admin/listado.
 */
export const HOME_CATEGORY_LABELS: Record<string, string> = {
  'electrificacin-energizadores': 'Energizadores',
  'electrificacin-accesorios': 'Accesorios de electrificación',
  'pesaje-e-ide': 'Pesaje e identificación',
  lectores: 'Lectores',
  identificacion: 'Identificación animal',
  gripple: 'Gripple',
}

export type HomeCategoryItem = {
  id: number
  name: string
  slug: string
  count: number
  href: string
  icon: HomeCategoryIconKey
  /** Ruta pública opcional; si falta, la card no muestra imagen. */
  image?: string
}

/**
 * Selecciona hasta MAX_HOME_CATEGORIES según prioridad estática,
 * y completa con el resto en el orden original de la API.
 */
export function selectHomeCategories(
  categories: CatalogCategory[],
): CatalogCategory[] {
  if (categories.length === 0) return []

  const bySlug = new Map(categories.map((c) => [c.slug, c]))
  const selected: CatalogCategory[] = []
  const used = new Set<string>()

  for (const slug of HOME_CATEGORY_PRIORITY_SLUGS) {
    if (selected.length >= MAX_HOME_CATEGORIES) break
    const cat = bySlug.get(slug)
    if (!cat) continue
    selected.push(cat)
    used.add(slug)
  }

  if (selected.length < MAX_HOME_CATEGORIES) {
    for (const cat of categories) {
      if (selected.length >= MAX_HOME_CATEGORIES) break
      if (used.has(cat.slug)) continue
      selected.push(cat)
      used.add(cat.slug)
    }
  }

  return selected
}

export function toHomeCategoryItems(
  categories: CatalogCategory[],
  hrefForSlug: (slug: string) => string,
): HomeCategoryItem[] {
  return selectHomeCategories(categories).map((cat) => {
    const image = HOME_CATEGORY_IMAGES[cat.slug]
    return {
      id: cat.id,
      name: HOME_CATEGORY_LABELS[cat.slug] ?? cat.name,
      slug: cat.slug,
      count: cat.count ?? 0,
      href: hrefForSlug(cat.slug),
      icon: HOME_CATEGORY_ICONS[cat.slug] ?? 'default',
      ...(image ? { image } : {}),
    }
  })
}
