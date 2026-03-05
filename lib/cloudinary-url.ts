export function getOptimizedImageUrl(
  url: string | null | undefined,
  width: number = 800
): string {
  if (!url) return ''

  if (!url.includes('res.cloudinary.com')) {
    return url
  }

  // Si ya tiene transformaciones f_auto y q_auto, no duplicar
  if (url.includes('/upload/f_auto') && url.includes('q_auto')) {
    return url
  }

  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`)
}

