/**
 * Slug canónico para categorías (NFD + strip diacríticos).
 * No modificar lib/utils.slugify (productos/marcas/import brand).
 */
export function slugifyCategoryName(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}
