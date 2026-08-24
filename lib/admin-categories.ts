/**
 * Dominio admin P3: taxonomía jerárquica (Principal → Subcategoría).
 * Excluye categorías legacy del flujo normal.
 */

import { z } from 'zod'
import { slugifyCategoryName } from '@/lib/category-slug'

/** Slugs legacy planos (pre-V1). No aparecen en CRUD/selects normales. */
export const LEGACY_CATEGORY_SLUGS = new Set([
  'pesaje-e-ide',
  'lectores',
  'electrificacin-energizadores',
  'identificacion',
  'electrificacin-accesorios-serie-i',
  'electrificacin-accesorios',
  'agua',
  'pasturometro',
  'granja',
  'identificacin',
  'repuestos-gallagher',
  'postes-y-varillas',
  'gripple',
  'peines-y-cortantes',
  'peladoras-y-esquiladoras',
  'repuestos-heiniger',
  'jeringas-y-accesorios',
  'destetadores',
])

export function isLegacyCategorySlug(slug: string): boolean {
  return LEGACY_CATEGORY_SLUGS.has(slug)
}

export const CategoryWriteSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Slug inválido (minúsculas, números y guiones)'
  ),
  parentId: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().optional().default(0),
  shortDescription: z.string().max(2000).nullable().optional(),
  imageUrl: z
    .string()
    .max(2000)
    .nullable()
    .optional()
    .refine(
      (v) => v == null || v === '' || /^https?:\/\//i.test(v),
      'imageUrl debe ser URL http(s) o vacío'
    ),
  showInHome: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
})

export type CategoryWriteInput = z.infer<typeof CategoryWriteSchema>

export type CategoryNodeRow = {
  id: number
  name: string
  slug: string
  parentId: number | null
  sortOrder: number
  shortDescription: string | null
  imageUrl: string | null
  showInHome: boolean
  isActive: boolean
  productCount: number
  childCount: number
}

export type AdminCategoryTreeRoot = CategoryNodeRow & {
  children: CategoryNodeRow[]
}

export class AdminCategoryError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status = 400) {
    super(message)
    this.name = 'AdminCategoryError'
    this.code = code
    this.status = status
  }
}

export function suggestCategorySlug(name: string): string {
  return slugifyCategoryName(name)
}

/** Filas administrables: no legacy. */
export function isAdminManagedCategory(row: {
  slug: string
  parentId: number | null
}): boolean {
  if (isLegacyCategorySlug(row.slug)) return false
  return true
}

export function buildAdminCategoryTree(
  rows: CategoryNodeRow[]
): AdminCategoryTreeRoot[] {
  const managed = rows.filter((r) => isAdminManagedCategory(r))
  const byParent = new Map<number | null, CategoryNodeRow[]>()
  for (const r of managed) {
    const key = r.parentId
    const list = byParent.get(key) ?? []
    list.push(r)
    byParent.set(key, list)
  }
  const sortFn = (a: CategoryNodeRow, b: CategoryNodeRow) =>
    a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'es')

  const roots = (byParent.get(null) ?? []).slice().sort(sortFn)
  return roots.map((root) => ({
    ...root,
    children: (byParent.get(root.id) ?? []).slice().sort(sortFn),
  }))
}

/**
 * Validación pura de create/update (sin DB).
 * parent: null = principal; si hay parent debe ser principal (parentId null) y managed.
 */
export function validateCategoryHierarchyRules(input: {
  parent: { id: number; parentId: number | null; slug: string } | null
  /** Al editar: la categoría actual */
  current?: {
    id: number
    parentId: number | null
    productCount: number
    childCount: number
  } | null
  nextParentId: number | null
}): void {
  const { parent, current, nextParentId } = input

  if (nextParentId == null) {
    // Principal
    if (current && current.productCount > 0) {
      throw new AdminCategoryError(
        'ROOT_HAS_PRODUCTS',
        'Una categoría con productos no puede ser principal; reasigná los productos a una hoja.'
      )
    }
    return
  }

  if (!parent) {
    throw new AdminCategoryError(
      'PARENT_NOT_FOUND',
      'La categoría padre no existe.'
    )
  }
  if (isLegacyCategorySlug(parent.slug)) {
    throw new AdminCategoryError(
      'PARENT_LEGACY',
      'No se puede usar una categoría legacy como padre.'
    )
  }
  if (parent.parentId != null) {
    throw new AdminCategoryError(
      'THIRD_LEVEL',
      'Solo se permiten dos niveles: Principal → Subcategoría.'
    )
  }
  if (current && current.id === parent.id) {
    throw new AdminCategoryError(
      'PARENT_SELF',
      'Una categoría no puede ser padre de sí misma.'
    )
  }
  // Convertir principal con hijos en subcategoría: no permitido
  if (
    current &&
    current.parentId == null &&
    current.childCount > 0 &&
    nextParentId != null
  ) {
    throw new AdminCategoryError(
      'ROOT_HAS_CHILDREN',
      'Una principal con subcategorías no puede convertirse en subcategoría.'
    )
  }
}

export function validateLeafAssignment(category: {
  id: number
  parentId: number | null
  slug: string
  isActive: boolean
  childCount: number
}): void {
  if (isLegacyCategorySlug(category.slug)) {
    throw new AdminCategoryError(
      'CATEGORY_LEGACY',
      'No se pueden asignar productos a categorías legacy. Elegí una subcategoría V1.'
    )
  }
  if (!category.isActive) {
    throw new AdminCategoryError(
      'CATEGORY_INACTIVE',
      'La categoría destino está inactiva.'
    )
  }
  if (category.parentId == null) {
    throw new AdminCategoryError(
      'CATEGORY_NOT_LEAF',
      'Los productos solo pueden asignarse a subcategorías (hojas), no a principales.'
    )
  }
  if (category.childCount > 0) {
    throw new AdminCategoryError(
      'CATEGORY_NOT_LEAF',
      'La categoría tiene subcategorías; asigná el producto a una hoja.'
    )
  }
}

export function validateCategoryDelete(category: {
  productCount: number
  childCount: number
}): void {
  if (category.childCount > 0) {
    throw new AdminCategoryError(
      'DELETE_HAS_CHILDREN',
      'No se puede eliminar: tiene subcategorías. Eliminá o mové los hijos primero.'
    )
  }
  if (category.productCount > 0) {
    throw new AdminCategoryError(
      'DELETE_HAS_PRODUCTS',
      'No se puede eliminar: tiene productos. Reasigná los productos primero.'
    )
  }
}
