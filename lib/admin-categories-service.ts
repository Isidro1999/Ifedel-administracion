/**
 * Acceso DB para admin de categorías (solo nodos no-legacy).
 */

import { prisma } from '@/lib/prisma'
import {
  AdminCategoryError,
  CategoryWriteSchema,
  buildAdminCategoryTree,
  isAdminManagedCategory,
  isLegacyCategorySlug,
  validateCategoryDelete,
  validateCategoryHierarchyRules,
  validateLeafAssignment,
  type AdminCategoryTreeRoot,
  type CategoryNodeRow,
  type CategoryWriteInput,
} from '@/lib/admin-categories'

const categorySelect = {
  id: true,
  name: true,
  slug: true,
  parentId: true,
  sortOrder: true,
  shortDescription: true,
  imageUrl: true,
  showInHome: true,
  isActive: true,
  _count: {
    select: { products: true, children: true },
  },
} as const

function toNode(
  row: {
    id: number
    name: string
    slug: string
    parentId: number | null
    sortOrder: number
    shortDescription: string | null
    imageUrl: string | null
    showInHome: boolean
    isActive: boolean
    _count: { products: number; children: number }
  }
): CategoryNodeRow {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parentId,
    sortOrder: row.sortOrder,
    shortDescription: row.shortDescription,
    imageUrl: row.imageUrl,
    showInHome: row.showInHome,
    isActive: row.isActive,
    productCount: row._count.products,
    childCount: row._count.children,
  }
}

export async function listAdminCategoryTree(): Promise<AdminCategoryTreeRoot[]> {
  const rows = await prisma.category.findMany({
    select: categorySelect,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
  return buildAdminCategoryTree(rows.map(toNode))
}

export async function listAdminLeafOptions(): Promise<
  Array<{
    id: number
    name: string
    slug: string
    parentId: number
    parentName: string
    parentSlug: string
  }>
> {
  const leaves = await prisma.category.findMany({
    where: {
      parentId: { not: null },
      isActive: true,
      children: { none: {} },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      parent: { select: { id: true, name: true, slug: true } },
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })

  return leaves
    .filter(
      (c) =>
        c.parentId != null &&
        c.parent &&
        !isLegacyCategorySlug(c.slug) &&
        !isLegacyCategorySlug(c.parent.slug)
    )
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parentId!,
      parentName: c.parent!.name,
      parentSlug: c.parent!.slug,
    }))
}

export async function listAdminRootOptions(): Promise<
  Array<{ id: number; name: string; slug: string }>
