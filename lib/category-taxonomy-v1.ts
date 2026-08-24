/**
 * Taxonomía V1 del catálogo IFEDEL (principales → subcategorías).
 *
 * Slugs y nombres canónicos definidos explícitamente (no usan slugify global)
 * para evitar corrupciones tipo "electrificacin-accesorios".
 *
 * `name` puede repetirse (ya no es unique). `slug` sigue siendo unique.
 *
 * Conflictos conocidos de slug con legacy (con fallback temporal):
 * - slug "lectores" → "lectores-identificacion-y-pesaje"
 * - slug "postes-y-varillas" → "postes-y-varillas-electrificacion"
 *
 * La principal Agua usa name "Agua" + slug "agua-y-manejo-hidrico"
 * (convive con legacy slug "agua").
 */

export type TaxonomySubcategoryDef = {
  name: string
  slug: string
  /** Si el slug canónico ya lo ocupa una categoría legacy. */
  slugFallbackIfTaken?: string
}

export type TaxonomyRootDef = {
  name: string
  slug: string
  sortOrder: number
  showInHome: boolean
  shortDescription: string
  children: TaxonomySubcategoryDef[]
}

export const TAXONOMY_V1_ROOTS: TaxonomyRootDef[] = [
  {
    name: 'Electrificación y Alambrados',
    slug: 'electrificacion-y-alambrados',
    sortOrder: 1,
    showInHome: true,
    shortDescription:
      'Soluciones para electrificación, cercado y manejo eficiente de alambrados rurales.',
    children: [
      { name: 'Energizadores', slug: 'energizadores' },
      { name: 'Aisladores', slug: 'aisladores' },
      { name: 'Conductores eléctricos', slug: 'conductores-electricos' },
      { name: 'Tranqueras y accesos', slug: 'tranqueras-y-accesos' },
      { name: 'Tensores y conectores', slug: 'tensores-y-conectores' },
      { name: 'Carreteles', slug: 'carreteles' },
      {
        name: 'Postes y varillas',
        slug: 'postes-y-varillas',
        slugFallbackIfTaken: 'postes-y-varillas-electrificacion',
      },
      { name: 'Control y monitoreo', slug: 'control-y-monitoreo' },
      {
        name: 'Puesta a tierra y protección',
        slug: 'puesta-a-tierra-y-proteccion',
      },
      { name: 'Cercos móviles', slug: 'cercos-moviles' },
      {
        name: 'Herramientas de instalación',
        slug: 'herramientas-de-instalacion',
      },
      { name: 'Anclajes y fijación', slug: 'anclajes-y-fijacion' },
      {
        name: 'Fuentes de energía y kits solares',
        slug: 'fuentes-de-energia-y-kits-solares',
      },
      {
        name: 'Accesorios de instalación',
        slug: 'accesorios-de-instalacion',
      },
    ],
  },
  {
    name: 'Identificación y Pesaje Animal',
    slug: 'identificacion-y-pesaje-animal',
    sortOrder: 2,
    showInHome: true,
    shortDescription:
      'Tecnología para identificar, registrar y controlar el peso de cada animal.',
    children: [
      {
        name: 'Caravanas e identificación visual',
        slug: 'caravanas-e-identificacion-visual',
      },
      {
        name: 'Identificación electrónica',
        slug: 'identificacion-electronica',
      },
      {
        name: 'Aplicadores y accesorios',
        slug: 'aplicadores-y-accesorios',
      },
      {
        name: 'Lectores',
        slug: 'lectores',
        slugFallbackIfTaken: 'lectores-identificacion-y-pesaje',
      },
      { name: 'Balanzas y monitores', slug: 'balanzas-y-monitores' },
      {
        name: 'Barras, celdas y plataformas',
        slug: 'barras-celdas-y-plataformas',
      },
      {
        name: 'Accesorios de identificación y pesaje',
        slug: 'accesorios-de-identificacion-y-pesaje',
      },
      {
        name: 'Accesorios y repuestos de pesaje',
        slug: 'accesorios-y-repuestos-de-pesaje',
      },
      {
        name: 'Accesorios y repuestos de lectores',
        slug: 'accesorios-y-repuestos-de-lectores',
      },
    ],
  },
  {
    name: 'Esquila y Peladoras',
    slug: 'esquila-y-peladoras',
    sortOrder: 3,
    showInHome: true,
    shortDescription:
      'Máquinas, peines, cuchillas y repuestos para esquila y pelado profesional.',
    children: [
      {
        name: 'Máquinas de esquila y peladoras',
        slug: 'maquinas-de-esquila-y-peladoras',
      },
      {
        name: 'Peines, cuchillas y cabezales',
        slug: 'peines-cuchillas-y-cabezales',
      },
      {
        name: 'Repuestos y accesorios',
        slug: 'repuestos-y-accesorios-esquila',
      },
      {
        name: 'Mantenimiento y accesorios',
        slug: 'mantenimiento-y-accesorios-esquila',
      },
    ],
  },
  {
    name: 'Manejo Ganadero',
    slug: 'manejo-ganadero',
    sortOrder: 4,
    showInHome: true,
    shortDescription:
      'Herramientas y soluciones para facilitar el manejo cotidiano del ganado.',
    children: [
      { name: 'Jeringas y dosificación', slug: 'jeringas-y-dosificacion' },
      {
        name: 'Repuestos de jeringas y dosificadores',
        slug: 'repuestos-jeringas-y-dosificadores',
      },
      { name: 'Destete', slug: 'destete' },
      { name: 'Guachera y crianza', slug: 'guachera-y-crianza' },
      { name: 'Protección de animales', slug: 'proteccion-de-animales' },
    ],
  },
  {
    name: 'Agua',
    slug: 'agua-y-manejo-hidrico',
    sortOrder: 5,
    showInHome: true,
    shortDescription:
      'Soluciones para control, distribución y monitoreo de agua en establecimientos rurales.',
    children: [
      { name: 'Válvulas', slug: 'valvulas' },
      { name: 'Monitoreo de tanques', slug: 'monitoreo-de-tanques' },
      { name: 'Control de bombas', slug: 'control-de-bombas' },
      { name: 'Medición de caudal', slug: 'medicion-de-caudal' },
      { name: 'Accesorios de monitoreo', slug: 'accesorios-de-monitoreo' },
      { name: 'Accesorios', slug: 'accesorios-de-agua' },
    ],
  },
  {
    name: 'Pasturas',
    slug: 'pasturas',
    sortOrder: 6,
    showInHome: false,
    shortDescription:
      'Herramientas para medir y gestionar mejor la disponibilidad de pasturas.',
    children: [
      { name: 'Medición de pasturas', slug: 'medicion-de-pasturas' },
    ],
  },
]

