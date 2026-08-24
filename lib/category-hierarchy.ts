import { prisma } from '@/lib/prisma'

export class CategoryHierarchyError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'CategoryHierarchyError'
    this.code = code
  }
}

const rootOrderBy = [
  { sortOrder: 'asc' as const },
  { name: 'asc' as const },
]

/**
 * Categorías principales activas (parentId = null), ordenadas por sortOrder / name.
 */
export async function getRootCategories() {
  return prisma.category.findMany({
    where: {
      parentId: null,
      isActive: true,
    },
    orderBy: rootOrderBy,
  })
}

/**
 * Hijos activos de una categoría, ordenados por sortOrder / name.
 */
export async function getCategoryChildren(categoryId: number) {
  return prisma.category.findMany({
    where: {
      parentId: categoryId,
      isActive: true,
    },
    orderBy: rootOrderBy,
  })
}

/**
 * true si la categoría no tiene hijos (hoja / subcategoría asignable a productos).
 */
export async function isLeafCategory(categoryId: number): Promise<boolean> {
  const child = await prisma.category.findFirst({
    where: { parentId: categoryId },
    select: { id: true },
  })
  return child === null
}

/**
 * Falla si la categoría no existe o tiene hijos.
 * Pensado para APIs/admin futuras al asignar Product.categoryId.
 * No cableado todavía a rutas existentes.
 */
export async function assertLeafCategory(categoryId: number): Promise<void> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true, slug: true },
  })

  if (!category) {
    throw new CategoryHierarchyError(
      'CATEGORY_NOT_FOUND',
      `Categoría ${categoryId} no existe.`
    )
  }

  const child = await prisma.category.findFirst({
    where: { parentId: categoryId },
    select: { id: true },
  })

  if (child) {
    throw new CategoryHierarchyError(
      'CATEGORY_NOT_LEAF',
      `La categoría "${category.name}" (${category.slug}) tiene subcategorías; los productos solo pueden asignarse a categorías hoja.`
    )
  }
}