> {
  const roots = await prisma.category.findMany({
    where: { parentId: null, isActive: true },
    select: { id: true, name: true, slug: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
  return roots.filter((r) => !isLegacyCategorySlug(r.slug))
}

async function assertSlugAvailable(slug: string, excludeId?: number) {
  const existing = await prisma.category.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (existing && existing.id !== excludeId) {
    throw new AdminCategoryError(
      'SLUG_TAKEN',
      `El slug "${slug}" ya está en uso.`
    )
  }
}

export async function createAdminCategory(raw: unknown) {
  const data = CategoryWriteSchema.parse(raw) as CategoryWriteInput
  const parentId = data.parentId ?? null

  let parent: { id: number; parentId: number | null; slug: string } | null =
    null
  if (parentId != null) {
    parent = await prisma.category.findUnique({
      where: { id: parentId },
      select: { id: true, parentId: true, slug: true },
    })
  }

  validateCategoryHierarchyRules({
    parent,
    current: null,
    nextParentId: parentId,
  })
  await assertSlugAvailable(data.slug)

  // Subcategorías: showInHome false por defecto salvo que se pida
  const showInHome =
    parentId == null ? Boolean(data.showInHome) : Boolean(data.showInHome)

  return prisma.category.create({
    data: {
      name: data.name.trim(),
      slug: data.slug,
      parentId,
      sortOrder: data.sortOrder ?? 0,
      shortDescription: data.shortDescription?.trim() || null,
      imageUrl: data.imageUrl?.trim() || null,
      showInHome,
      isActive: data.isActive ?? true,
    },
    select: categorySelect,
  })
}

export async function updateAdminCategory(id: number, raw: unknown) {
  const data = CategoryWriteSchema.parse(raw) as CategoryWriteInput
  const current = await prisma.category.findUnique({
    where: { id },
    select: {
      ...categorySelect,
    },
  })
  if (!current) {
    throw new AdminCategoryError('NOT_FOUND', 'Categoría no encontrada.', 404)
  }
  if (!isAdminManagedCategory(current)) {
    throw new AdminCategoryError(
      'LEGACY_READONLY',
      'Las categorías legacy no se editan desde este panel.',
      403
    )
  }

  const parentId = data.parentId === undefined ? current.parentId : data.parentId
  let parent: { id: number; parentId: number | null; slug: string } | null =
    null
  if (parentId != null) {
    parent = await prisma.category.findUnique({
      where: { id: parentId },
      select: { id: true, parentId: true, slug: true },
    })
  }

  validateCategoryHierarchyRules({
    parent,
    current: {
      id: current.id,
      parentId: current.parentId,
      productCount: current._count.products,
      childCount: current._count.children,
    },
    nextParentId: parentId,
  })

  if (data.slug !== current.slug) {
    await assertSlugAvailable(data.slug, id)
  }

  return prisma.category.update({
    where: { id },
    data: {
      name: data.name.trim(),
      slug: data.slug,
      parentId,
      sortOrder: data.sortOrder ?? current.sortOrder,
      shortDescription:
        data.shortDescription === undefined
          ? undefined
          : data.shortDescription?.trim() || null,
      imageUrl:
        data.imageUrl === undefined
          ? undefined
          : data.imageUrl?.trim() || null,
      showInHome: data.showInHome ?? current.showInHome,
      isActive: data.isActive ?? current.isActive,
    },
    select: categorySelect,
  })
}

export async function deleteAdminCategory(id: number) {
  const current = await prisma.category.findUnique({
    where: { id },
    select: categorySelect,
  })
  if (!current) {
    throw new AdminCategoryError('NOT_FOUND', 'Categoría no encontrada.', 404)
  }
  if (!isAdminManagedCategory(current)) {
    throw new AdminCategoryError(
      'LEGACY_READONLY',
      'Las categorías legacy no se eliminan desde este panel.',
      403
    )
  }
  validateCategoryDelete({
    productCount: current._count.products,
    childCount: current._count.children,
  })
  await prisma.category.delete({ where: { id } })
  return { ok: true as const, id }
}

/** Resuelve categoryId | categorySlug a hoja válida (no crea). */
export async function resolveAssignableLeafCategory(input: {
  categoryId?: number | null
  categorySlug?: string | null
}): Promise<{ id: number; slug: string; name: string }> {
  let row:
    | {
        id: number
        slug: string
        name: string
        parentId: number | null
        isActive: boolean
        _count: { children: number }
      }
    | null = null

  if (input.categoryId != null) {
    row = await prisma.category.findUnique({
      where: { id: input.categoryId },
      select: {
        id: true,
        slug: true,
        name: true,
        parentId: true,
        isActive: true,
        _count: { select: { children: true } },
      },
    })
  } else if (input.categorySlug) {
    row = await prisma.category.findUnique({
      where: { slug: input.categorySlug },
      select: {
        id: true,
        slug: true,
        name: true,
        parentId: true,
        isActive: true,
        _count: { select: { children: true } },
      },
    })
  }

  if (!row) {
    throw new AdminCategoryError(
      'CATEGORY_NOT_FOUND',
      'Categoría no encontrada. Indicá categoryId o categorySlug de una hoja existente.'
    )
  }

  validateLeafAssignment({
    id: row.id,
    parentId: row.parentId,
    slug: row.slug,
    isActive: row.isActive,
    childCount: row._count.children,
  })

  return { id: row.id, slug: row.slug, name: row.name }
}

/** Resuelve categoryId | categorySlug | category(text) a hoja válida. No crea. */
export async function resolveProductCategoryFromInput(input: {
  categoryId?: number | null
  categorySlug?: string | null
  category?: string | null
}): Promise<{ id: number; slug: string; name: string }> {
  if (input.categoryId != null) {
    return resolveAssignableLeafCategory({ categoryId: input.categoryId })
  }

  const slug = (input.categorySlug || '').trim()
  if (slug) {
    return resolveAssignableLeafCategory({ categorySlug: slug })
  }

  const text = (input.category || '').trim()
  if (!text) {
    throw new AdminCategoryError(
      'CATEGORY_REQUIRED',
      'Falta categoría: usá categorySlug o categoryId.'
    )
  }

  // 1) match exacto por slug
  try {
    return await resolveAssignableLeafCategory({ categorySlug: text })
  } catch {
    // continue
  }

  // 2) match exacto por name entre hojas admin activas
  const byName = await prisma.category.findMany({
    where: {
      name: text,
      parentId: { not: null },
      isActive: true,
      children: { none: {} },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      parentId: true,
      isActive: true,
      _count: { select: { children: true } },
    },
  })
  const managed = byName.filter((c) => !isLegacyCategorySlug(c.slug))
  if (managed.length === 1) {
    validateLeafAssignment({
      id: managed[0].id,
      parentId: managed[0].parentId,
      slug: managed[0].slug,
      isActive: managed[0].isActive,
      childCount: managed[0]._count.children,
    })
    return {
      id: managed[0].id,
      slug: managed[0].slug,
      name: managed[0].name,
    }
  }
  if (managed.length > 1) {
    throw new AdminCategoryError(
      'CATEGORY_AMBIGUOUS',
      `El nombre "${text}" coincide con varias subcategorías. Usá categorySlug inequívoco.`
    )
  }

  throw new AdminCategoryError(
    'CATEGORY_NOT_FOUND',
    `No existe una subcategoría hoja activa con slug/nombre "${text}". No se crean categorías automáticamente.`
  )
}
