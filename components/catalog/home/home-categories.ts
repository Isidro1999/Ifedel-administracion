import type { CatalogCategoryNode } from '@/lib/catalog-category-public'

/** Máximo de categorías principales en la home. */
export const MAX_HOME_CATEGORIES = 6

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

/**
 * Iconos por slug (V1 + legacy residuales para About / social).
 * Sin match → default.
 */
export const HOME_CATEGORY_ICONS: Record<string, HomeCategoryIconKey> = {
  // Principales V1
  'electrificacion-y-alambrados': 'fence',
  'identificacion-y-pesaje-animal': 'scale',
  'esquila-y-peladoras': 'shear',
  'manejo-ganadero': 'farm',
  'agua-y-manejo-hidrico': 'water',
  pasturas: 'farm',
  // Legacy (About / social metadata)
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
 * En Home, si hay entrada acá se usa como visual de la card (sin depender de DB).
 */
export const HOME_CATEGORY_IMAGES: Record<string, string> = {
  // Principales V1
  'electrificacion-y-alambrados':
    '/catalog/categories/pexels-cesar-16021483.jpg',
  'identificacion-y-pesaje-animal':
    '/catalog/categories/identificacion-y-pesaje-animal.jpg',
  'esquila-y-peladoras': '/catalog/categories/esquila-y-peladoras.jpg',
  'manejo-ganadero': '/catalog/categories/manejo-ganadero.jpg',
  'agua-y-manejo-hidrico': '/catalog/categories/agua-y-manejo-hidrico.jpg',
  // Legacy (About / social metadata)
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

export type HomeCategoryItem = {
  id: number
  name: string
  slug: string
  count: number
  href: string
  icon: HomeCategoryIconKey
  shortDescription: string | null
  /** URL de catálogo (Cloudinary) o ruta local; si falta → fallback visual. */
  imageUrl: string | null
}

/**
 * Roots del árbol público aptos para Home:
 * showInHome + count > 0, orden sortOrder/name, tope MAX_HOME_CATEGORIES.
 * No incluye hojas ni legacy (el árbol P4A ya los excluye).
 */
export function selectHomeRootCategories(
  tree: CatalogCategoryNode[],
): CatalogCategoryNode[] {
  return tree
    .filter((root) => root.showInHome && root.count > 0)
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'es'),
    )
    .slice(0, MAX_HOME_CATEGORIES)
}

export function toHomeCategoryItemsFromTree(
  tree: CatalogCategoryNode[],
  hrefForSlug: (slug: string) => string,
): HomeCategoryItem[] {
  return selectHomeRootCategories(tree).map((root) => ({
    id: root.id,
    name: root.name,
    slug: root.slug,
    count: root.count,
    href: hrefForSlug(root.slug),
    icon: HOME_CATEGORY_ICONS[root.slug] ?? 'default',
    shortDescription: root.shortDescription,
    imageUrl:
      HOME_CATEGORY_IMAGES[root.slug] || root.imageUrl?.trim() || null,
  }))
}