/** Todos los slugs canónicos (y fallbacks) declarados en la definición V1. */
export function getTaxonomyV1ManagedSlugs(): Set<string> {
  const slugs = new Set<string>()
  for (const root of TAXONOMY_V1_ROOTS) {
    slugs.add(root.slug)
    for (const child of root.children) {
      slugs.add(child.slug)
      if (child.slugFallbackIfTaken) slugs.add(child.slugFallbackIfTaken)
    }
  }
  return slugs
}

export function countTaxonomyV1Expected() {
  const roots = TAXONOMY_V1_ROOTS.length
  const children = TAXONOMY_V1_ROOTS.reduce(
    (acc, root) => acc + root.children.length,
    0
  )
  return { roots, children, total: roots + children }
}

export type CategorySlugNameRow = {
  slug: string
  name: string
}

/**
 * Misma regla de ownership que el seed: una fila es V1 si el name visible
 * coincide con el de la definición (el slug puede ser canónico o fallback).
 */
export function isTaxonomyV1OwnedName(
  existingName: string,
  intendedName: string
): boolean {
  return existingName === intendedName
}

/**
 * Resuelve el slug efectivo de un nodo V1 frente al estado actual de la DB.
 * Prioridad:
 * 1) fallback ya creado con name V1 (corrida previa con conflicto);
 * 2) canónico libre o ya nuestro;
 * 3) canónico ocupado por legacy → fallback (si existe);
 * 4) null si no se puede resolver.
 */
