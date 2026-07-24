/**
 * Transformaciones Cloudinary para cards / galería.
 * No rompe URLs no-Cloudinary; evita duplicar f_auto/q_auto.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  width: number = 800,
): string {
  if (!url) return ''

  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url
  }

  // Si ya tiene un bloque de transformaciones con w_, respetar (salvo que sea enorme).
  const uploadIdx = url.indexOf('/upload/')
  if (uploadIdx === -1) return url

  const afterUpload = url.slice(uploadIdx + '/upload/'.length)
  const firstSlash = afterUpload.indexOf('/')
  const maybeTransforms = firstSlash >= 0 ? afterUpload.slice(0, firstSlash) : ''
  const hasTransforms =
    maybeTransforms.includes(',') ||
    maybeTransforms.startsWith('f_') ||
    maybeTransforms.startsWith('q_') ||
    maybeTransforms.startsWith('w_') ||
    maybeTransforms.startsWith('c_')

  const transform = `f_auto,q_auto:good,c_limit,w_${width}`

  if (!hasTransforms) {
    return url.replace('/upload/', `/upload/${transform}/`)
  }

  // Reemplazar w_N existente o anteponer w_ si falta; mantener f_auto/q_auto.
  let t = maybeTransforms
  if (/\bw_\d+\b/.test(t)) {
    t = t.replace(/\bw_\d+\b/, `w_${width}`)
  } else {
    t = `${t},w_${width}`
  }
  if (!t.includes('f_auto')) t = `f_auto,${t}`
  if (!t.includes('q_auto')) t = t.replace('f_auto,', 'f_auto,q_auto:good,')
  if (!t.includes('c_limit') && !t.includes('c_fill') && !t.includes('c_fit')) {
    t = t.replace('f_auto,', 'f_auto,c_limit,')
  }

  const rest = afterUpload.slice(firstSlash + 1)
  return `${url.slice(0, uploadIdx)}/upload/${t}/${rest}`
}
