import {
  parseBnaExchangeRate,
  type ParsedBnaExchangeRate,
  BnaParseError,
} from '@/lib/exchange-rate/parse-bna-exchange-rate'

export const BNA_HOME_URL = 'https://www.bna.com.ar/'

const DEFAULT_TIMEOUT_MS = 15_000

export class BnaFetchError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'BnaFetchError'
    this.status = status
  }
}

/**
 * Cliente server-side para la home de Banco Nación.
 * No usar desde componentes cliente.
 */
export async function fetchBnaHomeHtml(opts?: {
  timeoutMs?: number
  fetchImpl?: typeof fetch
}): Promise<string> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const fetchFn = opts?.fetchImpl ?? fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetchFn(BNA_HOME_URL, {
      method: 'GET',
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent':
          'IFEDEL-ExchangeRateBot/1.0 (+https://app.ifedel.com; exchange-rate sync)',
      },
    })

    if (!res.ok) {
      throw new BnaFetchError(
        `BNA respondió HTTP ${res.status}`,
        res.status,
      )
    }

    const html = await res.text()
    if (!html || html.length < 100) {
      throw new BnaFetchError('Respuesta BNA vacía o demasiado corta')
    }
    return html
  } catch (err) {
    if (err instanceof BnaFetchError) throw err
    if (err instanceof Error && err.name === 'AbortError') {
      throw new BnaFetchError(`Timeout al consultar BNA (${timeoutMs}ms)`)
    }
    throw new BnaFetchError(
      err instanceof Error ? err.message : 'Error de red al consultar BNA',
    )
  } finally {
    clearTimeout(timer)
  }
}

/** Fetch + parse tipado. */
export async function fetchBnaUsdBilleteVenta(opts?: {
  timeoutMs?: number
  fetchImpl?: typeof fetch
}): Promise<ParsedBnaExchangeRate> {
  const html = await fetchBnaHomeHtml(opts)
  try {
    return parseBnaExchangeRate(html)
  } catch (err) {
    if (err instanceof BnaParseError) throw err
    throw new BnaParseError(
      'unexpected_html',
      err instanceof Error ? err.message : 'Error al parsear HTML BNA',
    )
  }
}
