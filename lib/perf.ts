/**
 * Instrumentación mínima de performance (catálogo / backoffice / server).
 * Solo loguea en development o con DEBUG_PERF / NEXT_PUBLIC_DEBUG_PERF=1.
 * Nunca loguea payloads ni datos sensibles.
 */

function perfEnabled(): boolean {
  if (process.env.NODE_ENV === 'development') return true
  return (
    process.env.DEBUG_PERF === '1' ||
    process.env.NEXT_PUBLIC_DEBUG_PERF === '1'
  )
}

export async function withPerf<T>(
  operation: string,
  fn: () => Promise<T>,
  resultCount?: (result: T) => number,
): Promise<T> {
  if (!perfEnabled()) {
    return fn()
  }

  const started = performance.now()
  try {
    const result = await fn()
    const ms = Math.round(performance.now() - started)
    const count =
      typeof resultCount === 'function' ? resultCount(result) : undefined
    console.info(
      `[perf] ${operation} ${ms}ms${count != null ? ` results=${count}` : ''}`,
    )
    return result
  } catch (error) {
    const ms = Math.round(performance.now() - started)
    console.info(`[perf] ${operation} ${ms}ms error=1`)
    throw error
  }
}