export function resolveTaxonomyV1EffectiveSlug(
  intended: string,
  intendedName: string,
  fallback: string | undefined,
  bySlug: Map<string, CategorySlugNameRow>
): string | null {
  if (fallback) {
    const byFallback = bySlug.get(fallback)
    if (byFallback && isTaxonomyV1OwnedName(byFallback.name, intendedName)) {
      return fallback
    }
    if (byFallback && !isTaxonomyV1OwnedName(byFallback.name, intendedName)) {
      return null
    }
  }

  const byIntended = bySlug.get(intended)
  if (!byIntended) {
    return intended
  }

  if (isTaxonomyV1OwnedName(byIntended.name, intendedName)) {
    return intended
  }

  // Canónico ocupado por legacy
  return fallback ?? null
}

export type ResolvedTaxonomyV1Node = {
  kind: 'root' | 'child'
  name: string
  intendedSlug: string
  effectiveSlug: string
  parentIntendedSlug: string | null
  sortOrder: number
  showInHome: boolean
}

/**
 * Resuelve los 45 nodos V1 a sus slugs efectivos según filas existentes.
 * No incluye categorías legacy aunque compartan un slug canónico conflictivo.
 */
export function resolveTaxonomyV1EffectiveNodes(
  rows: CategorySlugNameRow[]
): {
  nodes: ResolvedTaxonomyV1Node[]
  effectiveSlugs: Set<string>
  missing: Array<{ name: string; intendedSlug: string; fallback?: string }>
} {
  const bySlug = new Map(rows.map((r) => [r.slug, r]))
  const nodes: ResolvedTaxonomyV1Node[] = []
  const missing: Array<{
    name: string
    intendedSlug: string
    fallback?: string
  }> = []

  for (const root of TAXONOMY_V1_ROOTS) {
    const rootSlug = resolveTaxonomyV1EffectiveSlug(
      root.slug,
      root.name,
      undefined,
      bySlug
    )
    if (!rootSlug || !bySlug.has(rootSlug)) {
      missing.push({ name: root.name, intendedSlug: root.slug })
      continue
    }
    // Solo contar si la fila efectiva es nuestra (evita legacy homónimo)
    const rootRow = bySlug.get(rootSlug)!
    if (!isTaxonomyV1OwnedName(rootRow.name, root.name)) {
      missing.push({ name: root.name, intendedSlug: root.slug })
      continue
    }

    nodes.push({
      kind: 'root',
      name: root.name,
      intendedSlug: root.slug,
      effectiveSlug: rootSlug,
      parentIntendedSlug: null,
      sortOrder: root.sortOrder,
      showInHome: root.showInHome,
    })

    let childSort = 1
    for (const child of root.children) {
      const childSlug = resolveTaxonomyV1EffectiveSlug(
        child.slug,
        child.name,
        child.slugFallbackIfTaken,
        bySlug
      )
      if (!childSlug || !bySlug.has(childSlug)) {
        missing.push({
          name: child.name,
          intendedSlug: child.slug,
          fallback: child.slugFallbackIfTaken,
        })
        childSort += 1
        continue
      }
      const childRow = bySlug.get(childSlug)!
      if (!isTaxonomyV1OwnedName(childRow.name, child.name)) {
        missing.push({
          name: child.name,
          intendedSlug: child.slug,
          fallback: child.slugFallbackIfTaken,
        })
        childSort += 1
        continue
      }

      nodes.push({
        kind: 'child',
        name: child.name,
        intendedSlug: child.slug,
        effectiveSlug: childSlug,
        parentIntendedSlug: root.slug,
        sortOrder: childSort,
        showInHome: false,
      })
      childSort += 1
    }
  }

  return {
    nodes,
    effectiveSlugs: new Set(nodes.map((n) => n.effectiveSlug)),
    missing,
  }
}
